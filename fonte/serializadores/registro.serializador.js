import { EMOCOES } from '../configuracao/constantes.js';
import { dataParaISO } from '../utilitarios/datas.js';

/** `observacao` chega já decifrada pelo serviço. `humor` é a valência da emoção (1 a 5). */
export function serializarRegistro(registro, observacao) {
  return {
    id: registro.id,
    emocao: registro.emocao,
    rotulo: EMOCOES[registro.emocao].rotulo,
    humor: EMOCOES[registro.emocao].valencia,
    intensidade: registro.intensidade,
    observacao: observacao ?? null,
    dia: dataParaISO(registro.dia),
    registradoEm: registro.registradoEm.toISOString()
  };
}

/** Catálogo de emoções para o front montar a escala de sentimentos. */
export function serializarCatalogoDeEmocoes() {
  return Object.entries(EMOCOES).map(([codigo, { rotulo, valencia }]) => ({ codigo, rotulo, humor: valencia }));
}
