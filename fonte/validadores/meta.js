import { z } from 'zod';
import { CATEGORIAS_META, LIMITES, STATUS_META } from '../configuracao/constantes.js';
import { dataEsquema, opcionalVazioComoNulo, paginacaoEsquema, textoLimpo, vazioComoAusente } from './comuns.js';

const categorias = Object.values(CATEGORIAS_META);
const statuses = Object.values(STATUS_META);

const tituloEsquema = textoLimpo(2, LIMITES.maxCaracteresTituloMeta, 'Informe a meta.');

export const esquemaCriarMeta = z
  .object({
    titulo: tituloEsquema,
    categoria: z.enum(categorias),
    prazo: opcionalVazioComoNulo(dataEsquema)
  })
  .strict();

// Atualização parcial: só o que for enviado muda. `prazo: null` remove o prazo.
export const esquemaAtualizarMeta = z
  .object({
    titulo: tituloEsquema.optional(),
    categoria: z.enum(categorias).optional(),
    prazo: opcionalVazioComoNulo(dataEsquema),
    status: z.enum(statuses).optional()
  })
  .strict()
  .refine((dados) => Object.values(dados).some((valor) => valor !== undefined), 'Informe ao menos um campo para alterar.');

export const consultaMetas = z
  .object({
    status: vazioComoAusente(z.enum(statuses).optional()),
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict();
