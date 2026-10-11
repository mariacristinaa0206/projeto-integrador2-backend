import * as vinculoServico from '../servicos/vinculo.servico.js';

export async function listar(req, res) {
  res.json(await vinculoServico.listar(req.usuario, req.validado.consulta));
}

export async function designar(req, res) {
  res.status(201).json(await vinculoServico.designar(req.usuario, req.validado.corpo));
}

export async function encerrar(req, res) {
  res.json(await vinculoServico.encerrar(req.usuario, req.validado.parametros.id));
}
