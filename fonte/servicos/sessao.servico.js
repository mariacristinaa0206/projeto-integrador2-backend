import {
  LIMITES,
  ORIGENS_VINCULO,
  PAPEIS,
  PAPEIS_APOIO,
  REGRAS_SESSAO,
  STATUS_SESSAO,
  STATUS_SESSAO_QUE_OCUPAM,
  TIPOS_NOTIFICACAO
} from '../configuracao/constantes.js';
import { reservarId } from '../repositorios/ids.repositorio.js';
import * as sessaoRepositorio from '../repositorios/sessao.repositorio.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import { serializarProfissionalPublico } from '../serializadores/usuario.serializador.js';
import { serializarSessao } from '../serializadores/sessao.serializador.js';
import { cifrarTexto, decifrarTexto } from '../utilitarios/cifra.js';
import { contextoCifra } from '../utilitarios/contextoCifra.js';
import { instanteLocal, partesNoFuso, somarDias } from '../utilitarios/datas.js';
import { conflito, ehViolacaoDeUnicidade, naoEncontrado, regraDeNegocio, requisicaoInvalida } from '../utilitarios/erros.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';
import * as notificacaoServico from './notificacao.servico.js';
import * as vinculoServico from './vinculo.servico.js';

/**
 * Agendamento de sessões de acompanhamento (RF06). Blocos de 30 min, de segunda a sexta, 07:00–18:00 (Brasília).
 *
 *   solicitada (aluno) → confirmada | recusada (profissional) → concluída (profissional, depois do horário)
 *   solicitada | confirmada → cancelada (aluno ou profissional, antes do início)
 *
 * Cada mudança de status é um único UPDATE condicional à situação esperada: se outra requisição já mudou a sessão,
 * nada é alterado e a resposta é 409. O choque de horário é barrado pelo banco (índices únicos parciais).
 */

const MS_POR_MINUTO = 60_000;
const MS_POR_DIA = 24 * 60 * MS_POR_MINUTO;

const decifrarMotivo = (sessao) => decifrarTexto(sessao.motivo, contextoCifra.sessaoMotivo(sessao.id));
const comMotivo = (sessao) => serializarSessao(sessao, decifrarMotivo(sessao));

/** Profissionais de apoio ativos: com quem o aluno pode marcar sessão ou conversar. */
export async function listarProfissionais() {
  const profissionais = await usuarioRepositorio.listarAtivosPorPapeis(PAPEIS_APOIO, LIMITES.maxVinculosPorProfissional);
  return { itens: profissionais.map(serializarProfissionalPublico) };
}

async function carregarProfissional(id) {
  const profissional = await usuarioRepositorio.buscarAtivoPorPapeis(id, PAPEIS_APOIO);
  if (!profissional) throw naoEncontrado('Profissional não encontrado.');
  return profissional;
}

/** Confere se o horário cai na grade e dentro do prazo permitido. */
function validarHorario(inicio) {
  const foraDaGrade = () =>
    regraDeNegocio(
      `Horário fora da grade: sessões de ${REGRAS_SESSAO.duracaoMin} minutos, de segunda a sexta, entre ` +
        `${String(REGRAS_SESSAO.horaInicial).padStart(2, '0')}:00 e ${String(REGRAS_SESSAO.horaFinal).padStart(2, '0')}:00 (horário de Brasília).`
    );

  if (inicio.getUTCSeconds() !== 0 || inicio.getUTCMilliseconds() !== 0) throw foraDaGrade();

  const local = partesNoFuso(inicio);
  const minutoDoDia = local.hora * 60 + local.minuto;
  const primeiro = REGRAS_SESSAO.horaInicial * 60;
  const ultimo = REGRAS_SESSAO.horaFinal * 60 - REGRAS_SESSAO.duracaoMin;
  if (
    !REGRAS_SESSAO.diasUteis.includes(local.diaSemana) ||
    local.minuto % REGRAS_SESSAO.duracaoMin !== 0 ||
    minutoDoDia < primeiro ||
    minutoDoDia > ultimo
  ) {
    throw foraDaGrade();
  }

  const agora = Date.now();
  if (inicio.getTime() < agora + REGRAS_SESSAO.antecedenciaMinimaMin * MS_POR_MINUTO) {
    throw regraDeNegocio(`Marque com pelo menos ${REGRAS_SESSAO.antecedenciaMinimaMin} minutos de antecedência.`);
  }
  if (inicio.getTime() > agora + REGRAS_SESSAO.antecedenciaMaximaDias * MS_POR_DIA) {
    throw regraDeNegocio(`Só é possível marcar com até ${REGRAS_SESSAO.antecedenciaMaximaDias} dias de antecedência.`);
  }
}

