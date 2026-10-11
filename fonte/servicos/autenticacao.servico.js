import { ambiente } from '../configuracao/ambiente.js';
import { ACOES_AUDITORIA, ORIGENS_CONSENTIMENTO, PAPEIS } from '../configuracao/constantes.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import { serializarConta } from '../serializadores/usuario.serializador.js';
import { credenciaisInvalidas, ErroApp, naoAutenticado, requisicaoInvalida } from '../utilitarios/erros.js';
import { conferirSenha, conferirSenhaContraHashFalso, gerarHashSenha } from '../utilitarios/senha.js';
import { gerarToken } from '../utilitarios/token.js';
import * as auditoriaServico from './auditoria.servico.js';
import * as contaServico from './conta.servico.js';

/** Resposta padrão de sessão: token Bearer + dados da conta. */
export function emitirSessao(usuario) {
  const { token, expiraEm } = gerarToken(
    { sub: usuario.id, papel: usuario.papel, versao: usuario.versaoToken },
    ambiente.expiracaoJwt
  );
  return { token, tipo: 'Bearer', expiraEm, usuario: serializarConta(usuario) };
}

/**
 * Ponto de extensão do caso de uso "Cadastrar usuário": quando DOMINIOS_EMAIL_PERMITIDOS está definido, o
 * cadastro público só aceita e-mails institucionais.
 */
function exigirEmailInstitucional(email) {
  if (ambiente.dominiosEmailPermitidos.length === 0) return;
  const dominio = email.split('@')[1];
  if (!ambiente.dominiosEmailPermitidos.includes(dominio)) {
    throw requisicaoInvalida('Dados inválidos.', [
      {
        campo: 'corpo.email',
        mensagem: `Use o seu e-mail institucional (${ambiente.dominiosEmailPermitidos.map((d) => `@${d}`).join(', ')}).`
      }
    ]);
  }
}

/** Autocadastro do aluno (só níveis permitidos pelo validador). O aceite dos termos vira o consentimento registrado. */
export async function cadastrarAluno({ nome, email, senha, turma, nivelEnsino }, ator) {
  exigirEmailInstitucional(email);

  const conta = await contaServico.criarConta({
    papel: PAPEIS.ALUNO,
    nome,
    email,
    senha,
    aluno: {
      turma,
      nivelEnsino,
      consentimentoEm: new Date(),
      consentimentoOrigem: ORIGENS_CONSENTIMENTO.TITULAR
    }
  });

  await auditoriaServico.registrar(
    { id: conta.id, idRequisicao: ator.idRequisicao },
    { acao: ACOES_AUDITORIA.CONTA_CRIADA, alvoUsuarioId: conta.id, recurso: 'usuarios', recursoId: conta.id, detalhes: { origem: 'autocadastro' } }
  );

  return emitirSessao(conta);
}

/**
 * Sempre gasta uma comparação de bcrypt, exista ou não o e-mail: o tempo de resposta não revela cadastros.
 * Conta desativada só é informada a quem acertou a senha.
 */
export async function entrar({ email, senha }, ator) {
  const conta = await usuarioRepositorio.buscarPorEmailComSenha(email);

  const senhaConfere = conta ? await conferirSenha(senha, conta.senhaHash) : await conferirSenhaContraHashFalso(senha);
  if (!conta || !senhaConfere) throw credenciaisInvalidas();

  if (!conta.ativo) {
    throw new ErroApp(403, 'CONTA_DESATIVADA', 'Esta conta está desativada. Procure a coordenação da escola.');
  }

  const { senhaHash, ...contaSemSenha } = conta;
  await usuarioRepositorio.registrarAcesso(conta.id);
  await auditoriaServico.registrar(
    { id: conta.id, idRequisicao: ator.idRequisicao },
    { acao: ACOES_AUDITORIA.LOGIN, alvoUsuarioId: conta.id }
  );
  return emitirSessao(contaSemSenha);
}

/** "Sair em todos os dispositivos": subir a versão invalida todo JWT emitido antes para esta conta. */
export async function sair(autenticado) {
  await usuarioRepositorio.incrementarVersaoToken(autenticado.id);
}

/**
 * Troca da senha pelo próprio usuário (também é o único caminho de quem entrou com senha provisória).
 * Invalida os tokens antigos e devolve uma sessão nova.
 */
export async function trocarSenha(autenticado, { senhaAtual, novaSenha }) {
  const atual = await usuarioRepositorio.buscarPorIdComSenha(autenticado.id);
  if (!atual) throw naoAutenticado();

  if (!(await conferirSenha(senhaAtual, atual.senhaHash))) {
    throw new ErroApp(403, 'SENHA_ATUAL_INCORRETA', 'Senha atual incorreta.');
  }

  const atualizado = await usuarioRepositorio.atualizar(autenticado.id, {
    senhaHash: await gerarHashSenha(novaSenha),
    deveTrocarSenha: false,
    versaoToken: { increment: 1 }
  });

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.SENHA_ALTERADA,
    alvoUsuarioId: autenticado.id
  });
  return emitirSessao(atualizado);
}
