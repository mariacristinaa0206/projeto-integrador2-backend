import { z } from 'zod';
import { ACOES_AUDITORIA, LIMITES } from '../configuracao/constantes.js';
import { dataEsquema, idEsquema, paginacaoEsquema, vazioComoAusente } from './comuns.js';

export const consultaAuditoria = z
  .object({
    usuarioId: vazioComoAusente(idEsquema.optional()),
    alvoUsuarioId: vazioComoAusente(idEsquema.optional()),
    acao: vazioComoAusente(z.enum(Object.values(ACOES_AUDITORIA)).optional()),
    de: vazioComoAusente(dataEsquema.optional()),
    ate: vazioComoAusente(dataEsquema.optional()),
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict();
