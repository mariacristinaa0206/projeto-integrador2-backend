import {
  EMOCOES,
  INDICADORES,
  INTENSIDADES,
  LIMITES,
  REGRAS_ALERTA,
  TIPOS_ALERTA,
  VALENCIA_NEGATIVA_MAXIMA
} from '../configuracao/constantes.js';
import { somarDias } from './datas.js';

/**
 * Cálculos puros (sem banco) sobre registros emocionais. Um "registro" aqui é { dia: 'AAAA-MM-DD', emocao, intensidade }.
 * Ficam isolados para as regras de humor, tendência e alerta poderem ser lidas e conferidas sem o resto do sistema.
 */

// Variação mínima do humor médio para chamar de melhora ou queda entre dois meses.
const LIMIAR_TENDENCIA = 0.5;

export const valenciaDe = (emocao) => EMOCOES[emocao].valencia;

/** Emoção "desconfortável": ansioso, estressado, irritado, com medo, triste, muito triste. */
export const ehDesconfortavel = (emocao) => valenciaDe(emocao) <= VALENCIA_NEGATIVA_MAXIMA;

export const arredondar = (numero, casas = 2) => {
  const fator = 10 ** casas;
  return Math.round(numero * fator) / fator;
};

/** Humor médio (1 a 5) ou null sem registros. */
export function mediaHumor(registros) {
  if (registros.length === 0) return null;
  const soma = registros.reduce((total, registro) => total + valenciaDe(registro.emocao), 0);
  return arredondar(soma / registros.length);
}

export function agruparPorDia(registros) {
  const dias = new Map();
  for (const registro of registros) {
    if (!dias.has(registro.dia)) dias.set(registro.dia, []);
    dias.get(registro.dia).push(registro);
  }
  return dias;
}

/** Um ponto por dia com registro, em ordem cronológica. */
export function serieDiaria(registros) {
  return [...agruparPorDia(registros).entries()]
    .sort(([diaA], [diaB]) => (diaA < diaB ? -1 : 1))
    .map(([dia, doDia]) => ({ dia, registros: doDia.length, humorMedio: mediaHumor(doDia) }));
}

/** Contagem por valor de um campo, já com todas as opções (zeradas) para o gráfico não "sumir" categorias. */
export function distribuicao(registros, campo, opcoes) {
  const contagem = Object.fromEntries(opcoes.map((opcao) => [opcao, 0]));
  for (const registro of registros) contagem[registro[campo]] += 1;
  return contagem;
}

export const distribuicaoPorEmocao = (registros) => distribuicao(registros, 'emocao', Object.keys(EMOCOES));
export const distribuicaoPorIntensidade = (registros) =>
  distribuicao(registros, 'intensidade', Object.values(INTENSIDADES));

/** Ansiedade, estresse e tristeza do mês: quantos registros, em quantos dias e quantos com intensidade alta. */
export function resumoPorIndicador(registros) {
  const total = registros.length;
  return Object.fromEntries(
    Object.entries(INDICADORES).map(([nome, emocoes]) => {
      const doIndicador = registros.filter((registro) => emocoes.includes(registro.emocao));
      return [
        nome,
        {
          registros: doIndicador.length,
          diasComRegistro: new Set(doIndicador.map((registro) => registro.dia)).size,
          intensidadeAlta: doIndicador.filter((registro) => registro.intensidade === INTENSIDADES.ALTA).length,
          percentualDosRegistros: total === 0 ? 0 : arredondar((doIndicador.length / total) * 100, 1)
        }
      ];
    })
  );
}

/** 'melhora' | 'estavel' | 'queda' | 'sem_dados' (comparação do humor médio entre dois períodos). */
export function classificarTendencia(humorAtual, humorAnterior) {
  if (humorAtual === null || humorAnterior === null) return 'sem_dados';
  const diferenca = humorAtual - humorAnterior;
  if (diferenca >= LIMIAR_TENDENCIA) return 'melhora';
  if (diferenca <= -LIMIAR_TENDENCIA) return 'queda';
  return 'estavel';
}

/**
 * Relatório emocional de um mês (RF03). `registros` e `registrosAnteriores` já vêm filtrados por período.
 * Texto do aviso fixo: os indicadores acompanham o bem-estar, não diagnosticam.
 */
export function montarRelatorioEmocional({ periodo, registros, registrosAnteriores }) {
  const humorMedio = mediaHumor(registros);
  const humorMedioAnterior = mediaHumor(registrosAnteriores);
  return {
    periodo,
    totalRegistros: registros.length,
    diasComRegistro: new Set(registros.map((registro) => registro.dia)).size,
    humorMedio,
    humorMedioMesAnterior: humorMedioAnterior,
    variacaoHumor: humorMedio !== null && humorMedioAnterior !== null ? arredondar(humorMedio - humorMedioAnterior) : null,
    tendencia: classificarTendencia(humorMedio, humorMedioAnterior),
    distribuicaoPorEmocao: distribuicaoPorEmocao(registros),
    distribuicaoPorIntensidade: distribuicaoPorIntensidade(registros),
    indicadores: resumoPorIndicador(registros),
    serieDiaria: serieDiaria(registros),
    aviso:
      'Resumo de acompanhamento do bem-estar emocional, feito a partir dos registros do próprio usuário. ' +
      'Não é diagnóstico nem substitui a avaliação de um profissional de saúde.'
  };
}

