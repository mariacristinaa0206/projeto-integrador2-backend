import { Router } from 'express';
import { PAPEIS } from '../configuracao/constantes.js';
import * as controlador from '../controladores/feedback.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorEscrita } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { consultaFeedbacksGestao, consultaMeusFeedbacks, esquemaCriarFeedback } from '../validadores/feedback.js';

const roteador = Router();

roteador.use(autenticar);

roteador.post('/', limitadorEscrita, corpoJson(), validar({ corpo: esquemaCriarFeedback }), controlador.criar);
roteador.get('/meus', validar({ consulta: consultaMeusFeedbacks }), controlador.listarMeus);

// Gestão: todas as avaliações, SEM identificar quem avaliou.
roteador.get('/', exigirPapel(PAPEIS.ADMINISTRADOR), validar({ consulta: consultaFeedbacksGestao }), controlador.listarParaGestao);

export default roteador;
