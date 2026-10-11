import * as feedbackServico from '../servicos/feedback.servico.js';

export async function criar(req, res) {
  res.status(201).json(await feedbackServico.criar(req.usuario, req.validado.corpo));
}

export async function listarMeus(req, res) {
  res.json(await feedbackServico.listarMeus(req.usuario, req.validado.consulta));
}

export async function listarParaGestao(req, res) {
  res.json(await feedbackServico.listarParaGestao(req.usuario, req.validado.consulta));
}
