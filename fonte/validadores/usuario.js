import { z } from 'zod';
import { LIMITES, NIVEIS_ENSINO, PAPEIS } from '../configuracao/constantes.js';
import {
  booleanoDeConsulta,
  emailEsquema,
  nomeEsquema,
  paginacaoEsquema,
  senhaAtualEsquema,
  textoDeConsulta,
  turmaEsquema,
  vazioComoAusente
} from './comuns.js';

const niveis = Object.values(NIVEIS_ENSINO);
const papeis = Object.values(PAPEIS);
const papeisDaEquipe = papeis.filter((papel) => papel !== PAPEIS.ALUNO);

// ---- Criar conta (administrador: qualquer perfil; pedagógico: só aluno) ----
// Aluno exige turma, nível e a confirmação de que o responsável consentiu (LGPD). A senha é gerada pelo servidor.
const criarAluno = z
  .object({
    papel: z.literal(PAPEIS.ALUNO),
    nome: nomeEsquema,
    email: emailEsquema,
    turma: turmaEsquema,
    nivelEnsino: z.enum(niveis),
    consentimentoResponsavel: z.literal(true, {
      errorMap: () => ({
        message: 'Confirme que o pai, mãe ou responsável legal consentiu o uso do sistema (consentimentoResponsavel: true).'
      })
    })
  })
  .strict();

const criarFuncionario = z
  .object({
    papel: z.enum(papeisDaEquipe),
    nome: nomeEsquema,
    email: emailEsquema
  })
  .strict();

export const esquemaCriarUsuario = z.discriminatedUnion('papel', [criarAluno, criarFuncionario]);

// ---- Editar conta. O perfil (papel) NÃO muda: para trocar de perfil, crie outra conta. ----
export const esquemaAtualizarUsuario = z
  .object({
    nome: nomeEsquema.optional(),
    email: emailEsquema.optional(),
    turma: turmaEsquema.optional(),
    nivelEnsino: z.enum(niveis).optional()
  })
  .strict()
  .refine((dados) => Object.values(dados).some((valor) => valor !== undefined), 'Informe ao menos um campo para alterar.');

export const esquemaSituacao = z.object({ ativo: z.boolean() }).strict();

export const consultaUsuarios = z
  .object({
    papel: vazioComoAusente(z.enum(papeis).optional()),
    busca: textoDeConsulta(LIMITES.maxCaracteresBusca),
    ativo: booleanoDeConsulta,
    turma: vazioComoAusente(turmaEsquema.optional()),
    nivelEnsino: vazioComoAusente(z.enum(niveis).optional()),
    ...paginacaoEsquema(LIMITES.paginaPadrao, LIMITES.paginaMaxima)
  })
  .strict();

// Excluir é permanente: exige confirmação explícita na URL (?confirmar=true).
export const consultaExclusao = z.object({ confirmar: z.literal('true', { errorMap: () => ({ message: 'Confirme a exclusão com ?confirmar=true.' }) }) }).strict();

// ---- Perfil (o próprio usuário) ----
// Trocar e-mail exige a senha atual. Turma e nível só a escola altera (muda o conteúdo e os indicadores).
export const esquemaPerfil = z
  .object({
    nome: nomeEsquema,
    email: emailEsquema,
    senhaAtual: senhaAtualEsquema.optional()
  })
  .strict();

export const esquemaExcluirPerfil = z.object({ senhaAtual: senhaAtualEsquema }).strict();
