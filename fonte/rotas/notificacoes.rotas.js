import { Router } from 'express';
import * as controlador from '../controladores/notificacao.controlador.js';
import { autenticar } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorEscrita } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { esquemaMarcarLidas } from '../validadores/notificacao.js';

const roteador = Router();

roteador.use(autenticar);

roteador.get('/', controlador.listar);

// Corpo opcional: sem `ids`, marca todas como lidas.
roteador.post('/lidas', limitadorEscrita, corpoJson(), validar({ corpo: esquemaMarcarLidas, corpoOpcional: true }), controlador.marcarComoLidas);

export default roteador;
