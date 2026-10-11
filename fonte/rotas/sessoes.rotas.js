import { Router } from 'express';
import { PAPEIS, PAPEIS_APOIO } from '../configuracao/constantes.js';
import * as controlador from '../controladores/sessao.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorEscrita } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { parametrosIdEsquema } from '../validadores/comuns.js';
import { consultaHorarios, consultaSessoes, esquemaSolicitarSessao } from '../validadores/sessao.js';

const roteador = Router();

const ALUNO = exigirPapel(PAPEIS.ALUNO);
const EQUIPE = exigirPapel(...PAPEIS_APOIO);
const PARTICIPANTES = exigirPapel(PAPEIS.ALUNO, ...PAPEIS_APOIO);

roteador.use(autenticar);

// O aluno escolhe com quem marcar e vê os horários livres.
roteador.get('/profissionais', ALUNO, controlador.listarProfissionais);
roteador.get('/profissionais/:id/horarios', ALUNO, validar({ parametros: parametrosIdEsquema, consulta: consultaHorarios }), controlador.horarios);

roteador.post('/', ALUNO, limitadorEscrita, corpoJson(), validar({ corpo: esquemaSolicitarSessao }), controlador.solicitar);
roteador.get('/', PARTICIPANTES, validar({ consulta: consultaSessoes }), controlador.listar);
roteador.get('/:id', PARTICIPANTES, validar({ parametros: parametrosIdEsquema }), controlador.obter);

// Cada transição é um UPDATE condicional no serviço; aqui só o perfil que pode pedi-la.
roteador.post('/:id/confirmar', EQUIPE, limitadorEscrita, validar({ parametros: parametrosIdEsquema }), controlador.confirmar);
roteador.post('/:id/recusar', EQUIPE, limitadorEscrita, validar({ parametros: parametrosIdEsquema }), controlador.recusar);
roteador.post('/:id/concluir', EQUIPE, limitadorEscrita, validar({ parametros: parametrosIdEsquema }), controlador.concluir);
roteador.post('/:id/cancelar', PARTICIPANTES, limitadorEscrita, validar({ parametros: parametrosIdEsquema }), controlador.cancelar);

export default roteador;
