import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { LIMITES } from '../configuracao/constantes.js';

const CUSTO_BCRYPT = 12;

// Hash descartável usado para gastar o mesmo tempo quando o e-mail não existe,
// evitando que o tempo de resposta revele quais e-mails estão cadastrados.
const hashFalso = bcrypt.hashSync('senha-falsa-para-igualar-o-tempo', CUSTO_BCRYPT);

export function gerarHashSenha(senha) {
  return bcrypt.hash(senha, CUSTO_BCRYPT);
}

export function conferirSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}

export function conferirSenhaContraHashFalso(senha) {
  return bcrypt.compare(senha, hashFalso);
}

// Sem caracteres ambíguos (0/O, 1/l/I): a senha provisória é ditada ou digitada por crianças e responsáveis.
const LETRAS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITOS = '23456789';

const sortear = (alfabeto) => alfabeto[randomInt(alfabeto.length)];

/**
 * Senha provisória aleatória (crypto.randomInt) que já cumpre a regra do sistema: ao menos uma letra e um número.
 * É mostrada UMA vez a quem criou/redefiniu a conta e obriga a troca no primeiro acesso.
 */
export function gerarSenhaTemporaria(tamanho = LIMITES.tamanhoSenhaTemporaria) {
  const caracteres = [sortear(LETRAS), sortear(DIGITOS)];
  while (caracteres.length < tamanho) caracteres.push(sortear(LETRAS + DIGITOS));
  // Embaralha (Fisher-Yates) para a letra e o número garantidos não ficarem sempre no começo.
  for (let i = caracteres.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}
