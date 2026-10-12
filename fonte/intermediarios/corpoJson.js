import express from 'express';
import { LIMITES } from '../configuracao/constantes.js';

/**
 * Leitor de JSON com limite por rota. Não há leitor global de propósito: o limite padrão é pequeno (32 KB)
 * e é aplicado só nas rotas que recebem corpo, sempre DEPOIS de autenticar/limitar taxa quando há login.
 * Só `application/json` é lido; qualquer outro tipo deixa `req.body` indefinido e é recusado pelo validador.
 */
export const corpoJson = (limite = LIMITES.corpoPadrao) =>
  express.json({ limit: limite, type: 'application/json', strict: true });
