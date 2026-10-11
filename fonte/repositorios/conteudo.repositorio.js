import { Prisma } from '@prisma/client';
import { banco } from '../banco/cliente.js';
import { isoParaData } from '../utilitarios/datas.js';
import { escaparCuringasLike } from '../utilitarios/texto.js';

/** Acesso à tabela `conteudos_educativos`. Nenhuma regra de negócio aqui. */

/** `nivelEnsino` vazio no conteúdo = serve para todos; senão, precisa conter o nível do aluno. */
const paraONivel = (nivelEnsino) => ({
  OR: [{ niveisEnsino: { isEmpty: true } }, { niveisEnsino: { has: nivelEnsino } }]
});

const filtro = ({ tipo, tema, busca, publicado, nivelEnsino }) => ({
  ...(tipo ? { tipo } : {}),
  ...(tema ? { tema } : {}),
  ...(publicado !== undefined ? { publicado } : {}),
  ...(busca
    ? {
        OR: [
          { titulo: { contains: escaparCuringasLike(busca), mode: 'insensitive' } },
          { descricao: { contains: escaparCuringasLike(busca), mode: 'insensitive' } }
        ]
      }
    : {}),
  ...(nivelEnsino ? { AND: [paraONivel(nivelEnsino)] } : {})
});

const ordem = [{ dataPublicacao: 'desc' }, { id: 'desc' }];

export const listar = ({ pular, tomar, ...filtros }) =>
  banco.conteudoEducativo.findMany({ where: filtro(filtros), orderBy: ordem, skip: pular, take: tomar });

export const contar = (filtros) => banco.conteudoEducativo.count({ where: filtro(filtros) });

export const buscarPorId = (id) => banco.conteudoEducativo.findUnique({ where: { id } });

/** Orientações iniciais (RF04) publicadas para o tema e o nível. */
export const listarOrientacoes = ({ tema, nivelEnsino, tomar }) =>
  banco.conteudoEducativo.findMany({
    where: { tipo: 'orientacao', publicado: true, ...(tema ? { tema } : {}), ...paraONivel(nivelEnsino) },
    orderBy: [{ id: 'asc' }],
    take: tomar
  });

export const criar = ({ dataPublicacao, ...dados }) =>
  banco.conteudoEducativo.create({ data: { ...dados, dataPublicacao: isoParaData(dataPublicacao) } });

/**
 * Edição por substituição (PUT). `estrutura` ausente grava NULL de verdade (Prisma.DbNull): sem isso, trocar um quiz
 * por outro tipo deixaria as perguntas antigas no banco e o CHECK "quiz ⇔ estrutura" recusaria a gravação.
 */
export const atualizar = (id, { dataPublicacao, estrutura, ...dados }) =>
  banco.conteudoEducativo.update({
    where: { id },
    data: {
      ...dados,
      estrutura: estrutura ?? Prisma.DbNull,
      ...(dataPublicacao ? { dataPublicacao: isoParaData(dataPublicacao) } : {})
    }
  });

export const excluir = (id) => banco.conteudoEducativo.delete({ where: { id }, select: { id: true } });

export const contarPublicados = () => banco.conteudoEducativo.count({ where: { publicado: true } });
