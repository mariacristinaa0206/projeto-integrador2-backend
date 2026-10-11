import { z } from 'zod';
import { LIMITES, NIVEIS_ENSINO, TEMAS, TIPOS_CONTEUDO } from '../configuracao/constantes.js';
import {
  booleanoDeConsulta,
  opcionalVazioComoNulo,
  paginacaoEsquema,
  textoDeConsulta,
  textoLimpo,
  textoLivre,
  urlHttpsEsquema,
  vazioComoAusente
} from './comuns.js';

const tipos = Object.values(TIPOS_CONTEUDO);
const temas = Object.values(TEMAS);
const niveis = Object.values(NIVEIS_ENSINO);

const perguntaEsquema = z
  .object({
    enunciado: textoLimpo(3, LIMITES.maxCaracteresPergunta, 'Informe o enunciado da pergunta.'),
    opcoes: z
      .array(textoLimpo(1, LIMITES.maxCaracteresOpcao))
      .min(LIMITES.minOpcoesPergunta)
      .max(LIMITES.maxOpcoesPergunta),
    correta: z.number().int().min(0),
    explicacao: opcionalVazioComoNulo(textoLivre(1, 500))
  })
  .strict()
  .refine((pergunta) => pergunta.correta < pergunta.opcoes.length, {
    message: 'A alternativa correta deve ser uma das opções (índice a partir de 0).',
    path: ['correta']
  });

const quizEsquema = z
  .object({ perguntas: z.array(perguntaEsquema).min(1).max(LIMITES.maxPerguntasQuiz) })
  .strict();

// ---- Criar e editar (PUT substitui todos os campos editáveis). ----
// Quiz exige `estrutura`; vídeo e áudio exigem `urlMidia`; os demais tipos não aceitam `estrutura`.
export const esquemaConteudo = z
  .object({
    titulo: textoLimpo(2, LIMITES.maxCaracteresTitulo, 'Informe o título.'),
    descricao: textoLivre(1, LIMITES.maxCaracteresConteudo, 'Informe o texto do conteúdo.'),
    tipo: z.enum(tipos),
    tema: z.enum(temas),
    niveisEnsino: z
      .array(z.enum(niveis))
      .max(LIMITES.maxNiveisPorConteudo)
      .default([])
      .transform((lista) => [...new Set(lista)]),
    urlMidia: opcionalVazioComoNulo(urlHttpsEsquema),
    estrutura: quizEsquema.nullable().optional(),
    publicado: z.boolean().default(true)
  })
  .strict()
  .superRefine((conteudo, ctx) => {
    if (conteudo.tipo === TIPOS_CONTEUDO.QUIZ && !conteudo.estrutura) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['estrutura'], message: 'Quiz exige as perguntas (estrutura).' });
    }
    if (conteudo.tipo !== TIPOS_CONTEUDO.QUIZ && conteudo.estrutura) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['estrutura'], message: 'Só o tipo "quiz" tem estrutura de perguntas.' });
    }
    if ([TIPOS_CONTEUDO.VIDEO, TIPOS_CONTEUDO.AUDIO].includes(conteudo.tipo) && !conteudo.urlMidia) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['urlMidia'], message: 'Vídeo e áudio exigem o link da mídia (https).' });
    }
  });

export const consultaConteudos = z
  .object({
    tipo: vazioComoAusente(z.enum(tipos).optional()),
    tema: vazioComoAusente(z.enum(temas).optional()),
    busca: textoDeConsulta(LIMITES.maxCaracteresBusca),
    // Só a gestão (admin, psicólogo, pedagógico) enxerga rascunhos; para os demais o filtro é ignorado.
    publicado: booleanoDeConsulta,
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict();

export const consultaOrientacoes = z
  .object({
    tema: vazioComoAusente(z.enum(temas).optional()),
    emocao: vazioComoAusente(z.string().max(30).optional())
  })
  .strict();

// ---- Responder o quiz: um número por pergunta, na ordem (índice da alternativa escolhida). ----
export const esquemaResponderQuiz = z
  .object({
    respostas: z.array(z.number().int().min(0).max(LIMITES.maxOpcoesPergunta - 1)).min(1).max(LIMITES.maxPerguntasQuiz)
  })
  .strict();
