/** Aparar e colapsar espaços internos repetidos. */
export function limparEspacos(texto) {
  return String(texto ?? '').trim().replace(/\s+/g, ' ');
}

/** "Maria Souza Lima" → "Maria". Usado onde só o primeiro nome pode aparecer. */
export function primeiroNome(nome) {
  return String(nome ?? '').trim().split(/\s+/)[0] ?? '';
}

/** Escapa os curingas do LIKE para a busca por trecho tratar `%` e `_` como texto comum. */
export function escaparCuringasLike(texto) {
  return String(texto).replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}
