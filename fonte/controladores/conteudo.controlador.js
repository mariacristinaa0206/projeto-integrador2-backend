import * as conteudoServico from '../servicos/conteudo.servico.js';

export async function listar(req, res) {
  res.json(await conteudoServico.listar(req.usuario, req.validado.consulta));
}

export async function obter(req, res) {
  res.json(await conteudoServico.obter(req.usuario, req.validado.parametros.id));
}

export async function criar(req, res) {
  res.status(201).json(await conteudoServico.criar(req.usuario, req.validado.corpo));
}

export async function atualizar(req, res) {
  res.json(await conteudoServico.atualizar(req.usuario, req.validado.parametros.id, req.validado.corpo));
}

export async function excluir(req, res) {
  await conteudoServico.excluir(req.usuario, req.validado.parametros.id);
  res.status(204).end();
}

export async function responderQuiz(req, res) {
  res.json(await conteudoServico.corrigirQuiz(req.usuario, req.validado.parametros.id, req.validado.corpo));
}

export async function orientacoes(req, res) {
  res.json(await conteudoServico.orientacoes(req.usuario, req.validado.consulta));
}
