import { z } from 'zod';
import { NIVEIS_AUTOCADASTRO } from '../configuracao/constantes.js';
import { emailEsquema, nomeEsquema, senhaAtualEsquema, senhaNovaEsquema, turmaEsquema } from './comuns.js';

/**
 * Cadastro público: só aluno, e só dos níveis em NIVEIS_AUTOCADASTRO (ensino médio). Os demais níveis são
 * cadastrados pela escola (POST /usuarios) com o consentimento do responsável.
 */
export const esquemaCadastroAluno = z
  .object({
    nome: nomeEsquema,
    email: emailEsquema,
    senha: senhaNovaEsquema,
    turma: turmaEsquema,
    nivelEnsino: z.enum(NIVEIS_AUTOCADASTRO, {
      errorMap: () => ({
        message: `O cadastro por conta própria é permitido apenas para: ${NIVEIS_AUTOCADASTRO.join(', ')}. Os demais níveis são cadastrados pela escola.`
      })
    }),
    aceiteTermos: z.literal(true, {
      errorMap: () => ({ message: 'É preciso aceitar os termos de uso e a política de privacidade.' })
    })
  })
  .strict();

// No login a senha não passa pela regra de força: apenas limitamos o tamanho para não processar lixo.
export const esquemaEntrar = z
  .object({
    email: z.string().trim().toLowerCase().min(1).max(254),
    senha: z.string().min(1).max(128)
  })
  .strict();

export const esquemaTrocarSenha = z
  .object({ senhaAtual: senhaAtualEsquema, novaSenha: senhaNovaEsquema })
  .strict()
  .refine((dados) => dados.senhaAtual !== dados.novaSenha, {
    message: 'A nova senha deve ser diferente da atual.',
    path: ['novaSenha']
  });
