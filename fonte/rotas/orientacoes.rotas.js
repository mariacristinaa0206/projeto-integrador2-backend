import { Router } from 'express';
import * as controlador from '../controladores/conteudo.controlador.js';
import { autenticar } from '../intermediarios/autenticar.js';
import { validar } from '../intermediarios/validar.js';
import { consultaOrientacoes } from '../validadores/conteudo.js';

const roteador = Router();

// RF04: orientações iniciais (por tema ou pela emoção), no nível de ensino da pessoa, com o apoio imediato (CVV 188).
roteador.get('/', autenticar, validar({ consulta: consultaOrientacoes }), controlador.orientacoes);

export default roteador;
