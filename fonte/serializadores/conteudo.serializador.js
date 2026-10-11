import { dataParaISO } from '../utilitarios/datas.js';

/** Quiz sem o gabarito: quem responde recebe só o enunciado e as alternativas. */
function estruturaSemGabarito(estrutura) {
  return {
    perguntas: estrutura.perguntas.map(({ enunciado, opcoes }) => ({ enunciado, opcoes }))
  };
}

/**
 * `comGabarito` só para quem edita o conteúdo (gestão): inclui a alternativa correta e a explicação.
 * Para os demais perfis, o gabarito nunca sai (o quiz é corrigido pelo servidor).
 */
export function serializarConteudo(conteudo, { comGabarito = false } = {}) {
  return {
    id: conteudo.id,
    titulo: conteudo.titulo,
    descricao: conteudo.descricao,
    tipo: conteudo.tipo,
    tema: conteudo.tema,
    niveisEnsino: conteudo.niveisEnsino,
    urlMidia: conteudo.urlMidia,
    estrutura: conteudo.estrutura ? (comGabarito ? conteudo.estrutura : estruturaSemGabarito(conteudo.estrutura)) : null,
    publicado: conteudo.publicado,
    dataPublicacao: dataParaISO(conteudo.dataPublicacao),
    atualizadoEm: conteudo.atualizadoEm.toISOString()
  };
}
