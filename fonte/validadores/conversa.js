import { z } from 'zod';
import { LIMITES } from '../configuracao/constantes.js';
import { idCorpoEsquema, idEsquema, textoLivre, vazioComoAusente } from './comuns.js';

// ---- Abrir conversa: o aluno informa o profissional; o psicólogo vinculado informa o aluno. ----
export const esquemaAbrirConversa = z
  .object({ profissionalId: idCorpoEsquema.optional(), alunoId: idCorpoEsquema.optional() })
  .strict()
  .refine((dados) => Number(dados.profissionalId !== undefined) + Number(dados.alunoId !== undefined) === 1, {
    message: 'Informe apenas profissionalId (aluno) ou apenas alunoId (psicólogo).'
  });

export const esquemaEnviarMensagem = z
  .object({ texto: textoLivre(1, LIMITES.maxCaracteresMensagem, 'Escreva a mensagem.') })
  .strict();

// ---- Leitura incremental (polling): `depois` = id da última mensagem que o cliente já tem. ----
export const consultaMensagens = z
  .object({
    depois: vazioComoAusente(idEsquema.optional()),
    limite: vazioComoAusente(z.coerce.number().int().min(1).max(LIMITES.maxMensagensPorLeitura).default(50))
  })
  .strict();
