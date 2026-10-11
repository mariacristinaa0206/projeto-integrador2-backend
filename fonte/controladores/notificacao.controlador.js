import * as notificacaoServico from '../servicos/notificacao.servico.js';

export async function listar(req, res) {
  res.json(await notificacaoServico.listar(req.usuario));
}

export async function marcarComoLidas(req, res) {
  res.json(await notificacaoServico.marcarComoLidas(req.usuario, req.validado.corpo));
}
