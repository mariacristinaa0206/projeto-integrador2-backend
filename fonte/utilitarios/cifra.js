import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { ambiente } from '../configuracao/ambiente.js';

/**
 * Criptografia em repouso dos textos sensíveis (observações do registro emocional, anotações da equipe,
 * mensagens do chat, motivo da sessão, metas, comentários de feedback e dados dos relatórios).
 *
 * - AES-256-GCM (criptografia autenticada): além de esconder o conteúdo, detecta qualquer adulteração.
 * - IV aleatório de 96 bits por operação; o mesmo texto nunca gera o mesmo resultado.
 * - AAD (dado associado) = "tabela.coluna:id": o resultado só decifra no registro de origem, então trocar
 *   o conteúdo cifrado de uma linha para outra direto no banco é detectado.
 * - Formato guardado: `v1.<iv>.<etiqueta>.<conteúdo>` (base64url). O prefixo de versão permite rotacionar a chave.
 * - A subchave é derivada por HKDF da CHAVE_CRIPTOGRAFIA com uma "finalidade" própria.
 */

const VERSAO = 'v1';
const SAL = 'conectamente/sal-cifra-v1';

const chaveDados = Buffer.from(hkdfSync('sha256', ambiente.chaveCriptografia, SAL, 'dados-aes-256-gcm', 32));

/** Cifra um texto. `contexto` identifica o registro, ex.: `mensagens.texto:42`. Nulo continua nulo. */
export function cifrarTexto(texto, contexto) {
  if (texto === null || texto === undefined) return null;
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', chaveDados, iv);
  cifra.setAAD(Buffer.from(contexto, 'utf8'));
  const conteudo = Buffer.concat([cifra.update(String(texto), 'utf8'), cifra.final()]);
  const etiqueta = cifra.getAuthTag();
  return [VERSAO, iv.toString('base64url'), etiqueta.toString('base64url'), conteudo.toString('base64url')].join('.');
}

/** Decifra e devolve o texto original. Lança se o formato, a chave, o contexto ou a integridade não conferirem. */
export function decifrarTexto(valor, contexto) {
  if (valor === null || valor === undefined) return null;

  const partes = String(valor).split('.');
  if (partes.length !== 4 || partes[0] !== VERSAO) throw new Error('Formato de dado cifrado desconhecido.');

  const [iv, etiqueta, conteudo] = partes.slice(1).map((parte) => Buffer.from(parte, 'base64url'));
  const decifra = createDecipheriv('aes-256-gcm', chaveDados, iv);
  decifra.setAAD(Buffer.from(contexto, 'utf8'));
  decifra.setAuthTag(etiqueta);
  return Buffer.concat([decifra.update(conteudo), decifra.final()]).toString('utf8');
}

export const cifrarJson = (objeto, contexto) => cifrarTexto(JSON.stringify(objeto), contexto);

export function decifrarJson(valor, contexto) {
  const texto = decifrarTexto(valor, contexto);
  return texto === null ? null : JSON.parse(texto);
}
