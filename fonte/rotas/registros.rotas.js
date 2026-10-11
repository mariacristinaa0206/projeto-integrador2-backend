import { Router } from 'express';
import { PAPEIS_QUE_REGISTRAM_EMOCAO } from '../configuracao/constantes.js';
import * as controlador from '../controladores/registro.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorEscrita } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { parametrosIdEsquema } from '../validadores/comuns.js';
import { consultaRegistros, esquemaAtualizarObservacao, esquemaRegistrar } from '../validadores/registro.js';

const roteador = Router();

// Cada pessoa só acessa os PRÓPRIOS registros (o serviço filtra pelo id do token, nunca por parâmetro).
roteador.use(autenticar, exigirPapel(...PAPEIS_QUE_REGISTRAM_EMOCAO));

roteador.get('/catalogo', controlador.catalogo);
roteador.post('/', limitadorEscrita, corpoJson(), validar({ corpo: esquemaRegistrar }), controlador.registrar);
roteador.get('/', validar({ consulta: consultaRegistros }), controlador.listar);
roteador.get('/:id', validar({ parametros: parametrosIdEsquema }), controlador.obter);
roteador.put(
  '/:id/observacao',
  limitadorEscrita,
  corpoJson(),
  validar({ parametros: parametrosIdEsquema, corpo: esquemaAtualizarObservacao }),
  controlador.atualizarObservacao
);
roteador.delete('/:id', limitadorEscrita, validar({ parametros: parametrosIdEsquema }), controlador.excluir);

export default roteador;
