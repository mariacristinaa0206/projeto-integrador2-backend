import { LIMITES, TIPOS_NOTIFICACAO } from '../configuracao/constantes.js';
import * as notificacaoRepositorio from '../repositorios/notificacao.repositorio.js';
import { serializarNotificacao } from '../serializadores/notificacao.serializador.js';

/**
 * Notificações (TB_NOTIFICACAO). Os textos são fixos e GENÉRICOS: nunca trazem nome de aluno, emoção ou conteúdo
 * de conversa. A notificação só diz que há algo a ver; `referenciaId` aponta o quê (alerta, sessão, vínculo).
 */
const MENSAGENS = Object.freeze({
  [TIPOS_NOTIFICACAO.ALERTA_ACOMPANHAMENTO]: 'Há um novo alerta de acompanhamento. Abra a lista de alertas para ver.',
  [TIPOS_NOTIFICACAO.SESSAO_SOLICITADA]: 'Você recebeu uma nova solicitação de sessão.',
  [TIPOS_NOTIFICACAO.SESSAO_CONFIRMADA]: 'Sua sessão foi confirmada.',
  [TIPOS_NOTIFICACAO.SESSAO_RECUSADA]: 'Sua solicitação de sessão não pôde ser atendida.',
  [TIPOS_NOTIFICACAO.SESSAO_CANCELADA]: 'Uma sessão foi cancelada.',
  [TIPOS_NOTIFICACAO.ACOMPANHAMENTO_INICIADO]:
    'Um(a) profissional da escola passou a ter acesso aos seus registros emocionais. Veja quem acompanha você e, se quiser, encerre esse acesso.'
});

export const avisar = (usuarioId, tipo, referenciaId) =>
  notificacaoRepositorio.criar({ usuarioId, tipo, mensagem: MENSAGENS[tipo], referenciaId });

export async function avisarVarios(usuarioIds, tipo, referenciaId) {
  if (usuarioIds.length === 0) return;
  await notificacaoRepositorio.criarVarias(
    usuarioIds.map((usuarioId) => ({ usuarioId, tipo, mensagem: MENSAGENS[tipo], referenciaId }))
  );
}

export async function listar(autenticado) {
  const [itens, naoLidas] = await Promise.all([
    notificacaoRepositorio.listar(autenticado.id, LIMITES.maxNotificacoes),
    notificacaoRepositorio.contarNaoLidas(autenticado.id)
  ]);
  return { naoLidas, itens: itens.map(serializarNotificacao) };
}

/** Idempotente: marcar de novo quando não há nada novo devolve `marcadas: 0`. */
export async function marcarComoLidas(autenticado, { ids }) {
  return { marcadas: await notificacaoRepositorio.marcarLidas(autenticado.id, ids) };
}
