import { banco } from '../banco/cliente.js';
import { TIPOS_ACOMPANHAMENTO } from '../configuracao/constantes.js';
import { isoParaData } from '../utilitarios/datas.js';

/** Acesso à tabela `acompanhamentos`. A observação continua CIFRADA aqui. */

const incluirAutor = { autor: { select: { id: true, nome: true, papel: true } } };

export const criar = ({ id, usuarioId, autorId, tipo, observacao, data }) =>
  banco.acompanhamento.create({
    data: { id, usuarioId, autorId, tipo, observacao, data: isoParaData(data) },
    include: incluirAutor
  });

/**
 * Quem lê o quê. `visibilidade` vem do serviço:
 *   - `pedagogicas`: pode ler as anotações pedagógicas de qualquer autor;
 *   - `psicologicasDoAutorId`: lê as anotações psicológicas, mas SÓ as que ele mesmo escreveu.
 */
const filtro = (alunoId, { pedagogicas, psicologicasDoAutorId }) => ({
  usuarioId: alunoId,
  OR: [
    ...(pedagogicas ? [{ tipo: TIPOS_ACOMPANHAMENTO.PEDAGOGICO }] : []),
    ...(psicologicasDoAutorId ? [{ tipo: TIPOS_ACOMPANHAMENTO.PSICOLOGICO, autorId: psicologicasDoAutorId }] : [])
  ]
});

export const listarVisiveis = ({ alunoId, visibilidade, pular, tomar }) =>
  banco.acompanhamento.findMany({
    where: filtro(alunoId, visibilidade),
    include: incluirAutor,
    orderBy: [{ data: 'desc' }, { id: 'desc' }],
    skip: pular,
    take: tomar
  });

export const contarVisiveis = ({ alunoId, visibilidade }) =>
  banco.acompanhamento.count({ where: filtro(alunoId, visibilidade) });
