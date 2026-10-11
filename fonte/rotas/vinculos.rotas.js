import { Router } from 'express';
import { PAPEIS } from '../configuracao/constantes.js';
import * as controlador from '../controladores/vinculo.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorEscrita } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { parametrosIdEsquema } from '../validadores/comuns.js';
import { consultaVinculos, esquemaDesignarVinculo } from '../validadores/vinculo.js';

const roteador = Router();

const QUEM_PARTICIPA_OU_GERE = exigirPapel(PAPEIS.ALUNO, PAPEIS.PSICOLOGO, PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO);

roteador.use(autenticar);

// O aluno vê QUEM pode ver os seus registros; o psicólogo vê os seus alunos.
roteador.get('/', QUEM_PARTICIPA_OU_GERE, validar({ consulta: consultaVinculos }), controlador.listar);

// A escola designa um psicólogo (o aluno é avisado).
roteador.post(
  '/',
  exigirPapel(PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO),
  limitadorEscrita,
  corpoJson(),
  validar({ corpo: esquemaDesignarVinculo }),
  controlador.designar
);

// O aluno revoga o acesso quando quiser; o psicólogo e a escola também encerram.
roteador.post('/:id/encerrar', QUEM_PARTICIPA_OU_GERE, limitadorEscrita, validar({ parametros: parametrosIdEsquema }), controlador.encerrar);

export default roteador;
