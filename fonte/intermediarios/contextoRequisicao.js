import { randomUUID } from 'node:crypto';
import { registrador } from '../utilitarios/registrador.js';

/**
 * Atribui um id a cada requisição (devolvido em X-Request-Id e nos erros, para rastrear no log)
 * e registra uma linha por requisição ao terminar. Nunca registra query string, corpo ou cabeçalhos.
 */
export function contextoRequisicao(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1e6;
    registrador.info('requisicao', {
      idRequisicao: req.id,
      metodo: req.method,
      rota: req.originalUrl.split('?')[0],
      status: res.statusCode,
      duracaoMs: Math.round(duracaoMs),
      papel: req.usuario?.papel,
      usuarioId: req.usuario?.id ?? undefined
    });
  });

  next();
}
