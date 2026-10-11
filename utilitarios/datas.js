import { FUSO_HORARIO } from '../configuracao/constantes.js';

/**
 * O servidor roda em UTC, mas o "dia" do aluno é o de Brasília: um registro feito às 22h (01h UTC do dia
 * seguinte) precisa cair no dia certo. Tudo que é calendário passa por aqui.
 *
 * Datas "puras" (coluna DATE do Postgres) trafegam como texto 'AAAA-MM-DD' e, ao falar com o Prisma, viram
 * Date à meia-noite UTC: trabalhar sempre em UTC evita que a data "volte um dia" no fuso do servidor.
 */

const formatador = new Intl.DateTimeFormat('en-GB', {
  timeZone: FUSO_HORARIO,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short'
});

const DIAS_DA_SEMANA = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Componentes do instante no horário de Brasília. `diaSemana`: 1 = segunda … 7 = domingo. */
export function partesNoFuso(instante) {
  const partes = Object.fromEntries(formatador.formatToParts(instante).map((parte) => [parte.type, parte.value]));
  return {
    ano: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    hora: Number(partes.hour),
    minuto: Number(partes.minute),
    segundo: Number(partes.second),
    diaSemana: DIAS_DA_SEMANA[partes.weekday]
  };
}

const doisDigitos = (numero) => String(numero).padStart(2, '0');

/** Data local ('AAAA-MM-DD') de um instante. */
export function isoDoInstante(instante) {
  const { ano, mes, dia } = partesNoFuso(instante);
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

export const hojeISO = () => isoDoInstante(new Date());

export const mesAtual = () => hojeISO().slice(0, 7);

/** 'AAAA-MM-DD' → Date (meia-noite UTC). Quem chama já validou o formato. */
export const isoParaData = (iso) => new Date(`${iso}T00:00:00.000Z`);

export const dataParaISO = (data) => data.toISOString().slice(0, 10);

export const somarDias = (iso, dias) => dataParaISO(new Date(isoParaData(iso).getTime() + dias * MS_POR_DIA));

/** Dias entre duas datas (B - A). */
export const diferencaEmDias = (isoA, isoB) => Math.round((isoParaData(isoB) - isoParaData(isoA)) / MS_POR_DIA);

/** 'AAAA-MM-DD' → 'DD/MM/AAAA' (como o front exibe). */
export function isoParaBR(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Instante (UTC) em que o relógio de Brasília marca `hora:minuto` na data `iso`.
 * Corrige por tentativas em vez de assumir "UTC-3" fixo, para continuar certo se o horário de verão voltar.
 */
export function instanteLocal(iso, hora, minuto = 0) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const alvo = Date.UTC(ano, mes - 1, dia, hora, minuto);
  let palpite = alvo + 3 * 60 * 60 * 1000;
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const p = partesNoFuso(new Date(palpite));
    const obtido = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto);
    if (obtido === alvo) break;
    palpite += alvo - obtido;
  }
  return new Date(palpite);
}

/**
 * Limites de um DIA de Brasília como instantes UTC, para filtrar colunas de data E hora (criado_em, enviada_em...).
 * `de=2026-10-09` começa à meia-noite de Brasília (03:00 UTC), não à meia-noite UTC: às 22h do dia 9 em Brasília
 * já é dia 10 em UTC, e um filtro "hoje" em UTC perderia os eventos da noite.
 * O fim é EXCLUSIVO (início do dia seguinte), então o dia `ate` entra inteiro.
 */
export const inicioDoDia = (iso) => instanteLocal(iso, 0, 0);
export const inicioDoDiaSeguinte = (iso) => instanteLocal(somarDias(iso, 1), 0, 0);

/** 'AAAA-MM' → { mes, inicio: 'AAAA-MM-01', fim: último dia do mês }. */
export function intervaloDoMes(mes) {
  const [ano, numero] = mes.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(ano, numero, 0)).getUTCDate();
  return { mes, inicio: `${mes}-01`, fim: `${mes}-${doisDigitos(ultimoDia)}` };
}

export function mesAnterior(mes) {
  const [ano, numero] = mes.split('-').map(Number);
  const anterior = new Date(Date.UTC(ano, numero - 2, 1));
  return `${anterior.getUTCFullYear()}-${doisDigitos(anterior.getUTCMonth() + 1)}`;
}
