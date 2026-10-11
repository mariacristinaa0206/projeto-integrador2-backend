import * as registroServico from '../servicos/registro.servico.js';

export function catalogo(req, res) {
  res.json(registroServico.catalogo());
}

export async function registrar(req, res) {
  res.status(201).json(await registroServico.registrar(req.usuario, req.validado.corpo));
}

export async function listar(req, res) {
  res.json(await registroServico.listar(req.usuario, req.validado.consulta));
}

export async function obter(req, res) {
  res.json(await registroServico.obter(req.usuario, req.validado.parametros.id));
}

export async function atualizarObservacao(req, res) {
  res.json(await registroServico.atualizarObservacao(req.usuario, req.validado.parametros.id, req.validado.corpo));
}

export async function excluir(req, res) {
  await registroServico.excluir(req.usuario, req.validado.parametros.id);
  res.status(204).end();
}
