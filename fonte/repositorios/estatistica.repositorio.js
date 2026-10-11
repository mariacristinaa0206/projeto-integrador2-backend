import { banco } from '../banco/cliente.js';
import { ACOES_AUDITORIA } from '../configuracao/constantes.js';
import { inicioDoDia, inicioDoDiaSeguinte, isoParaData } from '../utilitarios/datas.js';

/**
 * Contagens de USO da plataforma (relatório estatístico, só administrador). Nada pessoal: só totais.
 * O período chega como { inicio, fim } em 'AAAA-MM-DD' (fim inclusive), em dias de Brasília.
 */

// Colunas DATE (dia do registro): comparação por data.
const naData = ({ inicio, fim }) => ({ gte: isoParaData(inicio), lte: isoParaData(fim) });
// Colunas de data E hora: o mês vai da meia-noite de Brasília do dia 1 até a meia-noite de Brasília depois do último dia.
const noInstante = ({ inicio, fim }) => ({ gte: inicioDoDia(inicio), lt: inicioDoDiaSeguinte(fim) });

export const usuariosPorPapel = () =>
  banco.usuario.groupBy({ by: ['papel', 'ativo'], _count: { _all: true } });

export const novosUsuarios = (periodo) => banco.usuario.count({ where: { criadoEm: noInstante(periodo) } });

export const totalDeRegistros = (periodo) => banco.registroEmocional.count({ where: { dia: naData(periodo) } });

export async function usuariosQueRegistraram(periodo) {
  const grupos = await banco.registroEmocional.groupBy({ by: ['usuarioId'], where: { dia: naData(periodo) } });
  return grupos.length;
}

export async function usuariosQueEntraram(periodo) {
  const grupos = await banco.logAuditoria.groupBy({
    by: ['usuarioId'],
    where: { acao: ACOES_AUDITORIA.LOGIN, usuarioId: { not: null }, criadoEm: noInstante(periodo) }
  });
  return grupos.length;
}

export const sessoesPorStatus = (periodo) =>
  banco.sessao.groupBy({ by: ['status'], where: { inicio: noInstante(periodo) }, _count: { _all: true } });

export const totalDeMensagens = (periodo) => banco.mensagem.count({ where: { enviadaEm: noInstante(periodo) } });

export const alertasPorTipo = (periodo) =>
  banco.alerta.groupBy({ by: ['tipo'], where: { criadoEm: noInstante(periodo) }, _count: { _all: true } });

export const feedbacksPorAlvo = (periodo) =>
  banco.feedback.groupBy({
    by: ['alvo'],
    where: { criadoEm: noInstante(periodo) },
    _count: { _all: true },
    _avg: { nota: true }
  });

export const conteudosPorTipo = () =>
  banco.conteudoEducativo.groupBy({ by: ['tipo'], where: { publicado: true }, _count: { _all: true } });
