import { z } from 'zod';
import { LIMITES } from '../configuracao/constantes.js';
import { dataEsquema, idEsquema, paginacaoEsquema, textoLivre } from './comuns.js';

export const parametrosAlunoEsquema = z.object({ id: idEsquema }).strict();

export const esquemaCriarAcompanhamento = z
  .object({
    observacao: textoLivre(1, LIMITES.maxCaracteresAnotacao, 'Escreva a observação.'),
    data: dataEsquema.optional()
  })
  .strict();

export const consultaAcompanhamentos = z.object({ ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima) }).strict();
