import { banco } from '../banco/cliente.js';
import { ehViolacaoDeUnicidade } from '../utilitarios/erros.js';

/** Acesso às tabelas `conversas` e `mensagens`. O texto das mensagens continua CIFRADO aqui. */

const incluirPessoas = {
  aluno: { select: { id: true, nome: true } },
  profissional: { select: { id: true, nome: true, papel: true } }
};

// ---- Conversas ----

export const buscarEntre = (alunoId, profissionalId) =>
  banco.conversa.findUnique({
    where: { alunoId_profissionalId: { alunoId, profissionalId } },
    include: incluirPessoas
  });

/** Participante = o aluno ou o profissional da conversa. Qualquer outra pessoa não a enxerga (404). */
export const buscarDoParticipante = (id, usuarioId) =>
  banco.conversa.findFirst({
    where: { id, OR: [{ alunoId: usuarioId }, { profissionalId: usuarioId }] },
    include: incluirPessoas
  });

/**
 * Acha ou cria a conversa do par. `upsert` com escrita aninhada não é atômico no Prisma: duas aberturas
 * simultâneas dariam erro de unicidade; aqui o perdedor da corrida só relê a conversa que o outro criou.
 */
export async function acharOuCriar(alunoId, profissionalId) {
  const existente = await buscarEntre(alunoId, profissionalId);
  if (existente) return existente;
  try {
    return await banco.conversa.create({ data: { alunoId, profissionalId }, include: incluirPessoas });
  } catch (erro) {
    if (ehViolacaoDeUnicidade(erro)) return buscarEntre(alunoId, profissionalId);
    throw erro;
  }
}

export const listarDoUsuario = (usuarioId, tomar) =>
  banco.conversa.findMany({
    where: { OR: [{ alunoId: usuarioId }, { profissionalId: usuarioId }] },
    include: incluirPessoas,
    orderBy: [{ ultimaMensagemEm: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
    take: tomar
  });

// ---- Mensagens ----

/** Grava a mensagem e atualiza `ultima_mensagem_em` da conversa na mesma transação. */
export function criarMensagem({ id, conversaId, autorId, texto }) {
  return banco.$transaction(async (tx) => {
    const mensagem = await tx.mensagem.create({ data: { id, conversaId, autorId, texto } });
    await tx.conversa.update({ where: { id: conversaId }, data: { ultimaMensagemEm: mensagem.enviadaEm }, select: { id: true } });
    return mensagem;
  });
}

/** As `tomar` mais recentes, devolvidas em ordem cronológica. */
export async function listarUltimas(conversaId, tomar) {
  const mensagens = await banco.mensagem.findMany({
    where: { conversaId },
    orderBy: [{ id: 'desc' }],
    take: tomar
  });
  return mensagens.reverse();
}

/** Leitura incremental: só as mensagens com id maior que o último que o cliente já tem. */
export const listarDepois = (conversaId, depoisDe, tomar) =>
  banco.mensagem.findMany({
    where: { conversaId, id: { gt: depoisDe } },
    orderBy: [{ id: 'asc' }],
    take: tomar
  });

export const buscarUltimaMensagem = (conversaId) =>
  banco.mensagem.findFirst({ where: { conversaId }, orderBy: [{ id: 'desc' }] });

/** Marca como lidas as mensagens da OUTRA pessoa. Devolve quantas mudaram. */
export async function marcarLidas(conversaId, leitorId) {
  const { count } = await banco.mensagem.updateMany({
    where: { conversaId, autorId: { not: leitorId }, lidaEm: null },
    data: { lidaEm: new Date() }
  });
  return count;
}

/** Mensagens não lidas por conversa (para a lista de conversas). */
export async function contarNaoLidasPorConversa(conversaIds, leitorId) {
  if (conversaIds.length === 0) return new Map();
  const grupos = await banco.mensagem.groupBy({
    by: ['conversaId'],
    where: { conversaId: { in: conversaIds }, autorId: { not: leitorId }, lidaEm: null },
    _count: { _all: true }
  });
  return new Map(grupos.map((grupo) => [grupo.conversaId, grupo._count._all]));
}

export const contarNaoLidasTotal = (leitorId) =>
  banco.mensagem.count({
    where: {
      autorId: { not: leitorId },
      lidaEm: null,
      conversa: { OR: [{ alunoId: leitorId }, { profissionalId: leitorId }] }
    }
  });
