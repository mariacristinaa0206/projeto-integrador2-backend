import {
  INTENSIDADES,
  LIMITES,
  PAPEIS,
  PAPEIS_QUE_REGISTRAM_EMOCAO,
  STATUS_ALERTA,
  STATUS_SESSAO,
  STATUS_VINCULO
} from '../configuracao/constantes.js';
import * as alertaRepositorio from '../repositorios/alerta.repositorio.js';
import * as conversaRepositorio from '../repositorios/conversa.repositorio.js';
import * as metaRepositorio from '../repositorios/meta.repositorio.js';
import * as notificacaoRepositorio from '../repositorios/notificacao.repositorio.js';
import * as painelRepositorio from '../repositorios/painel.repositorio.js';
import * as registroRepositorio from '../repositorios/registro.repositorio.js';
import * as sessaoRepositorio from '../repositorios/sessao.repositorio.js';
import * as vinculoRepositorio from '../repositorios/vinculo.repositorio.js';
import { serializarSessao } from '../serializadores/sessao.serializador.js';
import { dataParaISO, hojeISO, intervaloDoMes, mesAtual, somarDias } from '../utilitarios/datas.js';
import { arredondar, aplicarAnonimato, mediaHumor, resumirContagensPorEmocao, serieDiaria } from '../utilitarios/indicadores.js';
import * as estatisticaServico from './estatistica.servico.js';

const AVISO_COLETIVO =
  'Indicadores coletivos de acompanhamento do bem-estar, sem identificar nenhum aluno. ' +
  `Recortes com menos de ${LIMITES.minimoAlunosPorGrupo} alunos registrando têm os números ocultos. ` +
  'Não constituem diagnóstico.';

// ---------------------------------------------------------------------------------------------
// Indicadores coletivos (escopo: "painéis com indicadores emocionais gerais, sem expor dados sensíveis individuais")
// ---------------------------------------------------------------------------------------------

const somar = (itens, campo) => itens.reduce((total, item) => total + item[campo], 0);

/** Une as contagens por emoção de uma lista de linhas { grupo, emocao, registros } em { grupo: { emocao: n } }. */
function agruparEmocoes(linhas) {
  const mapa = new Map();
  for (const { grupo, emocao, registros } of linhas) {
    if (!mapa.has(grupo)) mapa.set(grupo, {});
    mapa.get(grupo)[emocao] = registros;
  }
  return mapa;
}

/**
 * Monta os grupos de uma dimensão (turma ou nível): matriculados + quem registrou + resumo emocional,
 * já com a regra de anonimato aplicada. Grupo oculto mostra só a identificação e quantos alunos estão matriculados.
 */
function montarGrupos({ campo, matriculados, totais, emocoes }) {
  const totaisPorGrupo = new Map(totais.map((linha) => [linha.grupo, linha]));
  const emocoesPorGrupo = agruparEmocoes(emocoes);
  const chaves = [...new Set([...matriculados.keys(), ...totaisPorGrupo.keys()])].sort();

  const grupos = chaves.map((chave) => {
    const total = totaisPorGrupo.get(chave);
    const alunosMatriculados = matriculados.get(chave) ?? 0;
    return {
      [campo]: chave,
      alunosMatriculados,
      alunosComRegistro: total?.alunos ?? 0,
      participacaoPercentual: alunosMatriculados === 0 ? 0 : arredondar(((total?.alunos ?? 0) / alunosMatriculados) * 100, 1),
      ...resumirContagensPorEmocao(emocoesPorGrupo.get(chave) ?? {})
    };
  });

  return aplicarAnonimato(grupos).map((grupo) =>
    grupo.suprimido
      ? { [campo]: grupo[campo], alunosMatriculados: grupo.alunosMatriculados, suprimido: true }
      : grupo
  );
}

