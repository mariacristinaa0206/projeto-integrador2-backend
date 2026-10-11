import { banco } from '../banco/cliente.js';
import { STATUS_ALERTA } from '../configuracao/constantes.js';
import { ehViolacaoDeUnicidade } from '../utilitarios/erros.js';

/** Acesso à tabela `alertas`. */

const incluir = {
  aluno: { select: { id: true, nome: true, aluno: { select: { turma: true, nivelEnsino: true } } } },
  responsavel: { select: { id: true, nome: true } }
};

/**
 * Cria o alerta, a menos que o aluno já tenha um alerta VIVO (aberto ou em acompanhamento) do mesmo tipo:
 * o índice único parcial do banco recusa o segundo e devolvemos null (nada a notificar).
 */
export async function criarSeNaoExistir({ alunoId, tipo }) {
  try {
    return await banco.alerta.create({ data: { alunoId, tipo }, include: incluir });
  } catch (erro) {
    if (ehViolacaoDeUnicidade(erro)) return null;
    throw erro;
  }
}

export const buscarPorId = (id) => banco.alerta.findUnique({ where: { id }, include: incluir });

const filtro = ({ status, tipo, turma }) => ({
  ...(status ? { status } : {}),
  ...(tipo ? { tipo } : {}),
  ...(turma ? { aluno: { aluno: { turma } } } : {})
});

export const listar = ({ pular, tomar, ...filtros }) =>
  banco.alerta.findMany({
    where: filtro(filtros),
    include: incluir,
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
    skip: pular,
    take: tomar
  });

export const contar = (filtros) => banco.alerta.count({ where: filtro(filtros) });

/** Troca de status condicional (UPDATE com a situação esperada no `where`). Devolve quantas linhas mudaram. */
export async function transicionar({ where, dados }) {
  const { count } = await banco.alerta.updateMany({ where, data: dados });
  return count;
}

export async function contarPorStatus() {
  const grupos = await banco.alerta.groupBy({ by: ['status'], _count: { _all: true } });
  const contagem = Object.fromEntries(Object.values(STATUS_ALERTA).map((status) => [status, 0]));
  for (const grupo of grupos) contagem[grupo.status] = grupo._count._all;
  return contagem;
}
