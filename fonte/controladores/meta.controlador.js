import * as metaServico from '../servicos/meta.servico.js';

export async function criar(req, res) {
  res.status(201).json(await metaServico.criar(req.usuario, req.validado.corpo));
}

export async function listar(req, res) {
  res.json(await metaServico.listar(req.usuario, req.validado.consulta));
}

export async function obter(req, res) {
  res.json(await metaServico.obter(req.usuario, req.validado.parametros.id));
}

export async function atualizar(req, res) {
  res.json(await metaServico.atualizar(req.usuario, req.validado.parametros.id, req.validado.corpo));
}

export async function excluir(req, res) {
  await metaServico.excluir(req.usuario, req.validado.parametros.id);
  res.status(204).end();
}
