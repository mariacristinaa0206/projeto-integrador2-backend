import * as acompanhamentoServico from '../servicos/acompanhamento.servico.js';
import * as alunoServico from '../servicos/aluno.servico.js';

export async function listar(req, res) {
  res.json(await alunoServico.listar(req.usuario, req.validado.consulta));
}

export async function obter(req, res) {
  res.json(await alunoServico.obter(req.usuario, req.validado.parametros.id));
}

export async function listarRegistros(req, res) {
  res.json(await alunoServico.listarRegistros(req.usuario, req.validado.parametros.id, req.validado.consulta));
}

export async function listarAcompanhamentos(req, res) {
  res.json(await acompanhamentoServico.listar(req.usuario, req.validado.parametros.id, req.validado.consulta));
}

export async function criarAcompanhamento(req, res) {
  res.status(201).json(await acompanhamentoServico.criar(req.usuario, req.validado.parametros.id, req.validado.corpo));
}
