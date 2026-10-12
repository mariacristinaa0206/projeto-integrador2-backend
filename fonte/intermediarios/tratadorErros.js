import { ZodError } from 'zod';
import { ehViolacaoDeUnicidade, ErroApp } from '../utilitarios/erros.js';
import { registrador, resumirErro } from '../utilitarios/registrador.js';

/** 404 para qualquer rota que nenhum roteador atendeu. */
export function rotaNaoEncontrada(req, res, next) {
  next(new ErroApp(404, 'ROTA_NAO_ENCONTRADA', 'Rota não encontrada.'));
}

/** Converte qualquer erro conhecido no formato padrão da API; desconhecidos viram 500 sem vazar detalhes. */
function traduzir(erro) {
  if (erro instanceof ErroApp) return erro;

  if (erro instanceof ZodError) {
    const detalhes = erro.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message }));
    return new ErroApp(400, 'REQUISICAO_INVALIDA', 'Dados inválidos.', detalhes);
  }

  // Erros do leitor de JSON (express.json)
  switch (erro.type) {
    case 'entity.too.large':
      return new ErroApp(413, 'CORPO_MUITO_GRANDE', 'O corpo da requisição excede o tamanho permitido.');
    case 'entity.parse.failed':
      return new ErroApp(400, 'JSON_INVALIDO', 'O corpo da requisição não é um JSON válido.');
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return new ErroApp(415, 'CODIFICACAO_NAO_SUPORTADA', 'Codificação não suportada. Use UTF-8.');
    case 'request.aborted':
    case 'request.size.invalid':
      return new ErroApp(400, 'REQUISICAO_INTERROMPIDA', 'Requisição interrompida ou incompleta.');
    default:
      break;
  }

  // Erros do Prisma (por nome, para não depender do pacote gerado aqui)
  if (ehViolacaoDeUnicidade(erro)) {
    return new ErroApp(409, 'CONFLITO', 'Já existe um registro com estes dados.');
  }
  if (erro.name === 'PrismaClientKnownRequestError') {
    if (erro.code === 'P2025') return new ErroApp(404, 'NAO_ENCONTRADO', 'Registro não encontrado.');
    if (erro.code === 'P2003') {
      return new ErroApp(409, 'CONFLITO', 'Operação inválida: algum registro relacionado não existe mais.');
    }
    if (erro.code === 'P2024') {
      return new ErroApp(503, 'BANCO_INDISPONIVEL', 'Servidor ocupado. Tente novamente em instantes.');
    }
  }
  if (erro.name === 'PrismaClientInitializationError' || erro.code === 'ECONNREFUSED' || erro.code === 'ETIMEDOUT') {
    return new ErroApp(503, 'BANCO_INDISPONIVEL', 'Banco de dados indisponível. Tente novamente em instantes.');
  }

  return new ErroApp(500, 'ERRO_INTERNO', 'Erro interno do servidor.');
}

// Express exige 4 parâmetros para reconhecer um tratador de erros.
// eslint-disable-next-line no-unused-vars
export function tratadorErros(erro, req, res, next) {
  const traduzido = traduzir(erro);

  if (traduzido.status >= 500) {
    registrador.erro('falha_nao_tratada', { idRequisicao: req.id, rota: req.path, ...resumirErro(erro) });
  }

  if (res.headersSent) return res.destroy();

  const cabecalhos = erro.cabecalhos ?? {};
  for (const [nome, valor] of Object.entries(cabecalhos)) res.setHeader(nome, valor);

  return res.status(traduzido.status).json({
    erro: {
      codigo: traduzido.codigo,
      mensagem: traduzido.message,
      ...(traduzido.detalhes ? { detalhes: traduzido.detalhes } : {}),
      idRequisicao: req.id
    }
  });
}
