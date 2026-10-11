export function serializarNotificacao(notificacao) {
  return {
    id: notificacao.id,
    tipo: notificacao.tipo,
    mensagem: notificacao.mensagem,
    referenciaId: notificacao.referenciaId,
    lida: notificacao.lida,
    enviadaEm: notificacao.enviadaEm.toISOString()
  };
}