/** Grade do dia com a situação de cada horário. Dia sem expediente (fim de semana) devolve lista vazia. */
export async function horariosDoDia(profissionalId, dataISO) {
  await carregarProfissional(profissionalId);

  const grade = [];
  for (let hora = REGRAS_SESSAO.horaInicial; hora < REGRAS_SESSAO.horaFinal; hora += 1) {
    for (let minuto = 0; minuto < 60; minuto += REGRAS_SESSAO.duracaoMin) grade.push(instanteLocal(dataISO, hora, minuto));
  }
  if (!REGRAS_SESSAO.diasUteis.includes(partesNoFuso(grade[0]).diaSemana)) return { data: dataISO, itens: [] };

  const ocupados = await sessaoRepositorio.listarOcupados(
    profissionalId,
    instanteLocal(dataISO, 0, 0),
    instanteLocal(somarDias(dataISO, 1), 0, 0)
  );
  const ocupadosEm = new Set(ocupados.map((sessao) => sessao.inicio.getTime()));

  const agora = Date.now();
  const itens = grade.map((inicio) => {
    const fora =
      inicio.getTime() < agora + REGRAS_SESSAO.antecedenciaMinimaMin * MS_POR_MINUTO ||
      inicio.getTime() > agora + REGRAS_SESSAO.antecedenciaMaximaDias * MS_POR_DIA;
    const ocupado = ocupadosEm.has(inicio.getTime());
    return {
      inicio: inicio.toISOString(),
      disponivel: !fora && !ocupado,
      motivoIndisponivel: ocupado ? 'ocupado' : fora ? 'fora_do_prazo' : null
    };
  });
  return { data: dataISO, itens };
}

/**
 * O aluno solicita a sessão. `compartilharRegistros` (opt-in, só psicólogo) cria o vínculo que permite ao psicólogo
 * ver o diário. A sessão é criada ANTES do vínculo: se algo falhar no meio, o aluno nunca compartilha sem ter a sessão.
 */
export async function solicitar(aluno, { profissionalId, inicio, motivo, compartilharRegistros }) {
  const profissional = await carregarProfissional(profissionalId);

  if (compartilharRegistros && profissional.papel !== PAPEIS.PSICOLOGO) {
    throw requisicaoInvalida('Dados inválidos.', [
      { campo: 'corpo.compartilharRegistros', mensagem: 'Só é possível compartilhar os registros com um psicólogo.' }
    ]);
  }
  validarHorario(inicio);

  const id = await reservarId('sessoes');
  let sessao;
  try {
    sessao = await sessaoRepositorio.criarRespeitandoLimite({
      id,
      alunoId: aluno.id,
      profissionalId: profissional.id,
      inicio,
      motivo: cifrarTexto(motivo, contextoCifra.sessaoMotivo(id)),
      limite: REGRAS_SESSAO.maxEmAbertoPorAluno
    });
  } catch (erro) {
    if (ehViolacaoDeUnicidade(erro)) throw conflito('Este horário não está mais disponível. Escolha outro.');
    throw erro;
  }
  if (!sessao) {
    throw conflito(
      `Você já tem ${REGRAS_SESSAO.maxEmAbertoPorAluno} sessões solicitadas ou confirmadas. Aguarde uma delas acontecer ou cancele alguma.`
    );
  }

  if (compartilharRegistros) {
    await vinculoServico.garantirAtivo(
      { alunoId: aluno.id, profissionalId: profissional.id, origem: ORIGENS_VINCULO.AGENDAMENTO },
      aluno
    );
  }

  await notificacaoServico.avisar(profissional.id, TIPOS_NOTIFICACAO.SESSAO_SOLICITADA, sessao.id);
  return comMotivo(sessao);
}

const ehProfissionalDeApoio = (autenticado) => PAPEIS_APOIO.includes(autenticado.papel);

/** Converte as datas AAAA-MM-DD do filtro em instantes (dia inteiro no horário de Brasília). */
function faixaDeInicio({ de, ate }) {
  return {
    inicioMinimo: de ? instanteLocal(de, 0, 0) : undefined,
    inicioMaximo: ate ? instanteLocal(somarDias(ate, 1), 0, 0) : undefined
  };
}

