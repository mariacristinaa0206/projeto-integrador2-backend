import { Router } from 'express';
import { PAPEIS, PAPEIS_APOIO } from '../configuracao/constantes.js';
import * as controlador from '../controladores/aluno.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorConsultaSensivel, limitadorEscrita } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { consultaAcompanhamentos, esquemaCriarAcompanhamento } from '../validadores/acompanhamento.js';
import { consultaAlunos } from '../validadores/aluno.js';
import { parametrosIdEsquema } from '../validadores/comuns.js';
import { consultaRegistros } from '../validadores/registro.js';

const roteador = Router();

// Visão da equipe de apoio sobre os alunos. O psicólogo só alcança os que acompanha (vínculo ativo).
roteador.use(autenticar, exigirPapel(...PAPEIS_APOIO));

roteador.get('/', validar({ consulta: consultaAlunos }), controlador.listar);
roteador.get('/:id', validar({ parametros: parametrosIdEsquema }), controlador.obter);

// O diário (registros emocionais com as observações) é só do psicólogo vinculado, com auditoria e limite de consultas.
roteador.get(
  '/:id/registros',
  exigirPapel(PAPEIS.PSICOLOGO),
  limitadorConsultaSensivel,
  validar({ parametros: parametrosIdEsquema, consulta: consultaRegistros }),
  controlador.listarRegistros
);

roteador.get(
  '/:id/acompanhamentos',
  limitadorConsultaSensivel,
  validar({ parametros: parametrosIdEsquema, consulta: consultaAcompanhamentos }),
  controlador.listarAcompanhamentos
);
roteador.post(
  '/:id/acompanhamentos',
  limitadorEscrita,
  corpoJson(),
  validar({ parametros: parametrosIdEsquema, corpo: esquemaCriarAcompanhamento }),
  controlador.criarAcompanhamento
);

export default roteador;
