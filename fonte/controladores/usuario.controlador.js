import * as usuarioServico from '../servicos/usuario.servico.js';

export async function listar(req, res) {
  res.json(await usuarioServico.listar(req.usuario, req.validado.consulta));
}

export async function obter(req, res) {
  res.json(await usuarioServico.obter(req.usuario, req.validado.parametros.id));
}

export async function criar(req, res) {
  res.status(201).json(await usuarioServico.criar(req.usuario, req.validado.corpo));
}

export async function atualizar(req, res) {
  res.json(await usuarioServico.atualizar(req.usuario, req.validado.parametros.id, req.validado.corpo));
}

export async function alterarSituacao(req, res) {
  res.json(await usuarioServico.alterarSituacao(req.usuario, req.validado.parametros.id, req.validado.corpo));
}

export async function redefinirSenha(req, res) {
  res.json(await usuarioServico.redefinirSenha(req.usuario, req.validado.parametros.id));
}

export async function excluir(req, res) {
  await usuarioServico.excluir(req.usuario, req.validado.parametros.id);
  res.status(204).end();
}
