import * as relatorioServico from '../servicos/relatorio.servico.js';

export async function gerar(req, res) {
  res.status(201).json(await relatorioServico.gerar(req.usuario, req.validado.corpo));
}

export async function listar(req, res) {
  res.json(await relatorioServico.listar(req.usuario, req.validado.consulta));
}

export async function obter(req, res) {
  res.json(await relatorioServico.obter(req.usuario, req.validado.parametros.id));
}
