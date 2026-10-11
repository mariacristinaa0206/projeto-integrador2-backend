import { ACOES_AUDITORIA, ALVOS_FEEDBACK, PAPEIS, STATUS_SESSAO } from '../configuracao/constantes.js';
import * as feedbackRepositorio from '../repositorios/feedback.repositorio.js';
import { reservarId } from '../repositorios/ids.repositorio.js';
import * as sessaoRepositorio from '../repositorios/sessao.repositorio.js';
import { serializarFeedbackParaGestao, serializarMeuFeedback } from '../serializadores/feedback.serializador.js';
import { cifrarTexto, decifrarTexto } from '../utilitarios/cifra.js';
import { contextoCifra } from '../utilitarios/contextoCifra.js';
import { hojeISO, instanteLocal } from '../utilitarios/datas.js';
import { conflito, ehViolacaoDeUnicidade, naoEncontrado, proibido, regraDeNegocio } from '../utilitarios/erros.js';
import { arredondar } from '../utilitarios/indicadores.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';
import * as auditoriaServico from './auditoria.servico.js';

/**
 * Feedback (RF08): avaliar o sistema ou uma sessão concluída, de 1 a 5, com comentário opcional (CIFRADO).
 *   - Qualquer perfil avalia o sistema (até 3 vezes por dia, contra spam).
 *   - Só o aluno avalia uma sessão, e só a dele, depois de concluída, uma vez.
 *   - A gestão (administrador) lê as avaliações SEM ver quem avaliou: a resposta nunca traz o autor.
 */

const MAXIMO_AVALIACOES_DO_SISTEMA_POR_DIA = 3;

const decifrarComentario = (feedback) =>
  decifrarTexto(feedback.comentario, contextoCifra.feedbackComentario(feedback.id));

export async function criar(autenticado, dados) {
  let sessaoId = null;

  if (dados.alvo === ALVOS_FEEDBACK.SESSAO) {
    if (autenticado.papel !== PAPEIS.ALUNO) throw proibido('Somente o aluno avalia uma sessão.');
    const sessao = await sessaoRepositorio.buscarDoParticipante(dados.sessaoId, autenticado.id);
    if (!sessao || sessao.alunoId !== autenticado.id) throw naoEncontrado('Sessão não encontrada.');
    if (sessao.status !== STATUS_SESSAO.CONCLUIDA) throw regraDeNegocio('Só é possível avaliar sessões concluídas.');
    sessaoId = sessao.id;
  } else {
    const desde = instanteLocal(hojeISO(), 0, 0);
    if ((await feedbackRepositorio.contarDesde(autenticado.id, ALVOS_FEEDBACK.SISTEMA, desde)) >= MAXIMO_AVALIACOES_DO_SISTEMA_POR_DIA) {
      throw regraDeNegocio('Você já enviou avaliações demais hoje. Obrigado! Volte amanhã.');
    }
  }

  const id = await reservarId('feedbacks');
  try {
    const feedback = await feedbackRepositorio.criar({
      id,
      usuarioId: autenticado.id,
      alvo: dados.alvo,
      sessaoId,
      nota: dados.nota,
      comentario: cifrarTexto(dados.comentario, contextoCifra.feedbackComentario(id))
    });
    return serializarMeuFeedback(feedback, dados.comentario);
  } catch (erro) {
    if (ehViolacaoDeUnicidade(erro)) throw conflito('Esta sessão já foi avaliada.');
    throw erro;
  }
}

export async function listarMeus(autenticado, consulta) {
  const [feedbacks, total] = await Promise.all([
    feedbackRepositorio.listarDoUsuario({ usuarioId: autenticado.id, ...calcularDeslocamento(consulta) }),
    feedbackRepositorio.contarDoUsuario(autenticado.id)
  ]);
  return respostaPaginada(
    feedbacks.map((feedback) => serializarMeuFeedback(feedback, decifrarComentario(feedback))),
    total,
    consulta
  );
}

/** Painel de gestão: avaliações anônimas + nota média por alvo. */
export async function listarParaGestao(autenticado, consulta) {
  const filtros = {
    alvo: consulta.alvo,
    notaMinima: consulta.notaMinima,
    notaMaxima: consulta.notaMaxima,
    de: consulta.de,
    ate: consulta.ate
  };
  const [feedbacks, total, resumo] = await Promise.all([
    feedbackRepositorio.listarParaGestao({ ...filtros, ...calcularDeslocamento(consulta) }),
    feedbackRepositorio.contarParaGestao(filtros),
    feedbackRepositorio.resumoParaGestao(filtros)
  ]);

  await auditoriaServico.registrar(autenticado, { acao: ACOES_AUDITORIA.FEEDBACKS_CONSULTADOS, recurso: 'feedbacks' });

  return {
    ...respostaPaginada(
      feedbacks.map((feedback) => serializarFeedbackParaGestao(feedback, decifrarComentario(feedback))),
      total,
      consulta
    ),
    resumo: resumo.map((grupo) => ({
      alvo: grupo.alvo,
      total: grupo.total,
      notaMedia: grupo.notaMedia === null ? null : arredondar(grupo.notaMedia)
    }))
  };
}
