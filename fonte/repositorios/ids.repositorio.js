import { banco } from '../banco/cliente.js';

/**
 * Tabelas que têm texto CIFRADO. O id faz parte do contexto da cifra (AAD, ver utilitarios/contextoCifra.js),
 * então precisa ser conhecido ANTES do INSERT: reservamos o próximo valor da sequência e só então cifrar.
 */
const TABELAS_COM_ID_RESERVAVEL = new Set([
  'registros_emocionais',
  'acompanhamentos',
  'sessoes',
  'mensagens',
  'feedbacks',
  'metas',
  'relatorios'
]);

/** A tabela vem de uma lista fixa (nunca de entrada do usuário). */
export async function reservarId(tabela) {
  if (!TABELAS_COM_ID_RESERVAVEL.has(tabela)) throw new Error('Tabela inválida para reserva de id.');
  const [{ id }] = await banco.$queryRaw`SELECT nextval(pg_get_serial_sequence(${tabela}, 'id'))::int AS id`;
  return id;
}
