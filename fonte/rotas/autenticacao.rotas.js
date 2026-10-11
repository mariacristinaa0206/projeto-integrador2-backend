import { Router } from 'express';
import * as controlador from '../controladores/autenticacao.controlador.js';
import { autenticarPermitindoSenhaProvisoria } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import {
  limitadorCadastro,
  limitadorLoginPorEmail,
  limitadorLoginPorIp,
  limitadorTrocaDeCredenciais
} from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { esquemaCadastroAluno, esquemaEntrar, esquemaTrocarSenha } from '../validadores/autenticacao.js';

const roteador = Router();

// Cadastro público: só aluno (dos níveis liberados para autocadastro). Equipe e demais alunos: POST /usuarios.
roteador.post('/cadastro', limitadorCadastro, corpoJson(), validar({ corpo: esquemaCadastroAluno }), controlador.cadastrarAluno);

// Ordem importa: limite por IP → ler corpo → validar → limite por conta → entrar.
roteador.post(
  '/entrar',
  limitadorLoginPorIp,
  corpoJson(),
  validar({ corpo: esquemaEntrar }),
  limitadorLoginPorEmail,
  controlador.entrar
);

// Quem está com a senha provisória só alcança estas duas rotas (e GET /perfil).
roteador.post('/sair', autenticarPermitindoSenhaProvisoria, controlador.sair);

// O limite de tentativas da senha atual vem DEPOIS da validação: erro de digitação do formulário (400) não gasta tentativas.
roteador.post(
  '/trocar-senha',
  autenticarPermitindoSenhaProvisoria,
  corpoJson(),
  validar({ corpo: esquemaTrocarSenha }),
  limitadorTrocaDeCredenciais,
  controlador.trocarSenha
);

export default roteador;
