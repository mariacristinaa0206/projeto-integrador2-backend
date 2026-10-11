import {
  ACOES_AUDITORIA,
  LIMITES,
  ORIGENS_VINCULO,
  PAPEIS,
  PAPEIS_APOIO,
  STATUS_ALERTA,
  TIPOS_NOTIFICACAO
} from '../configuracao/constantes.js';
import * as alertaRepositorio from '../repositorios/alerta.repositorio.js';
import * as registroRepositorio from '../repositorios/registro.repositorio.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import * as vinculoRepositorio from '../repositorios/vinculo.repositorio.js';
import { serializarAlerta } from '../serializadores/alerta.serializador.js';
import { hojeISO, somarDias } from '../utilitarios/datas.js';
import { conflito, ErroApp, naoEncontrado } from '../utilitarios/erros.js';
import { detectarAlertas, JANELA_DETECCAO_DIAS } from '../utilitarios/indicadores.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';
import * as auditoriaServico from './auditoria.servico.js';
import * as notificacaoServico from './notificacao.servico.js';
import * as vinculoServico from './vinculo.servico.js';

/**
 * Alertas de acompanhamento (escopo: "padrões que indiquem possíveis situações de vulnerabilidade emocional").
 *
 * É TRIAGEM, não diagnóstico nem detecção de crise: sinaliza à equipe que vale olhar com cuidado.
 * Quem vê o alerta (psicólogo e pedagógico) vê QUEM é o aluno e um motivo GENÉRICO, nunca o conteúdo dos registros.
 * O psicólogo só passa a ver o diário ao assumir o alerta (o que cria um vínculo, avisa o aluno e fica auditado).
 */

/** Avalia os registros recentes do aluno e cria os alertas que se aplicam (sem repetir os que já estão vivos). */
export async function avaliarAluno(alunoId) {
  const hoje = hojeISO();
  const registros = await registroRepositorio.listarParaCalculo({
    usuarioId: alunoId,
    de: somarDias(hoje, -(JANELA_DETECCAO_DIAS - 1)),
    ate: hoje
  });

  for (const tipo of detectarAlertas(registros, hoje)) {
    const alerta = await alertaRepositorio.criarSeNaoExistir({ alunoId, tipo });
    if (alerta) await notificarEquipe(alerta);
  }
}

async function notificarEquipe(alerta) {
  const equipe = await usuarioRepositorio.listarAtivosPorPapeis(PAPEIS_APOIO, LIMITES.maxDestinatariosAlerta);
  await notificacaoServico.avisarVarios(
    equipe.map((pessoa) => pessoa.id),
    TIPOS_NOTIFICACAO.ALERTA_ACOMPANHAMENTO,
    alerta.id
  );
}

export async function listar(autenticado, consulta) {
  const filtros = { status: consulta.status, tipo: consulta.tipo, turma: consulta.turma };
  const [alertas, total] = await Promise.all([
    alertaRepositorio.listar({ ...filtros, ...calcularDeslocamento(consulta) }),
    alertaRepositorio.contar(filtros)
  ]);

  const vinculados =
    autenticado.papel === PAPEIS.PSICOLOGO
      ? await vinculoRepositorio.idsDeAlunosVinculados(autenticado.id, [...new Set(alertas.map((a) => a.alunoId))])
      : new Set();

  return respostaPaginada(
    alertas.map((alerta) => serializarAlerta(alerta, { podeVerRegistros: vinculados.has(alerta.alunoId) })),
    total,
    consulta
  );
}

/**
 * Assume o alerta (aberto → em acompanhamento). O psicólogo, ao assumir, ganha vínculo com o aluno (origem "alerta");
 * o pedagógico assume sem acesso ao diário. Se o vínculo falhar, a assunção é desfeita: nunca fica "meio assumido".
 */
export async function assumir(autenticado, id) {
  if (!(await alertaRepositorio.buscarPorId(id))) throw naoEncontrado('Alerta não encontrado.');

  // Alerta "em acompanhamento" SEM responsável (a conta de quem o assumiu foi excluída) volta a poder ser assumido.
  const alterados = await alertaRepositorio.transicionar({
    where: {
      id,
      OR: [{ status: STATUS_ALERTA.ABERTO }, { status: STATUS_ALERTA.EM_ACOMPANHAMENTO, responsavelId: null }]
    },
    dados: { status: STATUS_ALERTA.EM_ACOMPANHAMENTO, responsavelId: autenticado.id, assumidoEm: new Date() }
  });
  if (alterados === 0) throw conflito('Este alerta já está em acompanhamento ou foi resolvido.');

  const alerta = await alertaRepositorio.buscarPorId(id);
  const ehPsicologo = autenticado.papel === PAPEIS.PSICOLOGO;

  if (ehPsicologo) {
    try {
      await vinculoServico.garantirAtivo(
        { alunoId: alerta.alunoId, profissionalId: autenticado.id, origem: ORIGENS_VINCULO.ALERTA },
        autenticado
      );
    } catch (erro) {
      await alertaRepositorio.transicionar({
        where: { id, status: STATUS_ALERTA.EM_ACOMPANHAMENTO, responsavelId: autenticado.id },
        dados: { status: STATUS_ALERTA.ABERTO, responsavelId: null, assumidoEm: null }
      });
      throw erro;
    }
  }

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.ALERTA_ASSUMIDO,
    alvoUsuarioId: alerta.alunoId,
    recurso: 'alertas',
    recursoId: id
  });
  return serializarAlerta(alerta, { podeVerRegistros: ehPsicologo });
}

/**
 * Resolve o alerta. Quem o assumiu resolve o seu; um alerta ainda aberto (ou sem responsável, por exclusão da conta
 * de quem o assumira) qualquer membro da equipe pode encerrar. Alerta em acompanhamento de outra pessoa não é
 * resolvido por terceiros.
 */
export async function resolver(autenticado, id) {
  const alterados = await alertaRepositorio.transicionar({
    where: {
      id,
      OR: [
        { status: STATUS_ALERTA.ABERTO },
        { status: STATUS_ALERTA.EM_ACOMPANHAMENTO, responsavelId: autenticado.id },
        { status: STATUS_ALERTA.EM_ACOMPANHAMENTO, responsavelId: null }
      ]
    },
    dados: { status: STATUS_ALERTA.RESOLVIDO, resolvidoPor: autenticado.id, resolvidoEm: new Date() }
  });

  if (alterados === 0) {
    const existente = await alertaRepositorio.buscarPorId(id);
    if (!existente) throw naoEncontrado('Alerta não encontrado.');
    if (existente.status === STATUS_ALERTA.RESOLVIDO) throw conflito('Este alerta já foi resolvido.');
    throw new ErroApp(403, 'PROIBIDO', 'Este alerta está sob responsabilidade de outro profissional.');
  }

  const alerta = await alertaRepositorio.buscarPorId(id);
  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.ALERTA_RESOLVIDO,
    alvoUsuarioId: alerta.alunoId,
    recurso: 'alertas',
    recursoId: id
  });
  const podeVerRegistros =
    autenticado.papel === PAPEIS.PSICOLOGO && (await vinculoServico.possuiVinculoAtivo(autenticado.id, alerta.alunoId));
  return serializarAlerta(alerta, { podeVerRegistros });
}