export async function indicadoresColetivos({ mes, turma, nivelEnsino } = {}) {
  const periodo = intervaloDoMes(mes ?? mesAtual());
  const filtros = { inicio: periodo.inicio, fim: periodo.fim, turma, nivelEnsino };

  const [matriculadosBrutos, totais, porEmocaoEIntensidade, totaisTurma, emocoesTurma, totaisNivel, emocoesNivel, totaisDia, emocoesDia, alertas] =
    await Promise.all([
      painelRepositorio.contarMatriculados({ turma, nivelEnsino }),
      painelRepositorio.totais(filtros),
      painelRepositorio.porEmocaoEIntensidade(filtros),
      painelRepositorio.totaisPorGrupo('turma', filtros),
      painelRepositorio.emocoesPorGrupo('turma', filtros),
      painelRepositorio.totaisPorGrupo('nivelEnsino', filtros),
      painelRepositorio.emocoesPorGrupo('nivelEnsino', filtros),
      painelRepositorio.totaisPorGrupo('dia', filtros),
      painelRepositorio.emocoesPorGrupo('dia', filtros),
      alertaRepositorio.contarPorStatus()
    ]);

  const matriculadosPorTurma = new Map();
  const matriculadosPorNivel = new Map();
  for (const linha of matriculadosBrutos) {
    matriculadosPorTurma.set(linha.turma, (matriculadosPorTurma.get(linha.turma) ?? 0) + linha._count._all);
    matriculadosPorNivel.set(linha.nivelEnsino, (matriculadosPorNivel.get(linha.nivelEnsino) ?? 0) + linha._count._all);
  }
  const alunosMatriculados = somar(matriculadosBrutos.map((linha) => ({ n: linha._count._all })), 'n');

  const base = {
    periodo,
    filtros: { turma: turma ?? null, nivelEnsino: nivelEnsino ?? null },
    alunosMatriculados,
    situacaoAtualDosAlertas: alertas,
    aviso: AVISO_COLETIVO
  };

  // Poucos alunos no recorte inteiro: nada é mostrado (qualquer número identificaria o comportamento de poucas pessoas).
  if (totais.alunos > 0 && totais.alunos < LIMITES.minimoAlunosPorGrupo) {
    return {
      ...base,
      suprimido: true,
      mensagem: `Menos de ${LIMITES.minimoAlunosPorGrupo} alunos registraram neste recorte: os números ficam ocultos para proteger a privacidade.`,
      alunosComRegistro: null,
      participacaoPercentual: null,
      geral: null,
      porNivelEnsino: [],
      porTurma: [],
      serieDiaria: []
    };
  }

  const contagemPorEmocao = {};
  const contagemPorIntensidade = Object.fromEntries(Object.values(INTENSIDADES).map((i) => [i, 0]));
  for (const linha of porEmocaoEIntensidade) {
    contagemPorEmocao[linha.emocao] = (contagemPorEmocao[linha.emocao] ?? 0) + linha.registros;
    contagemPorIntensidade[linha.intensidade] += linha.registros;
  }

  // Série diária: dia com poucos alunos fica oculto (e, se for só um, o menor dos outros também; ver aplicarAnonimato).
  const emocoesPorDia = agruparEmocoes(emocoesDia);
  const serie = aplicarAnonimato(
    totaisDia.map((linha) => ({
      dia: linha.grupo,
      alunosComRegistro: linha.alunos,
      ...resumirContagensPorEmocao(emocoesPorDia.get(linha.grupo) ?? {})
    }))
  ).map((ponto) =>
    ponto.suprimido
      ? { dia: ponto.dia, suprimido: true }
      : { dia: ponto.dia, registros: ponto.registros, alunosComRegistro: ponto.alunosComRegistro, humorMedio: ponto.humorMedio }
  );

  return {
    ...base,
    suprimido: false,
    alunosComRegistro: totais.alunos,
    participacaoPercentual: alunosMatriculados === 0 ? 0 : arredondar((totais.alunos / alunosMatriculados) * 100, 1),
    geral: {
      ...resumirContagensPorEmocao(contagemPorEmocao),
      distribuicaoPorIntensidade: contagemPorIntensidade
    },
    porNivelEnsino: montarGrupos({ campo: 'nivelEnsino', matriculados: matriculadosPorNivel, totais: totaisNivel, emocoes: emocoesNivel }),
    porTurma: montarGrupos({ campo: 'turma', matriculados: matriculadosPorTurma, totais: totaisTurma, emocoes: emocoesTurma }),
    serieDiaria: serie
  };
}

