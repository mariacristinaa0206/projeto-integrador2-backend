import { PAPEIS } from '../configuracao/constantes.js';

/**
 * Dados da conta. O hash da senha nunca sai (o Prisma já o omite das consultas) e cada serializador
 * escolhe campo a campo o que mostra.
 */
export function serializarConta(usuario) {
  const base = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    ativo: usuario.ativo,
    deveTrocarSenha: usuario.deveTrocarSenha,
    ultimoAcessoEm: usuario.ultimoAcessoEm?.toISOString() ?? null,
    criadoEm: usuario.criadoEm.toISOString()
  };
  if (usuario.papel !== PAPEIS.ALUNO || !usuario.aluno) return base;
  return {
    ...base,
    aluno: {
      turma: usuario.aluno.turma,
      nivelEnsino: usuario.aluno.nivelEnsino,
      consentimentoEm: usuario.aluno.consentimentoEm.toISOString(),
      consentimentoOrigem: usuario.aluno.consentimentoOrigem
    }
  };
}

/** Resumo do aluno para a equipe: o mínimo para identificar e localizar a turma (sem e-mail nem consentimento). */
export function serializarAlunoResumo(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    turma: usuario.aluno?.turma ?? null,
    nivelEnsino: usuario.aluno?.nivelEnsino ?? null
  };
}

/** Aluno na listagem da equipe de apoio (inclui e-mail institucional, para contato da escola). */
export function serializarAlunoDaEquipe(usuario) {
  return { ...serializarAlunoResumo(usuario), email: usuario.email, criadoEm: usuario.criadoEm.toISOString() };
}

/** Profissional na vitrine para o aluno escolher: só nome e perfil. */
export function serializarProfissionalPublico(usuario) {
  return { id: usuario.id, nome: usuario.nome, papel: usuario.papel };
}
