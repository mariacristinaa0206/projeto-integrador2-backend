import { Router } from 'express';
import { LIMITES, PAPEIS_GESTAO_CONTEUDO } from '../configuracao/constantes.js';
import * as controlador from '../controladores/conteudo.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorEscrita } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { parametrosIdEsquema } from '../validadores/comuns.js';
import { consultaConteudos, esquemaConteudo, esquemaResponderQuiz } from '../validadores/conteudo.js';

const roteador = Router();

roteador.use(autenticar);

// Leitura: todo perfil autenticado (o serviço filtra rascunhos e o nível de ensino do aluno).
roteador.get('/', validar({ consulta: consultaConteudos }), controlador.listar);
roteador.get('/:id', validar({ parametros: parametrosIdEsquema }), controlador.obter);
roteador.post('/:id/respostas', limitadorEscrita, corpoJson(), validar({ parametros: parametrosIdEsquema, corpo: esquemaResponderQuiz }), controlador.responderQuiz);

// Escrita: gestão de conteúdo (administrador, psicólogo, pedagógico). Editar/excluir: o autor ou o administrador.
roteador.post(
  '/',
  exigirPapel(...PAPEIS_GESTAO_CONTEUDO),
  limitadorEscrita,
  corpoJson(LIMITES.corpoConteudo),
  validar({ corpo: esquemaConteudo }),
  controlador.criar
);
roteador.put(
  '/:id',
  exigirPapel(...PAPEIS_GESTAO_CONTEUDO),
  limitadorEscrita,
  corpoJson(LIMITES.corpoConteudo),
  validar({ parametros: parametrosIdEsquema, corpo: esquemaConteudo }),
  controlador.atualizar
);
roteador.delete(
  '/:id',
  exigirPapel(...PAPEIS_GESTAO_CONTEUDO),
  limitadorEscrita,
  validar({ parametros: parametrosIdEsquema }),
  controlador.excluir
);

export default roteador;
