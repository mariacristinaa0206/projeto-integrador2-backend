import { Router } from 'express';
import { PAPEIS_PAINEL_COLETIVO } from '../configuracao/constantes.js';
import * as controlador from '../controladores/painel.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { validar } from '../intermediarios/validar.js';
import { consultaColetivo } from '../validadores/painel.js';

const roteador = Router();

roteador.use(autenticar);

// Tela inicial de cada perfil, numa chamada só.
roteador.get('/', controlador.meu);

// Indicadores coletivos (sem identificar ninguém; recortes pequenos ficam ocultos).
roteador.get('/coletivo', exigirPapel(...PAPEIS_PAINEL_COLETIVO), validar({ consulta: consultaColetivo }), controlador.coletivo);

export default roteador;
