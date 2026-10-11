import { z } from 'zod';
import { LIMITES, STATUS_ALERTA, TIPOS_ALERTA } from '../configuracao/constantes.js';
import { paginacaoEsquema, turmaEsquema, vazioComoAusente } from './comuns.js';

export const consultaAlertas = z
  .object({
    status: vazioComoAusente(z.enum(Object.values(STATUS_ALERTA)).optional()),
    tipo: vazioComoAusente(z.enum(Object.values(TIPOS_ALERTA)).optional()),
    turma: vazioComoAusente(turmaEsquema.optional()),
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict();
