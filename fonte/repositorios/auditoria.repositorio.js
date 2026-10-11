import { banco } from '../banco/cliente.js';
import { inicioDoDia, inicioDoDiaSeguinte } from '../utilitarios/datas.js';

/** Acesso à tabela `logs_auditoria`. Só se grava (nunca se altera nem se apaga pela API). */

export const criar = ({ usuarioId, alvoUsuarioId, acao, recurso, recursoId, idRequisicao, detalhes }) =>
  banco.logAuditoria.create({
    data: { usuarioId, alvoUsuarioId, acao, recurso, recursoId, idRequisicao, detalhes },
    select: { id: true }
  });

const filtro = ({ usuarioId, alvoUsuarioId, acao, de, ate }) => ({
  ...(usuarioId ? { usuarioId } : {}),
  ...(alvoUsuarioId ? { alvoUsuarioId } : {}),
  ...(acao ? { acao } : {}),
  ...(de || ate
    ? {
        criadoEm: {
          ...(de ? { gte: inicioDoDia(de) } : {}),
          ...(ate ? { lt: inicioDoDiaSeguinte(ate) } : {})
        }
      }
    : {})
});

export const listar = ({ pular, tomar, ...filtros }) =>
  banco.logAuditoria.findMany({
    where: filtro(filtros),
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
    skip: pular,
    take: tomar
  });

export const contar = (filtros) => banco.logAuditoria.count({ where: filtro(filtros) });
