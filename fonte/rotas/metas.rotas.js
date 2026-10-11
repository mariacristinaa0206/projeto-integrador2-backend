import { Router } from 'express';
import { PAPEIS_QUE_REGISTRAM_EMOCAO } from '../configuracao/constantes.js';
import * as controlador from '../controladores/meta.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorEscrita } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { parametrosIdEsquema } from '../validadores/comuns.js';
import { consultaMetas, esquemaAtualizarMeta, esquemaCriarMeta } from '../validadores/meta.js';

const roteador = Router();

// Metas são pessoais: só o dono as vê (o serviço filtra pelo id do token).
roteador.use(autenticar, exigirPapel(...PAPEIS_QUE_REGISTRAM_EMOCAO));

roteador.post('/', limitadorEscrita, corpoJson(), validar({ corpo: esquemaCriarMeta }), controlador.criar);
roteador.get('/', validar({ consulta: consultaMetas }), controlador.listar);
roteador.get('/:id', validar({ parametros: parametrosIdEsquema }), controlador.obter);
roteador.put(
  '/:id',
  limitadorEscrita,
  corpoJson(),
  validar({ parametros: parametrosIdEsquema, corpo: esquemaAtualizarMeta }),
  controlador.atualizar
);
roteador.delete('/:id', limitadorEscrita, validar({ parametros: parametrosIdEsquema }), controlador.excluir);

export default roteador;
