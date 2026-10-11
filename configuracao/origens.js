import { ambiente } from './ambiente.js';
import { ErroApp } from '../utilitarios/erros.js';

const ORIGEM_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

function origemPermitida(origem) {
  if (ambiente.origensCors.includes(origem)) return true;
  // Em desenvolvimento, qualquer porta de localhost (Live Server, Vite, etc.).
  return !ambiente.ehProducao && ORIGEM_LOCAL.test(origem);
}

/**
 * Política de origens (CORS) por lista de permissão. Em produção, sem CORS_ORIGINS nenhum site é autorizado.
 * Origem não autorizada recebe 403 explícito em vez de só omitir os cabeçalhos CORS.
 * Chamadas sem cabeçalho Origin (curl, servidor-servidor) passam: a proteção real é o JWT.
 */
export const opcoesCors = {
  origin(origem, retorno) {
    if (!origem || origemPermitida(origem)) return retorno(null, true);
    return retorno(new ErroApp(403, 'ORIGEM_NAO_PERMITIDA', 'Origem não autorizada.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // só o que a API usa
  allowedHeaders: ['Authorization', 'Content-Type'],
  exposedHeaders: ['X-Request-Id', 'Retry-After', 'RateLimit'],
  credentials: false, // autenticação é por Bearer token; não há cookies
  maxAge: 600
};
