import { banco } from '../banco/cliente.js';
import { PAPEIS } from '../configuracao/constantes.js';
import { escaparCuringasLike } from '../utilitarios/texto.js';

/** Acesso às tabelas `usuarios` e `alunos`. Nenhuma regra de negócio aqui. */

const incluirAluno = { aluno: true };

export const buscarPorId = (id) => banco.usuario.findUnique({ where: { id }, include: incluirAluno });

export const buscarPorEmail = (email) => banco.usuario.findUnique({ where: { email } });

/** Únicos lugares (além de trocar senha) em que o hash é lido do banco. */
export const buscarPorEmailComSenha = (email) =>
  banco.usuario.findUnique({ where: { email }, include: incluirAluno, omit: { senhaHash: false } });

export const buscarPorIdComSenha = (id) =>
  banco.usuario.findUnique({ where: { id }, include: incluirAluno, omit: { senhaHash: false } });

/** Mínimo necessário para validar um JWT a cada requisição (consulta por chave primária). */
export const buscarCredencialPorId = (id) =>
  banco.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, papel: true, ativo: true, deveTrocarSenha: true, versaoToken: true }
  });

/** Cria a conta; com `aluno`, cria junto (na mesma transação) o perfil de aluno e o registro do consentimento. */
export const criar = ({ aluno, ...dados }) =>
  banco.usuario.create({
    data: { ...dados, ...(aluno ? { aluno: { create: aluno } } : {}) },
    include: incluirAluno
  });

/** `dados.aluno` (turma/nível) é aplicado ao perfil de aluno. */
export const atualizar = (id, { aluno, ...dados }) =>
  banco.usuario.update({
    where: { id },
    data: { ...dados, ...(aluno ? { aluno: { update: aluno } } : {}) },
    include: incluirAluno
  });

export const incrementarVersaoToken = (id) =>
  banco.usuario.update({ where: { id }, data: { versaoToken: { increment: 1 } }, select: { versaoToken: true } });

export const registrarAcesso = (id) =>
  banco.usuario.update({ where: { id }, data: { ultimoAcessoEm: new Date() }, select: { id: true } });

export const excluir = (id) => banco.usuario.delete({ where: { id }, select: { id: true } });

/** Algum OUTRO usuário já usa este e-mail? */
export async function existeComEmail(email, ignorarId) {
  const total = await banco.usuario.count({ where: { email, ...(ignorarId ? { id: { not: ignorarId } } : {}) } });
  return total > 0;
}

export const contarAdministradoresAtivos = () =>
  banco.usuario.count({ where: { papel: PAPEIS.ADMINISTRADOR, ativo: true } });

export const contarAdministradores = () => banco.usuario.count({ where: { papel: PAPEIS.ADMINISTRADOR } });

// ---- Listagem para a gestão de contas ----

const filtroLista = ({ papel, busca, ativo, turma, nivelEnsino }) => ({
  ...(papel ? { papel } : {}),
  ...(ativo !== undefined ? { ativo } : {}),
  ...(busca
    ? {
        OR: [
          { nome: { contains: escaparCuringasLike(busca), mode: 'insensitive' } },
          { email: { contains: escaparCuringasLike(busca), mode: 'insensitive' } }
        ]
      }
    : {}),
  ...(turma || nivelEnsino
    ? { aluno: { ...(turma ? { turma } : {}), ...(nivelEnsino ? { nivelEnsino } : {}) } }
    : {})
});

export const listar = ({ pular, tomar, ...filtros }) =>
  banco.usuario.findMany({
    where: filtroLista(filtros),
    include: incluirAluno,
    orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    skip: pular,
    take: tomar
  });

export const contar = (filtros) => banco.usuario.count({ where: filtroLista(filtros) });

/** Profissionais de apoio ativos (para o aluno escolher com quem marcar sessão ou conversar). */
export const listarAtivosPorPapeis = (papeis, tomar) =>
  banco.usuario.findMany({
    where: { papel: { in: papeis }, ativo: true },
    select: { id: true, nome: true, papel: true },
    orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    take: tomar
  });

export const buscarAtivoPorPapeis = (id, papeis) =>
  banco.usuario.findFirst({
    where: { id, papel: { in: papeis }, ativo: true },
    select: { id: true, nome: true, papel: true }
  });

/** Aluno ativo (usuário + perfil). */
export const buscarAlunoAtivo = (id) =>
  banco.usuario.findFirst({
    where: { id, papel: PAPEIS.ALUNO, ativo: true },
    select: { id: true, nome: true, aluno: { select: { turma: true, nivelEnsino: true } } }
  });
