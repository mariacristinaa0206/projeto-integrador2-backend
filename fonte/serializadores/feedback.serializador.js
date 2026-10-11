/** O próprio autor vê o que enviou. `comentario` chega já decifrado pelo serviço. */
export function serializarMeuFeedback(feedback, comentario) {
  return {
    id: feedback.id,
    alvo: feedback.alvo,
    sessaoId: feedback.sessaoId,
    nota: feedback.nota,
    comentario: comentario ?? null,
    criadoEm: feedback.criadoEm.toISOString()
  };
}

/** Visão da gestão: NUNCA inclui quem avaliou (nem o aluno da sessão); só qual profissional foi avaliado. */
export function serializarFeedbackParaGestao(feedback, comentario) {
  return {
    id: feedback.id,
    alvo: feedback.alvo,
    nota: feedback.nota,
    comentario: comentario ?? null,
    profissional: feedback.sessao?.profissional
      ? { id: feedback.sessao.profissional.id, nome: feedback.sessao.profissional.nome }
      : null,
    criadoEm: feedback.criadoEm.toISOString()
  };
}
