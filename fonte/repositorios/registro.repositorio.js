import { banco } from '../banco/cliente.js';
import { dataParaISO, isoParaData } from '../utilitarios/datas.js';

/**
 * Acesso à tabela `registros_emocionais`. A observação continua CIFRADA aqui: quem decifra são os serviços.
 * `dia` sai daqui sempre como texto 'AAAA-MM-DD'.
 */

const faixaDeDias = (de, ate) =>
  de || ate
    ? { dia: { ...(de ? { gte: isoParaData(de) } : {}), ...(ate ? { lte: isoParaData(ate) } : {}) } }
    : {};

const filtro = ({ usuarioId, de, ate, emocao }) => ({
  usuarioId,
  ...faixaDeDias(de, ate),
  ...(emocao ? { emocao } : {})
});

export const criar = ({ id, usuarioId, emocao, intensidade, observacao, dia }) =>
  banco.registroEmocional.create({
    data: { id, usuarioId, emocao, intensidade, observacao, dia: isoParaData(dia) }
  });

export const buscarDoUsuario = (id, usuarioId) => banco.registroEmocional.findFirst({ where: { id, usuarioId } });

export const listar = ({ pular, tomar, ...filtros }) =>
  banco.registroEmocional.findMany({
    where: filtro(filtros),
    orderBy: [{ dia: 'desc' }, { id: 'desc' }],
    skip: pular,
    take: tomar
  });

export const contar = (filtros) => banco.registroEmocional.count({ where: filtro(filtros) });

export const contarDoDia = (usuarioId, dia) =>
  banco.registroEmocional.count({ where: { usuarioId, dia: isoParaData(dia) } });

/** Devolve a quantidade de linhas alteradas (0 = não existe ou é de outra pessoa). */
export async function atualizarObservacao(id, usuarioId, observacao) {
  const { count } = await banco.registroEmocional.updateMany({ where: { id, usuarioId }, data: { observacao } });
  return count;
}

export async function excluir(id, usuarioId) {
  const { count } = await banco.registroEmocional.deleteMany({ where: { id, usuarioId } });
  return count;
}

/**
 * Só o que os cálculos precisam (dia, emoção, intensidade): a observação NÃO é lida, nem cifrada.
 * É a consulta usada pelos relatórios e pelo detector de alertas.
 */
export async function listarParaCalculo({ usuarioId, de, ate }) {
  const linhas = await banco.registroEmocional.findMany({
    where: filtro({ usuarioId, de, ate }),
    select: { dia: true, emocao: true, intensidade: true },
    orderBy: [{ dia: 'asc' }, { id: 'asc' }]
  });
  return linhas.map((linha) => ({ ...linha, dia: dataParaISO(linha.dia) }));
}

/** Último registro (sem observação), para o painel inicial. */
export const buscarUltimo = (usuarioId) =>
  banco.registroEmocional.findFirst({
    where: { usuarioId },
    select: { id: true, emocao: true, intensidade: true, dia: true, registradoEm: true },
    orderBy: [{ dia: 'desc' }, { id: 'desc' }]
  });
