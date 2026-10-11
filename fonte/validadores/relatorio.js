import { z } from 'zod';
import { LIMITES, NIVEIS_ENSINO, TIPOS_RELATORIO } from '../configuracao/constantes.js';
import { idCorpoEsquema, mesEsquema, paginacaoEsquema, turmaEsquema, vazioComoAusente } from './comuns.js';

// ---- Gerar relatório (RF03). O que vale em cada tipo:
//   emocional  : `alunoId` opcional (psicólogo vinculado); sem ele, é o relatório do próprio usuário
//   pedagogico : indicadores coletivos, com filtros opcionais de turma e nível
//   estatistico: uso da plataforma (só administrador)
export const esquemaGerarRelatorio = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal(TIPOS_RELATORIO.EMOCIONAL), mes: mesEsquema, alunoId: idCorpoEsquema.optional() }).strict(),
  z
    .object({
      tipo: z.literal(TIPOS_RELATORIO.PEDAGOGICO),
      mes: mesEsquema,
      turma: turmaEsquema.optional(),
      nivelEnsino: z.enum(Object.values(NIVEIS_ENSINO)).optional()
    })
    .strict(),
  z.object({ tipo: z.literal(TIPOS_RELATORIO.ESTATISTICO), mes: mesEsquema }).strict()
]);

export const consultaRelatorios = z
  .object({
    tipo: vazioComoAusente(z.enum(Object.values(TIPOS_RELATORIO)).optional()),
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict();
