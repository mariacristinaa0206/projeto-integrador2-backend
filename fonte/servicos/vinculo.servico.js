import { ACOES_AUDITORIA, LIMITES, ORIGENS_VINCULO, PAPEIS, TIPOS_NOTIFICACAO } from '../configuracao/constantes.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import * as vinculoRepositorio from '../repositorios/vinculo.repositorio.js';
import { serializarVinculo } from '../serializadores/vinculo.serializador.js';
import { conflito, naoEncontrado, requisicaoInvalida } from '../utilitarios/erros.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';
import * as auditoriaServico from './auditoria.servico.js';
import * as notificacaoServico from './notificacao.servico.js';

/**
 * Vínculo = o psicólogo pode ver os registros emocionais de UM aluno. Sem vínculo ativo, o diário é inacessível.
 * Há três portas, todas gravadas com a origem e auditadas:
 *   - agendamento: o próprio aluno marca sessão com um psicólogo E escolhe compartilhar (sempre opt-in);
 *   - alerta: o psicólogo assume um alerta de acompanhamento;
 *   - designação: a escola (administrador/pedagógico) designa o psicólogo.
 * Sempre que o acesso começa por outra pessoa que não o aluno, o aluno é avisado. O aluno pode encerrar a qualquer momento.
 */

/** Base de toda autorização do psicólogo sobre os registros do aluno. Sem vínculo: 404 (não revela quem existe). */
export async function exigirAlunoVinculado(profissionalId, alunoId) {
  const vinculo = await vinculoRepositorio.buscarAtivo(alunoId, profissionalId);
  if (!vinculo) throw naoEncontrado('Aluno não encontrado entre os seus acompanhados.');
  return vinculo;
}

export async function possuiVinculoAtivo(profissionalId, alunoId) {
  return Boolean(await vinculoRepositorio.buscarAtivo(alunoId, profissionalId));
}

/**
 * Garante o vínculo ativo do par. `ator` é quem causou (para auditoria e para decidir se o aluno é avisado).
 * Devolve `{ vinculo, novo }`.
 */
export async function garantirAtivo({ alunoId, profissionalId, origem }, ator) {
  const existente = await vinculoRepositorio.buscarAtivo(alunoId, profissionalId);
  if (existente) return { vinculo: existente, novo: false };

  if ((await vinculoRepositorio.contarAtivosDoProfissional(profissionalId)) >= LIMITES.maxVinculosPorProfissional) {
    throw conflito('Este profissional atingiu o limite de alunos acompanhados.');
  }

  const resultado = await vinculoRepositorio.garantirAtivo({ alunoId, profissionalId, origem, criadoPor: ator.id });

  if (resultado.novo) {
    await auditoriaServico.registrar(ator, {
      acao: ACOES_AUDITORIA.VINCULO_CRIADO,
      alvoUsuarioId: alunoId,
      recurso: 'vinculos',
      recursoId: resultado.vinculo.id,
      detalhes: { origem, profissionalId }
    });
    // Transparência: o aluno sabe quando alguém passa a ver o diário, a menos que tenha sido ele mesmo a autorizar.
    if (ator.id !== alunoId) {
      await notificacaoServico.avisar(alunoId, TIPOS_NOTIFICACAO.ACOMPANHAMENTO_INICIADO, resultado.vinculo.id);
    }
  }
  return resultado;
}

/** A escola designa um psicólogo para acompanhar os registros de um aluno. */
export async function designar(autenticado, { alunoId, profissionalId }) {
  const aluno = await usuarioRepositorio.buscarAlunoAtivo(alunoId);
  if (!aluno) throw naoEncontrado('Aluno não encontrado.');

  const psicologo = await usuarioRepositorio.buscarAtivoPorPapeis(profissionalId, [PAPEIS.PSICOLOGO]);
  if (!psicologo) {
    throw requisicaoInvalida('Dados inválidos.', [
      { campo: 'corpo.profissionalId', mensagem: 'Informe um psicólogo ativo.' }
    ]);
  }

  const { vinculo } = await garantirAtivo({ alunoId, profissionalId, origem: ORIGENS_VINCULO.DESIGNACAO }, autenticado);
  return serializarVinculo(await vinculoRepositorio.buscarPorId(vinculo.id));
}

/**
 * Lista. Aluno vê quem pode ver os seus registros; psicólogo vê os seus alunos; administrador e pedagógico
 * podem filtrar por aluno/profissional.
 */
export async function listar(autenticado, consulta) {
  const filtros = { status: consulta.status };
  if (autenticado.papel === PAPEIS.ALUNO) filtros.alunoId = autenticado.id;
  else if (autenticado.papel === PAPEIS.PSICOLOGO) filtros.profissionalId = autenticado.id;
  else {
    filtros.alunoId = consulta.alunoId;
    filtros.profissionalId = consulta.profissionalId;
  }

  const [vinculos, total] = await Promise.all([
    vinculoRepositorio.listar({ ...filtros, ...calcularDeslocamento(consulta) }),
    vinculoRepositorio.contar(filtros)
  ]);
  return respostaPaginada(vinculos.map(serializarVinculo), total, consulta);
}

/** Encerra o acesso. O aluno e o psicólogo encerram o próprio; administrador e pedagógico, qualquer um. */
export async function encerrar(autenticado, id) {
  const vinculo = await vinculoRepositorio.buscarPorId(id);
  const gestao = [PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO].includes(autenticado.papel);
  const ehParte = vinculo && (vinculo.alunoId === autenticado.id || vinculo.profissionalId === autenticado.id);
  if (!vinculo || !(gestao || ehParte)) throw naoEncontrado('Vínculo não encontrado.');

  const alterados = await vinculoRepositorio.encerrar(id);
  if (alterados === 0) throw conflito('Este vínculo já foi encerrado.');

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.VINCULO_ENCERRADO,
    alvoUsuarioId: vinculo.alunoId,
    recurso: 'vinculos',
    recursoId: id,
    detalhes: { profissionalId: vinculo.profissionalId }
  });

  return serializarVinculo(await vinculoRepositorio.buscarPorId(id));
}
