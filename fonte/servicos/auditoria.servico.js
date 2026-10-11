import * as auditoriaRepositorio from '../repositorios/auditoria.repositorio.js';
import { serializarLogAuditoria } from '../serializadores/auditoria.serializador.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';

/**
 * Trilha de auditoria (RNF10): quem fez o quê e sobre quem. Regra: NUNCA gravar conteúdo (texto de registro,
 * mensagem, anotação, senha). Só identificadores e metadados.
 *
 * Quem consulta dado sensível de outra pessoa grava o log ANTES de devolver o dado: se a gravação falhar, a
 * requisição falha junto. Assim não existe leitura sem rastro.
 */

/**
 * @param ator  { id, idRequisicao } de quem age (normalmente `req.usuario`)
 * @param evento { acao, alvoUsuarioId?, recurso?, recursoId?, detalhes? }
 */
export async function registrar(ator, { acao, alvoUsuarioId, recurso, recursoId, detalhes }) {
  await auditoriaRepositorio.criar({
    usuarioId: ator?.id ?? null,
    alvoUsuarioId: alvoUsuarioId ?? null,
    acao,
    recurso: recurso ?? null,
    recursoId: recursoId ?? null,
    idRequisicao: ator?.idRequisicao ?? null,
    detalhes: detalhes ?? undefined
  });
}

export async function listar(consulta) {
  const filtros = {
    usuarioId: consulta.usuarioId,
    alvoUsuarioId: consulta.alvoUsuarioId,
    acao: consulta.acao,
    de: consulta.de,
    ate: consulta.ate
  };
  const [logs, total] = await Promise.all([
    auditoriaRepositorio.listar({ ...filtros, ...calcularDeslocamento(consulta) }),
    auditoriaRepositorio.contar(filtros)
  ]);
  return respostaPaginada(logs.map(serializarLogAuditoria), total, consulta);
}
