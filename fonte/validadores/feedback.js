import { z } from 'zod';
import { ALVOS_FEEDBACK, LIMITES } from '../configuracao/constantes.js';
import { dataEsquema, idCorpoEsquema, opcionalVazioComoNulo, paginacaoEsquema, textoLivre, vazioComoAusente } from './comuns.js';

const notaEsquema = z.number().int().min(1, 'A nota vai de 1 a 5.').max(5, 'A nota vai de 1 a 5.');
const comentarioEsquema = opcionalVazioComoNulo(textoLivre(1, LIMITES.maxCaracteresComentario));

// ---- Avaliar o sistema ou uma sessão concluída (RF08) ----
export const esquemaCriarFeedback = z.discriminatedUnion('alvo', [
  z.object({ alvo: z.literal(ALVOS_FEEDBACK.SISTEMA), nota: notaEsquema, comentario: comentarioEsquema }).strict(),
  z
    .object({ alvo: z.literal(ALVOS_FEEDBACK.SESSAO), sessaoId: idCorpoEsquema, nota: notaEsquema, comentario: comentarioEsquema })
    .strict()
]);

export const consultaMeusFeedbacks = z.object({ ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima) }).strict();

// ---- Painel de gestão (administrador): sem identificar quem avaliou ----
export const consultaFeedbacksGestao = z
  .object({
    alvo: vazioComoAusente(z.enum(Object.values(ALVOS_FEEDBACK)).optional()),
    notaMinima: vazioComoAusente(z.coerce.number().int().min(1).max(5).optional()),
    notaMaxima: vazioComoAusente(z.coerce.number().int().min(1).max(5).optional()),
    de: vazioComoAusente(dataEsquema.optional()),
    ate: vazioComoAusente(dataEsquema.optional()),
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict();
