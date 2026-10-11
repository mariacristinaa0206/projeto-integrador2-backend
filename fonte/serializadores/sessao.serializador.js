import { REGRAS_SESSAO } from '../configuracao/constantes.js';

/** `motivo` chega já decifrado pelo serviço. */
export function serializarSessao(sessao, motivo) {
  return {
    id: sessao.id,
    status: sessao.status,
    inicio: sessao.inicio.toISOString(),
    fim: new Date(sessao.inicio.getTime() + REGRAS_SESSAO.duracaoMin * 60_000).toISOString(),
    duracaoMin: REGRAS_SESSAO.duracaoMin,
    motivo: motivo ?? null,
    aluno: { id: sessao.aluno.id, nome: sessao.aluno.nome },
    profissional: { id: sessao.profissional.id, nome: sessao.profissional.nome, papel: sessao.profissional.papel },
    criadoEm: sessao.criadoEm.toISOString()
  };
}
