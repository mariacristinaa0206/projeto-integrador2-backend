import dotenv from 'dotenv';
import { hkdfSync } from 'node:crypto';
import { z } from 'zod';
import { LIMITES } from './constantes.js';

dotenv.config({ quiet: true });

// Mesma regra de senha do cadastro (mínimo, letra e número). Não importa o validador para não criar dependência circular.
const senhaInicialValida = (valor) =>
  valor.length >= LIMITES.senhaMinima &&
  Buffer.byteLength(valor) <= LIMITES.senhaMaximaBytes &&
  /\p{L}/u.test(valor) &&
  /\d/.test(valor);

/**
 * Apenas DATABASE_URL e CHAVE_CRIPTOGRAFIA são obrigatórias.
 * As demais são opcionais e têm padrões seguros (ver .env.exemplo).
 */
const esquemaAmbiente = z
  .object({
    DATABASE_URL: z
      .string({ required_error: 'DATABASE_URL é obrigatória (URL do PostgreSQL/Neon).' })
      .trim()
      .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL deve começar com postgresql://'),
    CHAVE_CRIPTOGRAFIA: z
      .string({ required_error: 'CHAVE_CRIPTOGRAFIA é obrigatória (64 caracteres hexadecimais).' })
      .trim()
      .regex(/^[0-9a-fA-F]{64}$/, 'CHAVE_CRIPTOGRAFIA deve ter exatamente 64 caracteres hexadecimais (32 bytes).')
      .refine((valor) => !/^(.)\1+$/.test(valor), 'CHAVE_CRIPTOGRAFIA não pode ser um valor repetido (gere uma chave aleatória).'),

    // Primeiro administrador: criado na inicialização se ainda não existir nenhum. Os dois juntos ou nenhum.
    ADMIN_EMAIL: z.string().trim().toLowerCase().email('ADMIN_EMAIL deve ser um e-mail válido.').max(LIMITES.maxCaracteresEmail).optional(),
    ADMIN_SENHA: z
      .string()
      .refine(senhaInicialValida, `ADMIN_SENHA deve ter ao menos ${LIMITES.senhaMinima} caracteres, com letra e número.`)
      .optional(),
    // Cadastro público só para e-mails destes domínios (ex.: escola.edu.br,aluno.escola.edu.br). Vazio = qualquer um.
    DOMINIOS_EMAIL_PERMITIDOS: z.string().default(''),

    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3500),
    // Origens do front permitidas no CORS, separadas por vírgula. Ex.: https://meusite.com,http://localhost:5500
    CORS_ORIGINS: z.string().default(''),
    // Quantos proxies existem na frente do servidor (Render/Railway/Cloudflare = 1). 0 = nenhum.
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    // Opcional. Sem ele, o segredo do JWT é derivado de DATABASE_URL + CHAVE_CRIPTOGRAFIA.
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres.').optional(),
    JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Use o formato 8h, 30m, 7d...').default('8h'),
    DOCS_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((valor) => valor === 'true')
  })
  .refine((env) => Boolean(env.ADMIN_EMAIL) === Boolean(env.ADMIN_SENHA), {
    message: 'Defina ADMIN_EMAIL e ADMIN_SENHA juntos (ou nenhum dos dois).',
    path: ['ADMIN_EMAIL']
  });

// Variável presente porém vazia (ex.: "JWT_SECRET=") vale como ausente.
const bruto = Object.fromEntries(Object.entries(process.env).filter(([, valor]) => valor !== ''));
const resultado = esquemaAmbiente.safeParse(bruto);

if (!resultado.success) {
  const problemas = resultado.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`).join('\n');
  console.error(`\nConfiguração de ambiente inválida:\n${problemas}\n\nCopie .env.exemplo para .env e preencha os valores.\n`);
  process.exit(1);
}

const env = resultado.data;

/**
 * Sem JWT_SECRET no .env, derivamos 256 bits via HKDF a partir de DATABASE_URL (que carrega a senha
 * aleatória do Neon) + CHAVE_CRIPTOGRAFIA. O segredo é estável entre reinícios, difere entre ambientes e
 * todos os tokens caem se o banco ou a chave mudarem. A derivação usa um "sal" e uma "finalidade"
 * próprios, então o segredo do JWT nunca coincide com as subchaves da criptografia (ver cifra.js).
 */
function obterSegredoJwt() {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  const material = Buffer.from([env.DATABASE_URL, env.CHAVE_CRIPTOGRAFIA].join('\u0000'));
  return Buffer.from(hkdfSync('sha256', material, 'conectamente-api/sal-v1', 'jwt-hs256', 32)).toString('hex');
}

const origensCors = env.CORS_ORIGINS.split(',')
  .map((origem) => origem.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const dominiosEmailPermitidos = env.DOMINIOS_EMAIL_PERMITIDOS.split(',')
  .map((dominio) => dominio.trim().toLowerCase().replace(/^@/, ''))
  .filter(Boolean);

export const ambiente = Object.freeze({
  ehProducao: env.NODE_ENV === 'production',
  ehTeste: env.NODE_ENV === 'test',
  porta: env.PORT,
  urlBanco: env.DATABASE_URL,
  // A chave de criptografia dos dados NUNCA é derivada de outra coisa: perdê-la é perder os dados.
  chaveCriptografia: Buffer.from(env.CHAVE_CRIPTOGRAFIA, 'hex'),
  administradorInicial: env.ADMIN_EMAIL ? Object.freeze({ email: env.ADMIN_EMAIL, senha: env.ADMIN_SENHA }) : null,
  dominiosEmailPermitidos: Object.freeze(dominiosEmailPermitidos),
  origensCors: Object.freeze(origensCors),
  confiarProxy: env.TRUST_PROXY,
  segredoJwt: obterSegredoJwt(),
  expiracaoJwt: env.JWT_EXPIRES_IN,
  docsAtivo: env.DOCS_ENABLED
});
