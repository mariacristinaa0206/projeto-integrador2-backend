import { dataParaISO } from '../utilitarios/datas.js';

/** Item de listagem (sem os dados). */
export function serializarRelatorioResumo(relatorio) {
  return {
    id: relatorio.id,
    tipo: relatorio.tipo,
    usuarioId: relatorio.usuarioId,
    geradoPor: relatorio.geradoPor,
    periodo: { inicio: dataParaISO(relatorio.periodoInicio), fim: dataParaISO(relatorio.periodoFim) },
    descricao: relatorio.descricao,
    geradoEm: relatorio.geradoEm.toISOString()
  };
}

/** `dados` chega já decifrado pelo serviço. */
export function serializarRelatorio(relatorio, dados) {
  return {
    ...serializarRelatorioResumo(relatorio),
    geradoPorNome: relatorio.autor?.nome ?? null,
    sobre: relatorio.usuario ? { id: relatorio.usuario.id, nome: relatorio.usuario.nome } : null,
    dados
  };
}
