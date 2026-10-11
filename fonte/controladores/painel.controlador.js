import * as painelServico from '../servicos/painel.servico.js';

export async function meu(req, res) {
  res.json(await painelServico.meuPainel(req.usuario));
}

export async function coletivo(req, res) {
  res.json(await painelServico.indicadoresColetivos(req.validado.consulta));
}
