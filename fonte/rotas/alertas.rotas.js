import { Router } from 'express';
import { PAPEIS_APOIO } from '../configuracao/constantes.js';
import * as controlador from '../controladores/alerta.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { limitadorEscrita } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { consultaAlertas } from '../validadores/alerta.js';
import { parametrosIdEsquema } from '../validadores/comuns.js';

const roteador = Router();

// Alertas de acompanhamento: somente a equipe de apoio (psicólogo e pedagógico).
roteador.use(autenticar, exigirPapel(...PAPEIS_APOIO));

roteador.get('/', validar({ consulta: consultaAlertas }), controlador.listar);
roteador.post('/:id/assumir', limitadorEscrita, validar({ parametros: parametrosIdEsquema }), controlador.assumir);
roteador.post('/:id/resolver', limitadorEscrita, validar({ parametros: parametrosIdEsquema }), controlador.resolver);

export default roteador;