export async function listar(autenticado, consulta) {
  const filtros = { status: consulta.status, ...faixaDeInicio(consulta) };
  const ehApoio = ehProfissionalDeApoio(autenticado);

  const [sessoes, total] = await Promise.all(
    ehApoio
      ? [
          sessaoRepositorio.listarDoProfissional({ profissionalId: autenticado.id, ...filtros, ...calcularDeslocamento(consulta) }),
          sessaoRepositorio.contarDoProfissional({ profissionalId: autenticado.id, ...filtros })
        ]
      : [
          sessaoRepositorio.listarDoAluno({ alunoId: autenticado.id, ...filtros, ...calcularDeslocamento(consulta) }),
          sessaoRepositorio.contarDoAluno({ alunoId: autenticado.id, ...filtros })
        ]
  );
  return respostaPaginada(sessoes.map(comMotivo), total, consulta);
}

export async function obter(autenticado, id) {
  const sessao = await sessaoRepositorio.buscarDoParticipante(id, autenticado.id);
  if (!sessao) throw naoEncontrado('Sessão não encontrada.');
  return comMotivo(sessao);
}

/** Quando a troca atômica não alterou nada: a sessão não existe para esta pessoa (404) ou estava em outra situação (409). */
async function explicarFalha(autenticado, id, mensagem) {
  const sessao = await sessaoRepositorio.buscarDoParticipante(id, autenticado.id);
  if (!sessao) throw naoEncontrado('Sessão não encontrada.');
  throw conflito(`${mensagem} Situação atual da sessão: "${sessao.status}".`);
}

async function decidirComoProfissional(profissional, id, { para, tipoDeAviso }) {
  const alterados = await sessaoRepositorio.transicionar({
    where: { id, profissionalId: profissional.id, status: STATUS_SESSAO.SOLICITADA },
    dados: { status: para }
  });
  if (alterados === 0) await explicarFalha(profissional, id, 'Só é possível responder a solicitações pendentes.');

  const sessao = await sessaoRepositorio.buscarPorId(id);
  await notificacaoServico.avisar(sessao.alunoId, tipoDeAviso, id);
  return comMotivo(sessao);
}

export const confirmar = (profissional, id) =>
  decidirComoProfissional(profissional, id, { para: STATUS_SESSAO.CONFIRMADA, tipoDeAviso: TIPOS_NOTIFICACAO.SESSAO_CONFIRMADA });

export const recusar = (profissional, id) =>
  decidirComoProfissional(profissional, id, { para: STATUS_SESSAO.RECUSADA, tipoDeAviso: TIPOS_NOTIFICACAO.SESSAO_RECUSADA });

/** O aluno ou o profissional cancelam sessões solicitadas ou confirmadas que ainda não começaram. O outro é avisado. */
export async function cancelar(autenticado, id) {
  const alterados = await sessaoRepositorio.transicionar({
    where: {
      id,
      status: { in: STATUS_SESSAO_QUE_OCUPAM },
      inicio: { gt: new Date() },
      OR: [{ alunoId: autenticado.id }, { profissionalId: autenticado.id }]
    },
    dados: { status: STATUS_SESSAO.CANCELADA }
  });
  if (alterados === 0) {
    await explicarFalha(autenticado, id, 'Só é possível cancelar sessões solicitadas ou confirmadas que ainda não começaram.');
  }

  const sessao = await sessaoRepositorio.buscarPorId(id);
  const outraParte = sessao.alunoId === autenticado.id ? sessao.profissionalId : sessao.alunoId;
  await notificacaoServico.avisar(outraParte, TIPOS_NOTIFICACAO.SESSAO_CANCELADA, id);
  return comMotivo(sessao);
}

/** Só o profissional conclui, e só depois do horário de início. */
export async function concluir(profissional, id) {
  const alterados = await sessaoRepositorio.transicionar({
    where: { id, profissionalId: profissional.id, status: STATUS_SESSAO.CONFIRMADA, inicio: { lte: new Date() } },
    dados: { status: STATUS_SESSAO.CONCLUIDA }
  });
  if (alterados === 0) {
    await explicarFalha(profissional, id, 'Só é possível concluir sessões confirmadas cujo horário já começou.');
  }
  return comMotivo(await sessaoRepositorio.buscarPorId(id));
}
