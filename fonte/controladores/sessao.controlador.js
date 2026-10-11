import * as sessaoServico from '../servicos/sessao.servico.js';

export async function listarProfissionais(req, res) {
  res.json(await sessaoServico.listarProfissionais());
}

export async function horarios(req, res) {
  res.json(await sessaoServico.horariosDoDia(req.validado.parametros.id, req.validado.consulta.data));
}

export async function solicitar(req, res) {
  res.status(201).json(await sessaoServico.solicitar(req.usuario, req.validado.corpo));
}

export async function listar(req, res) {
  res.json(await sessaoServico.listar(req.usuario, req.validado.consulta));
}

export async function obter(req, res) {
  res.json(await sessaoServico.obter(req.usuario, req.validado.parametros.id));
}

export async function confirmar(req, res) {
  res.json(await sessaoServico.confirmar(req.usuario, req.validado.parametros.id));
}

export async function recusar(req, res) {
  res.json(await sessaoServico.recusar(req.usuario, req.validado.parametros.id));
}

export async function cancelar(req, res) {
  res.json(await sessaoServico.cancelar(req.usuario, req.validado.parametros.id));
}

export async function concluir(req, res) {
  res.json(await sessaoServico.concluir(req.usuario, req.validado.parametros.id));
}
