import { z } from 'zod';
import { NIVEIS_ENSINO } from '../configuracao/constantes.js';
import { mesEsquema, turmaEsquema, vazioComoAusente } from './comuns.js';

// Indicadores coletivos: mês (padrão = mês atual) e filtros opcionais.
export const consultaColetivo = z
  .object({
    mes: vazioComoAusente(mesEsquema.optional()),
    turma: vazioComoAusente(turmaEsquema.optional()),
    nivelEnsino: vazioComoAusente(z.enum(Object.values(NIVEIS_ENSINO)).optional())
  })
  .strict();
