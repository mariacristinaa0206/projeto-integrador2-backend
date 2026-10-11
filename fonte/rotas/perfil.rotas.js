import { Router } from 'express';
import * as controlador from '../controladores/perfil.controlador.js';
import { autenticar, autenticarPermitindoSenhaProvisoria } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorEscrita, limitadorTrocaDeCredenciais } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { esquemaExcluirPerfil, esquemaPerfil } from '../validadores/usuario.js';

const roteador = Router();

// Consultar o próprio perfil é permitido com senha provisória: é como o app descobre que precisa trocá-la.
roteador.get('/', autenticarPermitindoSenhaProvisoria, controlador.obter);

// O limite de tentativas da senha atual vem DEPOIS da validação, como em /autenticacao/trocar-senha.
roteador.put(
  '/',
  autenticar,
  limitadorEscrita,
  corpoJson(),
  validar({ corpo: esquemaPerfil }),
  limitadorTrocaDeCredenciais,
  controlador.atualizar
);

// POST (e não DELETE) porque pede a senha no corpo: alguns clientes e proxies descartam corpo em DELETE.
roteador.post(
  '/excluir',
  autenticar,
  corpoJson(),
  validar({ corpo: esquemaExcluirPerfil }),
  limitadorTrocaDeCredenciais,
  controlador.excluir
);

export default roteador;
