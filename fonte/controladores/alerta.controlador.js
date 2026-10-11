import * as alertaServico from '../servicos/alerta.servico.js';

export async function listar(req, res) {
  res.json(await alertaServico.listar(req.usuario, req.validado.consulta));
}

export async function assumir(req, res) {
  res.json(await alertaServico.assumir(req.usuario, req.validado.parametros.id));
}

export async function resolver(req, res) {
  res.json(await alertaServico.resolver(req.usuario, req.validado.parametros.id));
}
