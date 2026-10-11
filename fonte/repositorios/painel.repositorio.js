import { Prisma } from '@prisma/client';
import { banco } from '../banco/cliente.js';

/**
 * Agregações dos indicadores COLETIVOS. Só devolve contagens por grupo: nada que identifique um aluno sai daqui.
 * (A regra de anonimato — grupos pequenos ficam ocultos — é aplicada pelo serviço, ver utilitarios/indicadores.js.)
 *
 * SQL parametrizado; as únicas partes "cruas" (nome da coluna de agrupamento) vêm de um mapa fixo abaixo,
 * nunca de entrada do usuário.
 */

const COLUNA_DO_GRUPO = Object.freeze({
  turma: Prisma.raw('a.turma'),
  nivelEnsino: Prisma.raw('a.nivel_ensino::text'),
  dia: Prisma.raw('r.dia::text')
});

const ORIGEM = Prisma.sql`
  FROM registros_emocionais r
  JOIN alunos a ON a.usuario_id = r.usuario_id
  JOIN usuarios u ON u.id = r.usuario_id`;

const condicoes = ({ inicio, fim, turma, nivelEnsino }) => Prisma.sql`
  WHERE u.ativo = true
    AND r.dia BETWEEN ${inicio}::date AND ${fim}::date
    ${turma ? Prisma.sql`AND a.turma = ${turma}` : Prisma.empty}
    ${nivelEnsino ? Prisma.sql`AND a.nivel_ensino = ${nivelEnsino}::"nivel_ensino"` : Prisma.empty}`;

/** Total de registros e de alunos distintos que registraram no período. */
export async function totais(filtros) {
  const [linha] = await banco.$queryRaw`
    SELECT COUNT(*)::int AS registros, COUNT(DISTINCT r.usuario_id)::int AS alunos
    ${ORIGEM} ${condicoes(filtros)}`;
  return linha;
}

/** Registros por emoção e intensidade (todo o filtro junto). */
export const porEmocaoEIntensidade = (filtros) => banco.$queryRaw`
  SELECT r.emocao::text AS emocao, r.intensidade::text AS intensidade, COUNT(*)::int AS registros
  ${ORIGEM} ${condicoes(filtros)}
  GROUP BY 1, 2`;

/** Registros e alunos distintos por grupo ('turma' | 'nivelEnsino' | 'dia'). */
export const totaisPorGrupo = (chave, filtros) => banco.$queryRaw`
  SELECT ${COLUNA_DO_GRUPO[chave]} AS grupo, COUNT(*)::int AS registros, COUNT(DISTINCT r.usuario_id)::int AS alunos
  ${ORIGEM} ${condicoes(filtros)}
  GROUP BY 1
  ORDER BY 1`;

/** Registros por grupo e emoção (para calcular o humor médio e os indicadores de cada grupo). */
export const emocoesPorGrupo = (chave, filtros) => banco.$queryRaw`
  SELECT ${COLUNA_DO_GRUPO[chave]} AS grupo, r.emocao::text AS emocao, COUNT(*)::int AS registros
  ${ORIGEM} ${condicoes(filtros)}
  GROUP BY 1, 2`;

/** Alunos ativos matriculados (com o filtro), por turma e nível. */
export function contarMatriculados({ turma, nivelEnsino } = {}) {
  return banco.aluno.groupBy({
    by: ['turma', 'nivelEnsino'],
    where: {
      usuario: { ativo: true },
      ...(turma ? { turma } : {}),
      ...(nivelEnsino ? { nivelEnsino } : {})
    },
    _count: { _all: true }
  });
}
