import { z } from 'zod';
import { LIMITES, STATUS_VINCULO } from '../configuracao/constantes.js';
import { idCorpoEsquema, idEsquema, paginacaoEsquema, vazioComoAusente } from './comuns.js';

// ---- A escola designa um psicólogo para acompanhar os registros de um aluno (administrador / pedagógico) ----
export const esquemaDesignarVinculo = z.object({ alunoId: idCorpoEsquema, profissionalId: idCorpoEsquema }).strict();

// `alunoId` e `profissionalId` só filtram para administrador/pedagógico; aluno e psicólogo veem sempre os próprios.
export const consultaVinculos = z
  .object({
    status: vazioComoAusente(z.enum(Object.values(STATUS_VINCULO)).optional()),
    alunoId: vazioComoAusente(idEsquema.optional()),
    profissionalId: vazioComoAusente(idEsquema.optional()),
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict();
