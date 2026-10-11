import { z } from 'zod';
import { LIMITES, NIVEIS_ENSINO } from '../configuracao/constantes.js';
import { paginacaoEsquema, textoDeConsulta, turmaEsquema, vazioComoAusente } from './comuns.js';

export const consultaAlunos = z
  .object({
    busca: textoDeConsulta(LIMITES.maxCaracteresBusca),
    turma: vazioComoAusente(turmaEsquema.optional()),
    nivelEnsino: vazioComoAusente(z.enum(Object.values(NIVEIS_ENSINO)).optional()),
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict();
