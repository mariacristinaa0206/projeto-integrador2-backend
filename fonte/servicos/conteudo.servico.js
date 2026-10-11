import {
  ACOES_AUDITORIA,
  APOIO_IMEDIATO,
  EMOCOES,
  NIVEIS_ENSINO,
  PAPEIS,
  PAPEIS_GESTAO_CONTEUDO,
  TIPOS_CONTEUDO
} from '../configuracao/constantes.js';
import * as conteudoRepositorio from '../repositorios/conteudo.repositorio.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import { serializarConteudo } from '../serializadores/conteudo.serializador.js';
import { hojeISO } from '../utilitarios/datas.js';
import { naoEncontrado, proibido, regraDeNegocio, requisicaoInvalida } from '../utilitarios/erros.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';
import * as auditoriaServico from './auditoria.servico.js';

/**
 * Conteúdos educativos (RF05) e orientações iniciais (RF04).
 *   - Aluno: só vê conteúdo PUBLICADO e do seu nível de ensino (ou de todos os níveis).
 *   - Professor: vê tudo o que está publicado.
 *   - Gestão (administrador, psicólogo, pedagógico): vê rascunhos e cria; edita/exclui o próprio (o administrador, qualquer um).
 */

const ehGestao = (autenticado) => PAPEIS_GESTAO_CONTEUDO.includes(autenticado.papel);

/** Nível usado para escolher o texto certo: o do aluno; para os demais perfis, o texto de adolescentes/adultos. */
async function nivelDeReferencia(autenticado) {
  if (autenticado.papel !== PAPEIS.ALUNO) return NIVEIS_ENSINO.MEDIO;
  const conta = await usuarioRepositorio.buscarPorId(autenticado.id);
  return conta?.aluno?.nivelEnsino ?? NIVEIS_ENSINO.MEDIO;
}

/** O que a pessoa pode enxergar: aluno é filtrado por nível; só a gestão vê rascunhos. */
async function filtroDeVisibilidade(autenticado) {
  return {
    publicado: ehGestao(autenticado) ? undefined : true,
    nivelEnsino: autenticado.papel === PAPEIS.ALUNO ? await nivelDeReferencia(autenticado) : undefined
  };
}

export async function listar(autenticado, consulta) {
  const visibilidade = await filtroDeVisibilidade(autenticado);
  const filtros = {
    tipo: consulta.tipo,
    tema: consulta.tema,
    busca: consulta.busca,
    publicado: visibilidade.publicado ?? consulta.publicado,
    nivelEnsino: visibilidade.nivelEnsino
  };
  const [conteudos, total] = await Promise.all([
    conteudoRepositorio.listar({ ...filtros, ...calcularDeslocamento(consulta) }),
    conteudoRepositorio.contar(filtros)
  ]);
  return respostaPaginada(
    conteudos.map((conteudo) => serializarConteudo(conteudo, { comGabarito: ehGestao(autenticado) })),
    total,
    consulta
  );
}

/** Conteúdo que a pessoa pode ver, ou 404 (rascunho e conteúdo de outro nível não existem para quem não pode vê-los). */
async function carregarVisivel(autenticado, id) {
  const conteudo = await conteudoRepositorio.buscarPorId(id);
  if (!conteudo) throw naoEncontrado('Conteúdo não encontrado.');
  if (!ehGestao(autenticado)) {
    if (!conteudo.publicado) throw naoEncontrado('Conteúdo não encontrado.');
    if (autenticado.papel === PAPEIS.ALUNO) {
      const nivel = await nivelDeReferencia(autenticado);
      if (conteudo.niveisEnsino.length > 0 && !conteudo.niveisEnsino.includes(nivel)) {
        throw naoEncontrado('Conteúdo não encontrado.');
      }
    }
  }
  return conteudo;
}

export async function obter(autenticado, id) {
  return serializarConteudo(await carregarVisivel(autenticado, id), { comGabarito: ehGestao(autenticado) });
}

export async function criar(autenticado, dados) {
  const conteudo = await conteudoRepositorio.criar({
    ...dados,
    estrutura: dados.estrutura ?? undefined,
    dataPublicacao: hojeISO(),
    criadoPor: autenticado.id
  });
  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.CONTEUDO_CRIADO,
    recurso: 'conteudos_educativos',
    recursoId: conteudo.id
  });
  return serializarConteudo(conteudo, { comGabarito: true });
}

