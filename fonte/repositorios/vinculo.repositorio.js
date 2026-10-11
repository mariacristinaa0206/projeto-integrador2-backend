import { banco } from '../banco/cliente.js';
import { STATUS_VINCULO } from '../configuracao/constantes.js';
import { ehViolacaoDeUnicidade } from '../utilitarios/erros.js';

/** Acesso à tabela `vinculos` (acesso do psicólogo aos registros de um aluno). Nenhuma regra de negócio aqui. */

const incluirPessoas = {
  aluno: { select: { id: true, nome: true, aluno: { select: { turma: true, nivelEnsino: true } } } },
  profissional: { select: { id: true, nome: true, papel: true } }
};

const ordem = [{ atualizadoEm: 'desc' }, { id: 'desc' }];

export const buscarPorId = (id) => banco.vinculo.findUnique({ where: { id }, include: incluirPessoas });

export const buscarEntre = (alunoId, profissionalId) =>
  banco.vinculo.findUnique({ where: { alunoId_profissionalId: { alunoId, profissionalId } } });

/** Vínculo ATIVO entre os dois: a base de toda autorização do psicólogo sobre o diário do aluno. */
export const buscarAtivo = (alunoId, profissionalId) =>
  banco.vinculo.findFirst({ where: { alunoId, profissionalId, status: STATUS_VINCULO.ATIVO } });

/**
 * Garante UM vínculo ativo para o par (existe uma linha só por par). Devolve `{ vinculo, novo }`, em que `novo`
 * é verdadeiro quando o acesso começou agora (criado, ou reaberto depois de encerrado): só nesse caso o aluno é avisado.
 */
export async function garantirAtivo({ alunoId, profissionalId, origem, criadoPor }) {
  const existente = await buscarEntre(alunoId, profissionalId);
  if (existente?.status === STATUS_VINCULO.ATIVO) return { vinculo: existente, novo: false };

  if (existente) {
    // Reabre apenas se ainda estiver encerrado (UPDATE condicional: duas reaberturas simultâneas não duplicam o aviso).
    const { count } = await banco.vinculo.updateMany({
      where: { id: existente.id, status: STATUS_VINCULO.ENCERRADO },
      data: { status: STATUS_VINCULO.ATIVO, origem, criadoPor, encerradoEm: null }
    });
    return { vinculo: await buscarEntre(alunoId, profissionalId), novo: count > 0 };
  }

  try {
    const vinculo = await banco.vinculo.create({
      data: { alunoId, profissionalId, origem, criadoPor, status: STATUS_VINCULO.ATIVO }
    });
    return { vinculo, novo: true };
  } catch (erro) {
    if (ehViolacaoDeUnicidade(erro)) return { vinculo: await buscarEntre(alunoId, profissionalId), novo: false };
    throw erro;
  }
}

/** Encerra só se ainda estiver ativo. Devolve quantas linhas mudaram. */
export async function encerrar(id) {
  const { count } = await banco.vinculo.updateMany({
    where: { id, status: STATUS_VINCULO.ATIVO },
    data: { status: STATUS_VINCULO.ENCERRADO, encerradoEm: new Date() }
  });
  return count;
}

const filtro = ({ alunoId, profissionalId, status }) => ({
  ...(alunoId ? { alunoId } : {}),
  ...(profissionalId ? { profissionalId } : {}),
  ...(status ? { status } : {})
});

export const listar = ({ pular, tomar, ...filtros }) =>
  banco.vinculo.findMany({ where: filtro(filtros), include: incluirPessoas, orderBy: ordem, skip: pular, take: tomar });

export const contar = (filtros) => banco.vinculo.count({ where: filtro(filtros) });

/** Dentre `alunoIds`, quais têm vínculo ativo com o profissional (uma consulta só, para listas). */
export async function idsDeAlunosVinculados(profissionalId, alunoIds) {
  if (alunoIds.length === 0) return new Set();
  const vinculos = await banco.vinculo.findMany({
    where: { profissionalId, status: STATUS_VINCULO.ATIVO, alunoId: { in: alunoIds } },
    select: { alunoId: true }
  });
  return new Set(vinculos.map((vinculo) => vinculo.alunoId));
}

export const contarAtivosDoProfissional = (profissionalId) =>
  banco.vinculo.count({ where: { profissionalId, status: STATUS_VINCULO.ATIVO } });
