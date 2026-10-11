import { z } from 'zod';
import { LIMITES, STATUS_SESSAO } from '../configuracao/constantes.js';
import {
  dataEsquema,
  idCorpoEsquema,
  idEsquema,
  instanteEsquema,
  opcionalVazioComoNulo,
  paginacaoEsquema,
  textoLivre,
  vazioComoAusente
} from './comuns.js';

// ---- Solicitar sessão (aluno). `compartilharRegistros` só vale para psicólogo e é SEMPRE opt-in. ----
export const esquemaSolicitarSessao = z
  .object({
    profissionalId: idCorpoEsquema,
    inicio: instanteEsquema,
    motivo: opcionalVazioComoNulo(textoLivre(1, LIMITES.maxCaracteresMotivoSessao)),
    compartilharRegistros: z.boolean().default(false)
  })
  .strict();

export const consultaSessoes = z
  .object({
    status: vazioComoAusente(z.enum(Object.values(STATUS_SESSAO)).optional()),
    de: vazioComoAusente(dataEsquema.optional()),
    ate: vazioComoAusente(dataEsquema.optional()),
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict()
  .refine((consulta) => !(consulta.de && consulta.ate && consulta.de > consulta.ate), {
    message: 'A data inicial não pode ser depois da final.',
    path: ['de']
  });

// ---- Horários livres de um profissional em um dia ----
export const consultaHorarios = z.object({ data: dataEsquema }).strict();
export const parametrosProfissionalEsquema = z.object({ id: idEsquema }).strict();
