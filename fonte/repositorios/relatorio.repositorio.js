import { banco } from '../banco/cliente.js';
import { isoParaData } from '../utilitarios/datas.js';

/** Acesso à tabela `relatorios`. Os dados (JSON) continuam CIFRADOS aqui. */

const incluir = {
  autor: { select: { id: true, nome: true, papel: true } },
  usuario: { select: { id: true, nome: true } }
};

export const criar = ({ id, tipo, usuarioId, geradoPor, periodoInicio, periodoFim, descricao, dados }) =>
  banco.relatorio.create({
    data: {
      id,
      tipo,
      usuarioId,
      geradoPor,
      periodoInicio: isoParaData(periodoInicio),
      periodoFim: isoParaData(periodoFim),
      descricao,
      dados
    },
    include: incluir
  });

export const buscarPorId = (id) => banco.relatorio.findUnique({ where: { id }, include: incluir });

/** Relatórios que a pessoa gerou OU que são sobre ela. */
const filtro = ({ pessoaId, tipo }) => ({
  OR: [{ geradoPor: pessoaId }, { usuarioId: pessoaId }],
  ...(tipo ? { tipo } : {})
});

export const listar = ({ pular, tomar, ...filtros }) =>
  banco.relatorio.findMany({
    where: filtro(filtros),
    select: {
      id: true,
      tipo: true,
      usuarioId: true,
      geradoPor: true,
      periodoInicio: true,
      periodoFim: true,
      descricao: true,
      geradoEm: true
    },
    orderBy: [{ geradoEm: 'desc' }, { id: 'desc' }],
    skip: pular,
    take: tomar
  });

export const contar = (filtros) => banco.relatorio.count({ where: filtro(filtros) });
