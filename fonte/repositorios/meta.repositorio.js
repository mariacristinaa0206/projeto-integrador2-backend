import { banco } from '../banco/cliente.js';
import { STATUS_META } from '../configuracao/constantes.js';
import { isoParaData } from '../utilitarios/datas.js';

/** Acesso à tabela `metas`. O título continua CIFRADO aqui. */

const filtro = ({ usuarioId, status }) => ({ usuarioId, ...(status ? { status } : {}) });

const paraBanco = ({ prazo, ...dados }) => ({
  ...dados,
  ...(prazo !== undefined ? { prazo: prazo === null ? null : isoParaData(prazo) } : {})
});

export const criar = ({ id, ...dados }) => banco.meta.create({ data: { id, ...paraBanco(dados) } });

export const buscarDoUsuario = (id, usuarioId) => banco.meta.findFirst({ where: { id, usuarioId } });

export const listar = ({ pular, tomar, ...filtros }) =>
  banco.meta.findMany({
    where: filtro(filtros),
    orderBy: [{ status: 'asc' }, { prazo: { sort: 'asc', nulls: 'last' } }, { id: 'desc' }],
    skip: pular,
    take: tomar
  });

export const contar = (filtros) => banco.meta.count({ where: filtro(filtros) });

export const contarEmAndamento = (usuarioId) =>
  banco.meta.count({ where: { usuarioId, status: STATUS_META.EM_ANDAMENTO } });

/** Devolve quantas linhas mudaram (0 = não existe ou é de outra pessoa). */
export async function atualizar(id, usuarioId, dados) {
  const { count } = await banco.meta.updateMany({ where: { id, usuarioId }, data: paraBanco(dados) });
  return count;
}

export async function excluir(id, usuarioId) {
  const { count } = await banco.meta.deleteMany({ where: { id, usuarioId } });
  return count;
}
