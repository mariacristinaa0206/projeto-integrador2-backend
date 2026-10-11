import { Router } from 'express';
import { PAPEIS } from '../configuracao/constantes.js';
import * as controlador from '../controladores/usuario.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorGestaoDeContas } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { parametrosIdEsquema } from '../validadores/comuns.js';
import {
  consultaExclusao,
  consultaUsuarios,
  esquemaAtualizarUsuario,
  esquemaCriarUsuario,
  esquemaSituacao
} from '../validadores/usuario.js';

const roteador = Router();

// Gestão de contas: administrador (todas) e pedagógico (somente alunos; o serviço restringe).
roteador.use(autenticar, exigirPapel(PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO));

roteador.get('/', validar({ consulta: consultaUsuarios }), controlador.listar);
roteador.post('/', limitadorGestaoDeContas, corpoJson(), validar({ corpo: esquemaCriarUsuario }), controlador.criar);

roteador.get('/:id', validar({ parametros: parametrosIdEsquema }), controlador.obter);
roteador.put(
  '/:id',
  limitadorGestaoDeContas,
  corpoJson(),
  validar({ parametros: parametrosIdEsquema, corpo: esquemaAtualizarUsuario }),
  controlador.atualizar
);
roteador.put(
  '/:id/situacao',
  limitadorGestaoDeContas,
  corpoJson(),
  validar({ parametros: parametrosIdEsquema, corpo: esquemaSituacao }),
  controlador.alterarSituacao
);

// Somente o administrador redefine senha e exclui conta de forma permanente.
roteador.post(
  '/:id/redefinir-senha',
  exigirPapel(PAPEIS.ADMINISTRADOR),
  limitadorGestaoDeContas,
  validar({ parametros: parametrosIdEsquema }),
  controlador.redefinirSenha
);
roteador.delete(
  '/:id',
  exigirPapel(PAPEIS.ADMINISTRADOR),
  limitadorGestaoDeContas,
  validar({ parametros: parametrosIdEsquema, consulta: consultaExclusao }),
  controlador.excluir
);

export default roteador;
