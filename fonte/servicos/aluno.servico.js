import { ACOES_AUDITORIA, PAPEIS } from '../configuracao/constantes.js';
import * as alunoRepositorio from '../repositorios/aluno.repositorio.js';
import * as registroRepositorio from '../repositorios/registro.repositorio.js';
import { serializarAlunoDaEquipe } from '../serializadores/usuario.serializador.js';
import { serializarRegistro } from '../serializadores/registro.serializador.js';
import { decifrarTexto } from '../utilitarios/cifra.js';
import { contextoCifra } from '../utilitarios/contextoCifra.js';
import { naoEncontrado } from '../utilitarios/erros.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';
import * as auditoriaServico from './auditoria.servico.js';
import { resolverPeriodo } from './registro.servico.js';
import * as vinculoServico from './vinculo.servico.js';

/**
 * Visão da equipe sobre os alunos.
 *   - Psicólogo: SÓ os alunos com vínculo ativo com ele, e é o único que lê o diário (registros) deles.
 *   - Pedagógico: lista os alunos ativos (identificação e turma), mas NÃO lê o diário.
 * Aluno fora do alcance responde 404, igual a inexistente.
 */

/** Filtro de alcance: o psicólogo só alcança os próprios vinculados; o pedagógico, todos. */
const alcance = (autenticado) => (autenticado.papel === PAPEIS.PSICOLOGO ? { apenasDoProfissionalId: autenticado.id } : {});

export async function listar(autenticado, consulta) {
  const filtros = { busca: consulta.busca, turma: consulta.turma, nivelEnsino: consulta.nivelEnsino, ...alcance(autenticado) };
  const [alunos, total] = await Promise.all([
    alunoRepositorio.listar({ ...filtros, ...calcularDeslocamento(consulta) }),
    alunoRepositorio.contar(filtros)
  ]);
  return respostaPaginada(alunos.map(serializarAlunoDaEquipe), total, consulta);
}

export async function obter(autenticado, id) {
  const aluno = await alunoRepositorio.buscar(id, alcance(autenticado));
  if (!aluno) throw naoEncontrado('Aluno não encontrado.');
  return serializarAlunoDaEquipe(aluno);
}

/**
 * Diário do aluno para o psicólogo vinculado. O log de auditoria é gravado ANTES de devolver os dados.
 * A observação (texto livre) é decifrada aqui, só para quem passou pela checagem de vínculo.
 */
export async function listarRegistros(autenticado, alunoId, consulta) {
  await vinculoServico.exigirAlunoVinculado(autenticado.id, alunoId);

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.REGISTROS_CONSULTADOS,
    alvoUsuarioId: alunoId,
    recurso: 'registros_emocionais'
  });

  const filtros = { usuarioId: alunoId, emocao: consulta.emocao, ...resolverPeriodo(consulta) };
  const [registros, total] = await Promise.all([
    registroRepositorio.listar({ ...filtros, ...calcularDeslocamento(consulta) }),
    registroRepositorio.contar(filtros)
  ]);
  return respostaPaginada(
    registros.map((registro) =>
      serializarRegistro(registro, decifrarTexto(registro.observacao, contextoCifra.registroObservacao(registro.id)))
    ),
    total,
    consulta
  );
}
