import { z } from 'zod';
import './mapaErros.js';
import { LIMITES } from '../configuracao/constantes.js';
import { dataParaISO, isoParaData } from '../utilitarios/datas.js';
import { limparEspacos } from '../utilitarios/texto.js';

// Caracteres de controle (inclui o NUL, que o Postgres recusaria com erro 500), exceto tabulação e quebra de linha.
const CARACTERE_DE_CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const semCaractereDeControle = (valor) => !CARACTERE_DE_CONTROLE.test(valor);
const MENSAGEM_CARACTERE_INVALIDO = 'Texto contém caracteres inválidos.';

/** Texto curto (uma linha): espaços colapsados, entre `minimo` e `maximo` caracteres. */
export const textoLimpo = (minimo, maximo, mensagemMinimo) =>
  z
    .string()
    .transform(limparEspacos)
    .pipe(z.string().min(minimo, mensagemMinimo).max(maximo).refine(semCaractereDeControle, MENSAGEM_CARACTERE_INVALIDO));

/** Texto livre (várias linhas): preserva as quebras de linha, só apara as pontas. */
export const textoLivre = (minimo, maximo, mensagemMinimo) =>
  z
    .string()
    .transform((valor) => valor.replace(/\r\n?/g, '\n').trim())
    .pipe(z.string().min(minimo, mensagemMinimo).max(maximo).refine(semCaractereDeControle, MENSAGEM_CARACTERE_INVALIDO));

/** Campo opcional em que vazio/branco/null significa "sem valor" (resultado: undefined, null ou o texto). */
export const opcionalVazioComoNulo = (esquemaTexto) =>
  z.preprocess((valor) => (typeof valor === 'string' && valor.trim() === '' ? null : valor), esquemaTexto.nullable().optional());

export const nomeEsquema = textoLimpo(2, LIMITES.maxCaracteresNome, 'Informe o nome completo.');

export const emailEsquema = z
  .string()
  .trim()
  .toLowerCase()
  .max(LIMITES.maxCaracteresEmail)
  .email('E-mail inválido.');

/** Turma como a escola escreve ("3º A", "5B"): espaços colapsados e maiúsculas, para agrupar sem duplicar. */
export const turmaEsquema = textoLimpo(1, LIMITES.maxCaracteresTurma, 'Informe a turma.').transform((valor) =>
  valor.toUpperCase()
);

/**
 * Senha NOVA (cadastro e troca): tamanho, limite do bcrypt e ao menos uma letra e um número (regra de negócio do
 * projeto: "quantidade mínima de caracteres e combinação alfanumérica"). No login a regra não se aplica:
 * só limitamos o tamanho para não processar lixo.
 */
export const senhaNovaEsquema = z
  .string()
  .min(LIMITES.senhaMinima, `A senha deve ter ao menos ${LIMITES.senhaMinima} caracteres.`)
  .refine(
    (valor) => Buffer.byteLength(valor) <= LIMITES.senhaMaximaBytes,
    `A senha deve ter no máximo ${LIMITES.senhaMaximaBytes} bytes.`
  )
  .refine((valor) => /\p{L}/u.test(valor) && /\d/.test(valor), 'A senha deve conter ao menos uma letra e um número.');

export const senhaAtualEsquema = z.string().min(1, 'Informe a senha atual.').max(128);

/**
 * Data pura. Aceita AAAA-MM-DD (padrão da API) e DD/MM/AAAA (como o front digita) e devolve sempre 'AAAA-MM-DD'.
 * Os dois formatos não se confundem: um começa com ano de 4 dígitos, o outro termina com ele.
 */
export const dataEsquema = z
  .string()
  .trim()
  .transform((valor, ctx) => {
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
    const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
    if (!iso) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use a data no formato DD/MM/AAAA ou AAAA-MM-DD.' });
      return z.NEVER;
    }
    const data = isoParaData(iso);
    if (Number.isNaN(data.getTime()) || dataParaISO(data) !== iso) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data inválida.' });
      return z.NEVER;
    }
    if (data.getUTCFullYear() < 2000 || data.getUTCFullYear() > 2100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data fora do intervalo permitido.' });
      return z.NEVER;
    }
    return iso;
  });

/** Mês no formato AAAA-MM (o relatório mensal e o painel coletivo trabalham por mês). */
export const mesEsquema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o mês no formato AAAA-MM.')
  .refine((valor) => Number(valor.slice(0, 4)) >= 2000 && Number(valor.slice(0, 4)) <= 2100, 'Mês fora do intervalo permitido.');

/** Instante com fuso (ISO 8601), ex.: 2026-10-12T14:00:00-03:00 ou ...Z. Devolve Date. */
export const instanteEsquema = z
  .string()
  .trim()
  .datetime({ offset: true })
  .transform((valor) => new Date(valor))
  .refine((data) => !Number.isNaN(data.getTime()), 'Data e hora inválidas.');

/** Link de mídia: somente https, sem espaços. Rejeita javascript:, data:, http: e afins. */
export const urlHttpsEsquema = z
  .string()
  .trim()
  .max(LIMITES.maxCaracteresUrl)
  .refine((valor) => {
    try {
      const url = new URL(valor);
      return url.protocol === 'https:' && url.hostname.includes('.') && !/\s/.test(valor);
    } catch {
      return false;
    }
  }, 'Informe um link válido que comece com https://.');

// ---- Identificadores, parâmetros de rota e de consulta (query string) ----

/** Identificador numérico vindo do CORPO JSON (número, não texto). */
export const idCorpoEsquema = z.number().int().positive().max(2_147_483_647, 'Identificador inválido.');

/** Identificador numérico vindo da URL (texto que vira número). */
export const idEsquema = z
  .string()
  .regex(/^\d{1,10}$/, 'Identificador inválido.')
  .transform(Number)
  .pipe(z.number().int().positive().max(2_147_483_647, 'Identificador inválido.'));

/** Query string vazia (?campo=) equivale a campo ausente. */
export const vazioComoAusente = (esquema) => z.preprocess((valor) => (valor === '' ? undefined : valor), esquema);

export const textoDeConsulta = (maximo) =>
  vazioComoAusente(z.string().trim().max(maximo).refine(semCaractereDeControle, MENSAGEM_CARACTERE_INVALIDO).optional());

/** Verdadeiro/falso vindo da query string ("true" / "false"). */
export const booleanoDeConsulta = vazioComoAusente(
  z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional()
);

export const paginacaoEsquema = (limitePadrao, limiteMaximo) => ({
  pagina: vazioComoAusente(z.coerce.number().int().min(1).max(100_000).default(1)),
  limite: vazioComoAusente(z.coerce.number().int().min(1).max(limiteMaximo).default(limitePadrao))
});

export const parametrosIdEsquema = z.object({ id: idEsquema }).strict();
