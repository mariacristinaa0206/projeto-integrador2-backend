import { z } from 'zod';
import { LIMITES } from '../configuracao/constantes.js';
import { idCorpoEsquema } from './comuns.js';

// Sem `ids`, marca todas como lidas. Com `ids`, só as indicadas (e que sejam do próprio usuário).
export const esquemaMarcarLidas = z
  .object({ ids: z.array(idCorpoEsquema).min(1).max(LIMITES.maxNotificacoes).optional() })
  .strict();
