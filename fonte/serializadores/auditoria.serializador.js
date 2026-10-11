export function serializarLogAuditoria(log) {
  return {
    id: log.id,
    usuarioId: log.usuarioId,
    alvoUsuarioId: log.alvoUsuarioId,
    acao: log.acao,
    recurso: log.recurso,
    recursoId: log.recursoId,
    idRequisicao: log.idRequisicao,
    detalhes: log.detalhes ?? null,
    criadoEm: log.criadoEm.toISOString()
  };
}