/** Administrador edita qualquer conteúdo; psicólogo e pedagógico, só os que criaram. */
async function carregarEditavel(autenticado, id) {
  const conteudo = await conteudoRepositorio.buscarPorId(id);
  if (!conteudo) throw naoEncontrado('Conteúdo não encontrado.');
  if (autenticado.papel !== PAPEIS.ADMINISTRADOR && conteudo.criadoPor !== autenticado.id) {
    throw proibido('Você só pode alterar conteúdos criados por você.');
  }
  return conteudo;
}

export async function atualizar(autenticado, id, dados) {
  const atual = await carregarEditavel(autenticado, id);
  // Voltar a publicar um rascunho renova a data de publicação.
  const republicando = dados.publicado && !atual.publicado;
  const conteudo = await conteudoRepositorio.atualizar(id, {
    ...dados,
    ...(republicando ? { dataPublicacao: hojeISO() } : {})
  });
  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.CONTEUDO_ALTERADO,
    recurso: 'conteudos_educativos',
    recursoId: id
  });
  return serializarConteudo(conteudo, { comGabarito: true });
}

export async function excluir(autenticado, id) {
  await carregarEditavel(autenticado, id);
  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.CONTEUDO_EXCLUIDO,
    recurso: 'conteudos_educativos',
    recursoId: id
  });
  await conteudoRepositorio.excluir(id);
}

/**
 * Correção do quiz feita no SERVIDOR (o gabarito nunca vai para quem responde). Sem estado: nada é gravado.
 * Devolve a nota e, por pergunta, se acertou, qual era a correta e a explicação.
 */
export async function corrigirQuiz(autenticado, id, { respostas }) {
  const conteudo = await carregarVisivel(autenticado, id);
  if (conteudo.tipo !== TIPOS_CONTEUDO.QUIZ) throw regraDeNegocio('Este conteúdo não é um quiz.');

  const { perguntas } = conteudo.estrutura;
  if (respostas.length !== perguntas.length) {
    throw regraDeNegocio(`Responda todas as ${perguntas.length} perguntas, na ordem.`);
  }

  const resultados = perguntas.map((pergunta, indice) => {
    if (respostas[indice] >= pergunta.opcoes.length) {
      throw requisicaoInvalida('Dados inválidos.', [
        { campo: `corpo.respostas.${indice}`, mensagem: 'Alternativa inexistente.' }
      ]);
    }
    return {
      pergunta: indice,
      acertou: respostas[indice] === pergunta.correta,
      alternativaCorreta: pergunta.correta,
      explicacao: pergunta.explicacao ?? null
    };
  });

  const acertos = resultados.filter((resultado) => resultado.acertou).length;
  return {
    acertos,
    total: perguntas.length,
    percentual: Math.round((acertos / perguntas.length) * 100),
    resultados
  };
}

// ---- Orientações iniciais (RF04) ----

/** As orientações do tema (no nível da pessoa). Sem tema válido, devolve lista vazia. */
export async function orientacoesDoTema(autenticado, tema, tomar = 5) {
  if (!tema) return [];
  const conteudos = await conteudoRepositorio.listarOrientacoes({
    tema,
    nivelEnsino: await nivelDeReferencia(autenticado),
    tomar
  });
  return conteudos.map((conteudo) => serializarConteudo(conteudo));
}

/** GET /orientacoes: por tema, ou pela emoção (que aponta o tema). O apoio imediato acompanha sempre. */
export async function orientacoes(autenticado, { tema, emocao }) {
  let temaDaConsulta = tema;
  if (!temaDaConsulta && emocao) {
    if (!EMOCOES[emocao]) {
      throw requisicaoInvalida('Dados inválidos.', [
        { campo: 'consulta.emocao', mensagem: `Valor inválido. Opções: ${Object.keys(EMOCOES).join(', ')}.` }
      ]);
    }
    temaDaConsulta = EMOCOES[emocao].tema;
    // Emoção confortável (feliz, calmo, neutro...) não tem orientação: lista vazia, e não "todas as orientações".
    if (!temaDaConsulta) return { itens: [], apoioImediato: APOIO_IMEDIATO };
  }

  // Sem tema nem emoção: as orientações dos três temas principais (ansiedade, estresse e tristeza).
  const itens = temaDaConsulta
    ? await orientacoesDoTema(autenticado, temaDaConsulta, 10)
    : (
        await Promise.all(['ansiedade', 'estresse', 'tristeza'].map((t) => orientacoesDoTema(autenticado, t, 3)))
      ).flat();

  return { itens, apoioImediato: APOIO_IMEDIATO };
}
