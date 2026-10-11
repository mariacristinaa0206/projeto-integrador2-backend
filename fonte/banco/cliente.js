import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { ambiente } from '../configuracao/ambiente.js';
import { registrador } from '../utilitarios/registrador.js';

/**
 * Pool criado por nós (e não pelo adaptador) para podermos tratar o evento 'error':
 * o Neon derruba conexões ociosas e, sem ouvinte, esse evento derrubaria o processo inteiro.
 */
export const pool = new pg.Pool({
  connectionString: ambiente.urlBanco,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000 // o Neon pode levar alguns segundos para "acordar" depois de ocioso
});

pool.on('error', (erro) => {
  registrador.aviso('Conexão ociosa do pool foi encerrada pelo banco', { codigo: erro.code });
});

/**
 * `omit` global: o hash da senha NUNCA sai do banco por acidente.
 * Quem precisa dele pede explicitamente com `omit: { senhaHash: false }`.
 */
export const banco = new PrismaClient({
  adapter: new PrismaPg(pool),
  omit: {
    usuario: { senhaHash: true }
  }
});

export async function desconectarBanco() {
  await banco.$disconnect();
  await pool.end().catch(() => {});
}
