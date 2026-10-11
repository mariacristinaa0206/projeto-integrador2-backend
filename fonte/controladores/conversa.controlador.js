import * as conversaServico from '../servicos/conversa.servico.js';

export async function abrir(req, res) {
  res.json(await conversaServico.abrir(req.usuario, req.validado.corpo));
}

export async function listar(req, res) {
  res.json(await conversaServico.listar(req.usuario));
}

export async function lerMensagens(req, res) {
  res.json(await conversaServico.lerMensagens(req.usuario, req.validado.parametros.id, req.validado.consulta));
}

export async function enviar(req, res) {
  res.status(201).json(await conversaServico.enviar(req.usuario, req.validado.parametros.id, req.validado.corpo));
}

export async function marcarComoLidas(req, res) {
  res.json(await conversaServico.marcarComoLidas(req.usuario, req.validado.parametros.id));
}
