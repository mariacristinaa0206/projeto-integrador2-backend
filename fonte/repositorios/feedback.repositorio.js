import { banco } from '../banco/cliente.js';
import { inicioDoDia, inicioDoDiaSeguinte } from '../utilitarios/datas.js';

/** Acesso à tabela `feedbacks`. O comentário continua CIFRADO aqui. */

export const criar = ({ id, usuarioId, alvo, sessaoId, nota, comentario }) =>
  banco.feedback.create({ data: { id, usuarioId, alvo, sessaoId, nota, comentario } });

export const listarDoUsuario = ({ usuarioId, pular, tomar }) =>
  banco.feedback.findMany({ where: { usuarioId }, orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], skip: pular, take: tomar });

export const contarDoUsuario = (usuarioId) => banco.feedback.count({ where: { usuarioId } });

/** Quantos o usuário enviou desde `desde` (limite diário contra spam). */
export const contarDesde = (usuarioId, alvo, desde) =>
  banco.feedback.count({ where: { usuarioId, alvo, criadoEm: { gte: desde } } });

// ---- Gestão: NUNCA devolve quem avaliou (o serializador também não expõe `usuarioId`) ----

const filtroGestao = ({ alvo, notaMinima, notaMaxima, de, ate }) => ({
  ...(alvo ? { alvo } : {}),
  ...(notaMinima || notaMaxima
    ? { nota: { ...(notaMinima ? { gte: notaMinima } : {}), ...(notaMaxima ? { lte: notaMaxima } : {}) } }
    : {}),
  ...(de || ate
    ? {
        criadoEm: {
          ...(de ? { gte: inicioDoDia(de) } : {}),
          ...(ate ? { lt: inicioDoDiaSeguinte(ate) } : {})
        }
      }
    : {})
});

export const listarParaGestao = ({ pular, tomar, ...filtros }) =>
  banco.feedback.findMany({
    where: filtroGestao(filtros),
    select: {
      id: true,
      alvo: true,
      nota: true,
      comentario: true,
      criadoEm: true,
      sessao: { select: { profissional: { select: { id: true, nome: true } } } }
    },
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
    skip: pular,
    take: tomar
  });

export const contarParaGestao = (filtros) => banco.feedback.count({ where: filtroGestao(filtros) });

/** Nota média e quantidade por alvo, no filtro dado. */
export async function resumoParaGestao(filtros) {
  const grupos = await banco.feedback.groupBy({
    by: ['alvo'],
    where: filtroGestao(filtros),
    _avg: { nota: true },
    _count: { _all: true }
  });
  return grupos.map((grupo) => ({ alvo: grupo.alvo, total: grupo._count._all, notaMedia: grupo._avg.nota }));
}
