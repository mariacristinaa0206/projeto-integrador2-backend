import { banco } from '../banco/cliente.js';

/** Acesso à tabela `notificacoes`. As mensagens são genéricas (sem dado sensível). */

export const criar = ({ usuarioId, tipo, mensagem, referenciaId }) =>
  banco.notificacao.create({ data: { usuarioId, tipo, mensagem, referenciaId }, select: { id: true } });

/** Para avisar vários destinatários de uma vez (ex.: toda a equipe de apoio em um alerta). */
export const criarVarias = (notificacoes) => banco.notificacao.createMany({ data: notificacoes });

export const listar = (usuarioId, tomar) =>
  banco.notificacao.findMany({
    where: { usuarioId },
    orderBy: [{ enviadaEm: 'desc' }, { id: 'desc' }],
    take: tomar
  });

export const contarNaoLidas = (usuarioId) => banco.notificacao.count({ where: { usuarioId, lida: false } });

/** Marca como lidas (todas as do usuário ou só `ids`). Só mexe nas do PRÓPRIO usuário. Devolve quantas mudaram. */
export async function marcarLidas(usuarioId, ids) {
  const { count } = await banco.notificacao.updateMany({
    where: { usuarioId, lida: false, ...(ids ? { id: { in: ids } } : {}) },
    data: { lida: true }
  });
  return count;
}
