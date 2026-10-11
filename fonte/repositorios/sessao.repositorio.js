import { banco } from '../banco/cliente.js';
import { STATUS_SESSAO_QUE_OCUPAM } from '../configuracao/constantes.js';

/** Acesso à tabela `sessoes`. O motivo continua CIFRADO aqui. */

const incluirPessoas = {
  aluno: { select: { id: true, nome: true } },
  profissional: { select: { id: true, nome: true, papel: true } }
};

const ordem = [{ inicio: 'desc' }, { id: 'desc' }];

const faixaDeInicio = (inicioMinimo, inicioMaximo) =>
  inicioMinimo || inicioMaximo
    ? { inicio: { ...(inicioMinimo ? { gte: inicioMinimo } : {}), ...(inicioMaximo ? { lt: inicioMaximo } : {}) } }
    : {};

/** Participante = o aluno ou o profissional da sessão. Qualquer outra pessoa não a enxerga (404). */
export const buscarDoParticipante = (id, usuarioId) =>
  banco.sessao.findFirst({
    where: { id, OR: [{ alunoId: usuarioId }, { profissionalId: usuarioId }] },
    include: incluirPessoas
  });

export const buscarPorId = (id) => banco.sessao.findUnique({ where: { id }, include: incluirPessoas });

/**
 * Cria a sessão respeitando o limite de solicitações em aberto do aluno. O bloqueio consultivo (por aluno) serializa
 * pedidos simultâneos do mesmo aluno: sem ele, dois cliques rápidos passariam os dois pela contagem.
 * Devolve null se o limite foi atingido. O choque de horário é recusado pelo banco (índices únicos parciais → P2002).
 */
export function criarRespeitandoLimite({ id, alunoId, profissionalId, inicio, motivo, limite }) {
  return banco.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`conectamente:sessoes:aluno:${alunoId}`}, 0))`;

    const emAberto = await tx.sessao.count({
      where: { alunoId, status: { in: STATUS_SESSAO_QUE_OCUPAM }, inicio: { gte: new Date() } }
    });
    if (emAberto >= limite) return null;

    return tx.sessao.create({ data: { id, alunoId, profissionalId, inicio, motivo }, include: incluirPessoas });
  });
}

const filtroDoAluno = ({ alunoId, status, inicioMinimo, inicioMaximo }) => ({
  alunoId,
  ...(status ? { status } : {}),
  ...faixaDeInicio(inicioMinimo, inicioMaximo)
});

const filtroDoProfissional = ({ profissionalId, status, inicioMinimo, inicioMaximo }) => ({
  profissionalId,
  ...(status ? { status } : {}),
  ...faixaDeInicio(inicioMinimo, inicioMaximo)
});

export const listarDoAluno = ({ pular, tomar, ...filtros }) =>
  banco.sessao.findMany({ where: filtroDoAluno(filtros), include: incluirPessoas, orderBy: ordem, skip: pular, take: tomar });

export const contarDoAluno = (filtros) => banco.sessao.count({ where: filtroDoAluno(filtros) });

export const listarDoProfissional = ({ pular, tomar, ...filtros }) =>
  banco.sessao.findMany({
    where: filtroDoProfissional(filtros),
    include: incluirPessoas,
    orderBy: ordem,
    skip: pular,
    take: tomar
  });

export const contarDoProfissional = (filtros) => banco.sessao.count({ where: filtroDoProfissional(filtros) });

/**
 * Troca o status SOMENTE se a sessão ainda estiver na situação esperada (`where`): é um UPDATE condicional,
 * então duas requisições simultâneas não passam as duas. Devolve quantas linhas mudaram.
 */
export async function transicionar({ where, dados }) {
  const { count } = await banco.sessao.updateMany({ where, data: dados });
  return count;
}

/** Horários já ocupados (solicitados ou confirmados) de um profissional num intervalo. */
export const listarOcupados = (profissionalId, inicioMinimo, inicioMaximo) =>
  banco.sessao.findMany({
    where: { profissionalId, status: { in: STATUS_SESSAO_QUE_OCUPAM }, inicio: { gte: inicioMinimo, lt: inicioMaximo } },
    select: { inicio: true }
  });

/** Próximas sessões vivas do usuário (painel inicial). */
export const listarProximasDoAluno = (alunoId, tomar) =>
  banco.sessao.findMany({
    where: { alunoId, status: { in: STATUS_SESSAO_QUE_OCUPAM }, inicio: { gte: new Date() } },
    include: incluirPessoas,
    orderBy: [{ inicio: 'asc' }],
    take: tomar
  });

export const listarProximasDoProfissional = (profissionalId, tomar) =>
  banco.sessao.findMany({
    where: { profissionalId, status: { in: STATUS_SESSAO_QUE_OCUPAM }, inicio: { gte: new Date() } },
    include: incluirPessoas,
    orderBy: [{ inicio: 'asc' }],
    take: tomar
  });

export const contarPorStatusDoProfissional = (profissionalId, status) =>
  banco.sessao.count({ where: { profissionalId, status } });
