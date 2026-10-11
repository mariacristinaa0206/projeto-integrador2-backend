import * as autenticacaoServico from '../servicos/autenticacao.servico.js';

// Rotas públicas não têm `req.usuario`: o id da requisição segue explícito para a trilha de auditoria.
const contexto = (req) => ({ idRequisicao: req.id });

export async function cadastrarAluno(req, res) {
  res.status(201).json(await autenticacaoServico.cadastrarAluno(req.validado.corpo, contexto(req)));
}

export async function entrar(req, res) {
  res.json(await autenticacaoServico.entrar(req.validado.corpo, contexto(req)));
}

export async function sair(req, res) {
  await autenticacaoServico.sair(req.usuario);
  res.status(204).end();
}

export async function trocarSenha(req, res) {
  res.json(await autenticacaoServico.trocarSenha(req.usuario, req.validado.corpo));
}
