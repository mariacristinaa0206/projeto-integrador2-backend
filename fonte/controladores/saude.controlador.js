import { banco } from '../banco/cliente.js';
import { ErroApp } from '../utilitarios/erros.js';

/** Verificação de saúde para a hospedagem. Não expõe versões, configuração nem detalhes do erro. */
export async function verificarSaude(req, res) {
  try {
    await banco.$queryRaw`SELECT 1`;
  } catch {
    throw new ErroApp(503, 'BANCO_INDISPONIVEL', 'Banco de dados indisponível.');
  }
  res.json({ status: 'ok' });
}
