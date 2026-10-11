import { banco } from '../banco/cliente.js';
import { PAPEIS, STATUS_VINCULO } from '../configuracao/constantes.js';
import { escaparCuringasLike } from '../utilitarios/texto.js';

/** Visão da equipe sobre os alunos (usuário + perfil). Nenhuma regra de negócio aqui. */

const selecionar = {
  id: true,
  nome: true,
  email: true,
  ativo: true,
  criadoEm: true,
  aluno: { select: { turma: true, nivelEnsino: true } }
};

/** Psicólogo só enxerga alunos com vínculo ATIVO com ele (`apenasDoProfissionalId`). Pedagógico enxerga todos os ativos. */
const filtro = ({ busca, turma, nivelEnsino, apenasDoProfissionalId }) => ({
  papel: PAPEIS.ALUNO,
  ativo: true,
  ...(busca ? { nome: { contains: escaparCuringasLike(busca), mode: 'insensitive' } } : {}),
  ...(turma || nivelEnsino
    ? { aluno: { ...(turma ? { turma } : {}), ...(nivelEnsino ? { nivelEnsino } : {}) } }
    : {}),
  ...(apenasDoProfissionalId
    ? { vinculosComoAluno: { some: { profissionalId: apenasDoProfissionalId, status: STATUS_VINCULO.ATIVO } } }
    : {})
});

export const listar = ({ pular, tomar, ...filtros }) =>
  banco.usuario.findMany({
    where: filtro(filtros),
    select: selecionar,
    orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    skip: pular,
    take: tomar
  });

export const contar = (filtros) => banco.usuario.count({ where: filtro(filtros) });

export const buscar = (id, filtros = {}) =>
  banco.usuario.findFirst({ where: { ...filtro(filtros), id }, select: selecionar });
