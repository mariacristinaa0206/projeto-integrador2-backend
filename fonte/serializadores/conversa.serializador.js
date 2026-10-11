/** `texto` chega já decifrado pelo serviço. `minha` diz se quem lê foi o autor (o front alinha o balão). */
export function serializarMensagem(mensagem, texto, leitorId) {
  return {
    id: mensagem.id,
    conversaId: mensagem.conversaId,
    autorId: mensagem.autorId,
    minha: mensagem.autorId === leitorId,
    texto,
    enviadaEm: mensagem.enviadaEm.toISOString(),
    lida: mensagem.lidaEm !== null
  };
}

/** A "outra pessoa" é sempre quem NÃO está lendo. `ultimaMensagem` e `naoLidas` vêm prontos do serviço. */
export function serializarConversa(conversa, leitorId, { ultimaMensagem = null, naoLidas = 0 } = {}) {
  const outra = conversa.alunoId === leitorId ? conversa.profissional : conversa.aluno;
  return {
    id: conversa.id,
    com: { id: outra.id, nome: outra.nome, papel: outra.papel ?? 'aluno' },
    naoLidas,
    ultimaMensagem,
    ultimaMensagemEm: conversa.ultimaMensagemEm?.toISOString() ?? null,
    criadaEm: conversa.criadaEm.toISOString()
  };
}
