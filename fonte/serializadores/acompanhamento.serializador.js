import { dataParaISO } from '../utilitarios/datas.js';

/** `observacao` chega já decifrada pelo serviço. */
export function serializarAcompanhamento(acompanhamento, observacao) {
  return {
    id: acompanhamento.id,
    tipo: acompanhamento.tipo,
    observacao,
    data: dataParaISO(acompanhamento.data),
    autor: acompanhamento.autor
      ? { id: acompanhamento.autor.id, nome: acompanhamento.autor.nome, papel: acompanhamento.autor.papel }
      : null,
    criadoEm: acompanhamento.criadoEm.toISOString()
  };
}