// ---------------------------------------------------------------------------------------------
// Painel inicial de cada pessoa (uma chamada traz o que a tela inicial precisa)
// ---------------------------------------------------------------------------------------------

/** Humor da última semana e se já registrou hoje: para quem acompanha o próprio estado emocional. */
async function blocoDeAcompanhamentoPessoal(autenticado) {
  const hoje = hojeISO();
  const [registros, ultimo, metasEmAndamento] = await Promise.all([
    registroRepositorio.listarParaCalculo({ usuarioId: autenticado.id, de: somarDias(hoje, -6), ate: hoje }),
    registroRepositorio.buscarUltimo(autenticado.id),
    metaRepositorio.contarEmAndamento(autenticado.id)
  ]);
  return {
    registrouHoje: ultimo ? dataParaISO(ultimo.dia) === hoje : false,
    ultimoRegistro: ultimo
      ? { emocao: ultimo.emocao, intensidade: ultimo.intensidade, dia: dataParaISO(ultimo.dia), registradoEm: ultimo.registradoEm.toISOString() }
      : null,
    ultimosSeteDias: { humorMedio: mediaHumor(registros), serieDiaria: serieDiaria(registros) },
    metasEmAndamento
  };
}

export async function meuPainel(autenticado) {
  const { papel } = autenticado;
  const [notificacoesNaoLidas, conversasNaoLidas] = await Promise.all([
    notificacaoRepositorio.contarNaoLidas(autenticado.id),
    papel === PAPEIS.ALUNO || papel === PAPEIS.PSICOLOGO || papel === PAPEIS.PEDAGOGICO
      ? conversaRepositorio.contarNaoLidasTotal(autenticado.id)
      : 0
  ]);

  const painel = { papel, notificacoesNaoLidas, conversasNaoLidas };

  if (PAPEIS_QUE_REGISTRAM_EMOCAO.includes(papel)) Object.assign(painel, await blocoDeAcompanhamentoPessoal(autenticado));

  if (papel === PAPEIS.ALUNO) {
    const [sessoes, quemVeMeusRegistros] = await Promise.all([
      sessaoRepositorio.listarProximasDoAluno(autenticado.id, 3),
      vinculoRepositorio.contar({ alunoId: autenticado.id, status: STATUS_VINCULO.ATIVO })
    ]);
    painel.proximasSessoes = sessoes.map((sessao) => serializarSessao(sessao, null));
    painel.profissionaisComAcessoAosRegistros = quemVeMeusRegistros;
  }

  if (papel === PAPEIS.PSICOLOGO || papel === PAPEIS.PEDAGOGICO) {
    const [alertas, sessoesPendentes, sessoes] = await Promise.all([
      alertaRepositorio.contarPorStatus(),
      sessaoRepositorio.contarPorStatusDoProfissional(autenticado.id, STATUS_SESSAO.SOLICITADA),
      sessaoRepositorio.listarProximasDoProfissional(autenticado.id, 5)
    ]);
    painel.alertas = {
      abertos: alertas[STATUS_ALERTA.ABERTO],
      emAcompanhamento: alertas[STATUS_ALERTA.EM_ACOMPANHAMENTO]
    };
    painel.sessoesAguardandoResposta = sessoesPendentes;
    painel.proximasSessoes = sessoes.map((sessao) => serializarSessao(sessao, null));
    if (papel === PAPEIS.PSICOLOGO) {
      painel.alunosAcompanhados = await vinculoRepositorio.contarAtivosDoProfissional(autenticado.id);
    }
  }

  if (papel === PAPEIS.ADMINISTRADOR) painel.usuarios = await estatisticaServico.usuariosPorPerfil();

  return painel;
}
