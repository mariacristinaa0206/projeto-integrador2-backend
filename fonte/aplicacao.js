import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { ambiente } from './configuracao/ambiente.js';
import { PREFIXO_API } from './configuracao/constantes.js';
import { opcoesCors } from './configuracao/origens.js';
import { especificacaoOpenApi } from './documentacao/especificacao.js';
import { contextoRequisicao } from './intermediarios/contextoRequisicao.js';
import { limitadorGlobal } from './intermediarios/limitadores.js';
import { rotaNaoEncontrada, tratadorErros } from './intermediarios/tratadorErros.js';
import rotas from './rotas/indice.js';

/**
 * Monta a aplicação Express sem iniciar o servidor (server.js faz o listen).
 *
 * Ordem das defesas em cada requisição à API:
 *   id da requisição → cabeçalhos de segurança (helmet) → CORS → limite de taxa por IP
 *   → [por rota] autenticação → perfil → limite por usuário → leitura do corpo → validação → controlador
 */
export function criarAplicacao() {
  const app = express();

  app.disable('x-powered-by');
  // Só confia em X-Forwarded-For se informarmos quantos proxies existem; senão qualquer um forjaria o IP.
  app.set('trust proxy', ambiente.confiarProxy > 0 ? ambiente.confiarProxy : false);

  app.use(contextoRequisicao);

  if (ambiente.docsAtivo) {
    app.get('/', (req, res) => res.json({ servico: 'ConectaMente', documentacao: '/docs' }));
    app.use(
      '/docs',
      // upgrade-insecure-requests quebraria o Swagger UI em http://localhost
      helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }),
      swaggerUi.serve,
      swaggerUi.setup(especificacaoOpenApi, { customSiteTitle: 'API · ConectaMente' })
    );
  }

  app.use(
    PREFIXO_API,
    // A API só devolve JSON: nenhum recurso externo, nenhum iframe.
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      referrerPolicy: { policy: 'no-referrer' }
    }),
    cors(opcoesCors),
    limitadorGlobal,
    rotas
  );

  app.use(rotaNaoEncontrada);
  app.use(tratadorErros);

  return app;
}
