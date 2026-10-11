import { z } from 'zod';
import { EMOCOES, INTENSIDADES, LIMITES } from '../configuracao/constantes.js';
import {
  dataEsquema,
  mesEsquema,
  opcionalVazioComoNulo,
  paginacaoEsquema,
  textoLivre,
  vazioComoAusente
} from './comuns.js';

const emocoes = Object.keys(EMOCOES);
const observacaoEsquema = textoLivre(1, LIMITES.maxCaracteresObservacao);

// ---- Registrar o estado emocional (RF02). Dia e horário vêm do servidor; humor é derivado da emoção. ----
export const esquemaRegistrar = z
  .object({
    emocao: z.enum(emocoes),
    intensidade: z.enum(Object.values(INTENSIDADES)),
    observacao: opcionalVazioComoNulo(observacaoEsquema)
  })
  .strict();

// ---- Editar a anotação do registro (RF09). Enviar vazio/null apaga a anotação. ----
export const esquemaAtualizarObservacao = z
  .object({
    observacao: z.preprocess(
      (valor) => (typeof valor === 'string' && valor.trim() === '' ? null : valor),
      observacaoEsquema.nullable()
    )
  })
  .strict();

// ---- Listagem. `mes` é atalho para o intervalo do mês; não combina com de/ate. ----
export const consultaRegistros = z
  .object({
    mes: vazioComoAusente(mesEsquema.optional()),
    de: vazioComoAusente(dataEsquema.optional()),
    ate: vazioComoAusente(dataEsquema.optional()),
    emocao: vazioComoAusente(z.enum(emocoes).optional()),
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict()
  .refine((consulta) => !(consulta.mes && (consulta.de || consulta.ate)), {
    message: 'Use "mes" ou "de"/"ate", não os dois juntos.',
    path: ['mes']
  })
  .refine((consulta) => !(consulta.de && consulta.ate && consulta.de > consulta.ate), {
    message: 'A data inicial não pode ser depois da final.',
    path: ['de']
  });
