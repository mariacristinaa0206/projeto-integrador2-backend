/**
 * Contexto (AAD) de cada dado cifrado: "tabela.coluna:id". Prende o conteúdo cifrado à sua linha de origem.
 * Mudar estes textos tornaria ilegíveis os dados já gravados: nunca renomeie depois de ir para produção.
 */
export const contextoCifra = Object.freeze({
  registroObservacao: (id) => `registros_emocionais.observacao:${id}`,
  acompanhamentoObservacao: (id) => `acompanhamentos.observacao:${id}`,
  sessaoMotivo: (id) => `sessoes.motivo:${id}`,
  mensagemTexto: (id) => `mensagens.texto:${id}`,
  feedbackComentario: (id) => `feedbacks.comentario:${id}`,
  metaTitulo: (id) => `metas.titulo:${id}`,
  relatorioDados: (id) => `relatorios.dados:${id}`
});