/**
 * Padrões que merecem a atenção da equipe (escopo: alertas de possível vulnerabilidade emocional).
 * Recebe os registros dos últimos dias (a janela de 14 dias que termina em `hoje`) e devolve os tipos de alerta
 * que se aplicam. Quem chama decide o que fazer (criar o alerta, não repetir um que já está aberto...).
 */
export function detectarAlertas(registros, hoje) {
  const alertas = [];
  const porDia = agruparPorDia(registros);

  // 1. Dias seguidos desconfortáveis: hoje e os (N-1) dias anteriores têm registro e média baixa.
  let seguidos = 0;
  for (let i = 0; i < REGRAS_ALERTA.diasSequenciaNegativa; i += 1) {
    const doDia = porDia.get(somarDias(hoje, -i));
    const media = doDia ? mediaHumor(doDia) : null;
    if (media === null || media > REGRAS_ALERTA.limiarDiaNegativo) break;
    seguidos += 1;
  }
  if (seguidos >= REGRAS_ALERTA.diasSequenciaNegativa) alertas.push(TIPOS_ALERTA.SEQUENCIA_NEGATIVA);

  // 2. Vários registros desconfortáveis de intensidade alta na semana.
  const inicioJanela = somarDias(hoje, -(REGRAS_ALERTA.janelaIntensidadeAltaDias - 1));
  const intensosNaSemana = registros.filter(
    (registro) =>
      registro.dia >= inicioJanela &&
      registro.dia <= hoje &&
      registro.intensidade === INTENSIDADES.ALTA &&
      ehDesconfortavel(registro.emocao)
  );
  if (intensosNaSemana.length >= REGRAS_ALERTA.minRegistrosIntensidadeAlta) {
    alertas.push(TIPOS_ALERTA.INTENSIDADE_ALTA_RECORRENTE);
  }

  // 3. Queda do humor médio: últimos 7 dias contra os 7 anteriores (com registros suficientes nos dois).
  const janela = REGRAS_ALERTA.janelaQuedaDias;
  const inicioRecente = somarDias(hoje, -(janela - 1));
  const inicioAnterior = somarDias(hoje, -(2 * janela - 1));
  const recentes = registros.filter((registro) => registro.dia >= inicioRecente && registro.dia <= hoje);
  const anteriores = registros.filter((registro) => registro.dia >= inicioAnterior && registro.dia < inicioRecente);
  if (
    recentes.length >= REGRAS_ALERTA.minRegistrosPorJanelaQueda &&
    anteriores.length >= REGRAS_ALERTA.minRegistrosPorJanelaQueda &&
    mediaHumor(anteriores) - mediaHumor(recentes) >= REGRAS_ALERTA.quedaMinima
  ) {
    alertas.push(TIPOS_ALERTA.QUEDA_DE_HUMOR);
  }

  return alertas;
}

/** Quantos dias para trás o detector precisa enxergar. */
export const JANELA_DETECCAO_DIAS = 2 * REGRAS_ALERTA.janelaQuedaDias;

/**
 * Resume contagens já agregadas pelo banco ({ emocao: registros }) no mesmo formato do relatório individual:
 * total, humor médio, distribuição por emoção e os indicadores de ansiedade, estresse e tristeza.
 */
export function resumirContagensPorEmocao(contagens) {
  const distribuicaoPorEmocao = Object.fromEntries(Object.keys(EMOCOES).map((emocao) => [emocao, contagens[emocao] ?? 0]));
  const registros = Object.values(distribuicaoPorEmocao).reduce((soma, n) => soma + n, 0);
  const somaHumor = Object.entries(distribuicaoPorEmocao).reduce((soma, [emocao, n]) => soma + valenciaDe(emocao) * n, 0);

  const indicadores = Object.fromEntries(
    Object.entries(INDICADORES).map(([nome, emocoes]) => {
      const total = emocoes.reduce((soma, emocao) => soma + distribuicaoPorEmocao[emocao], 0);
      return [nome, { registros: total, percentualDosRegistros: registros === 0 ? 0 : arredondar((total / registros) * 100, 1) }];
    })
  );

  return {
    registros,
    humorMedio: registros === 0 ? null : arredondar(somaHumor / registros),
    distribuicaoPorEmocao,
    indicadores
  };
}

/**
 * Anonimato dos indicadores coletivos: um grupo só mostra números se pelo menos `minimoAlunosPorGrupo`
 * alunos contribuíram. Grupo SEM nenhum registro não esconde nada (não há o que vazar) e fica visível.
 * Se exatamente UM grupo ficar oculto, o menor dos visíveis (com dados) também é ocultado: sem isso, bastaria
 * subtrair os visíveis do total para descobrir os números do oculto.
 * Cada grupo entra como { alunosComRegistro, ... } e sai com `suprimido`.
 */
export function aplicarAnonimato(grupos) {
  const minimo = LIMITES.minimoAlunosPorGrupo;
  const marcados = grupos.map((grupo) => ({
    ...grupo,
    suprimido: grupo.alunosComRegistro > 0 && grupo.alunosComRegistro < minimo
  }));
  const ocultos = marcados.filter((grupo) => grupo.suprimido);
  if (ocultos.length === 1) {
    const visiveisComDados = marcados.filter((grupo) => !grupo.suprimido && grupo.alunosComRegistro > 0);
    if (visiveisComDados.length > 0) {
      const menor = visiveisComDados.reduce((a, b) => (b.alunosComRegistro < a.alunosComRegistro ? b : a));
      menor.suprimido = true;
    }
  }
  return marcados;
}
