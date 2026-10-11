import { dataParaISO } from '../utilitarios/datas.js';

/** `titulo` chega já decifrado pelo serviço. */
export function serializarMeta(meta, titulo) {
  return {
    id: meta.id,
    titulo,
    categoria: meta.categoria,
    prazo: meta.prazo ? dataParaISO(meta.prazo) : null,
    status: meta.status,
    concluidaEm: meta.concluidaEm?.toISOString() ?? null,
    criadoEm: meta.criadoEm.toISOString()
  };
}
