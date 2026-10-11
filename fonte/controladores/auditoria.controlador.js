import * as auditoriaServico from '../servicos/auditoria.servico.js';

export async function listar(req, res) {
  res.json(await auditoriaServico.listar(req.validado.consulta));
}
