import jwt from 'jsonwebtoken';
import { ambiente } from '../configuracao/ambiente.js';

const EMISSOR = 'conectamente-api';
const PUBLICO = 'conectamente-app';
const ALGORITMO = 'HS256';

/** Gera o JWT de acesso. `versao` precisa bater com versao_token da conta para o token continuar válido. */
export function gerarToken({ sub, papel, versao = 0 }, expiraEm) {
  const token = jwt.sign({ papel, ver: versao }, ambiente.segredoJwt, {
    algorithm: ALGORITMO,
    issuer: EMISSOR,
    audience: PUBLICO,
    subject: String(sub),
    expiresIn: expiraEm
  });
  const { exp } = jwt.decode(token);
  return { token, expiraEm: new Date(exp * 1000).toISOString() };
}

/** Lança se a assinatura, o emissor, o público, o algoritmo ou a validade não conferirem. */
export function verificarToken(token) {
  return jwt.verify(token, ambiente.segredoJwt, {
    algorithms: [ALGORITMO], // fixa o algoritmo: bloqueia "alg: none" e confusão de algoritmos
    issuer: EMISSOR,
    audience: PUBLICO
  });
}
