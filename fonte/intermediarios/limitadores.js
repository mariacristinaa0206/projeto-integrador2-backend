import { createHash } from 'node:crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { muitasRequisicoes } from '../utilitarios/erros.js';

/**
 * Limitação de taxa (armazenamento em memória do processo).
 * Atenção: com mais de uma instância do servidor, cada uma conta separado; nesse caso trocar o `store`
 * por um compartilhado (ex.: Redis). Atrás de proxy (Render etc.) defina TRUST_PROXY, senão todos os
 * usuários parecem ter o mesmo IP do proxy.
 */

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

function criarLimitador({ janelaMs, limite, mensagem, chave, ignorarSucessos = false }) {
  return rateLimit({
    windowMs: janelaMs,
    limit: limite,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: ignorarSucessos,
    keyGenerator: chave ?? ((req) => ipKeyGenerator(req.ip)),
    handler: (req, res, next) => next(muitasRequisicoes(mensagem))
  });
}

/** Chave por usuário logado (cai para o IP se, por algum motivo, não houver usuário). */
const chavePorUsuario = (req) => (req.usuario ? `usuario:${req.usuario.id}` : ipKeyGenerator(req.ip));

/** Chave por e-mail informado no login, em hash (não guardamos o e-mail em memória). */
const chavePorEmail = (req) => {
  const email = req.validado?.corpo?.email;
  return email ? `email:${createHash('sha256').update(email).digest('hex')}` : ipKeyGenerator(req.ip);
};

/** Teto geral por IP, para todas as rotas. */
export const limitadorGlobal = criarLimitador({
  janelaMs: 15 * MINUTO,
  limite: 1000,
  mensagem: 'Muitas requisições deste IP. Aguarde alguns minutos.'
});

/** Força bruta no login, por IP: só falhas contam (login correto não consome o limite). */
export const limitadorLoginPorIp = criarLimitador({
  janelaMs: 15 * MINUTO,
  limite: 20,
  ignorarSucessos: true,
  mensagem: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.'
});

/** Força bruta distribuída (vários IPs contra uma mesma conta). Roda DEPOIS da validação do corpo. */
export const limitadorLoginPorEmail = criarLimitador({
  janelaMs: HORA,
  limite: 15,
  ignorarSucessos: true,
  chave: chavePorEmail,
  mensagem: 'Muitas tentativas de login para esta conta. Aguarde e tente novamente mais tarde.'
});

/** Cadastro público de aluno, por IP. */
export const limitadorCadastro = criarLimitador({
  janelaMs: HORA,
  limite: 20,
  mensagem: 'Muitos cadastros deste IP. Tente novamente mais tarde.'
});

/** Criar/editar/concluir (escritas em geral). Por usuário. */
export const limitadorEscrita = criarLimitador({
  janelaMs: MINUTO,
  limite: 30,
  chave: chavePorUsuario,
  mensagem: 'Muitas alterações em pouco tempo. Aguarde um instante.'
});

/** Chat: o front consulta por polling, então a leitura tem um teto maior que a escrita. */
export const limitadorMensagens = criarLimitador({
  janelaMs: MINUTO,
  limite: 40,
  chave: chavePorUsuario,
  mensagem: 'Muitas mensagens em pouco tempo. Aguarde um instante.'
});

export const limitadorLeituraChat = criarLimitador({
  janelaMs: MINUTO,
  limite: 120,
  chave: chavePorUsuario,
  mensagem: 'Muitas consultas ao chat em pouco tempo. Aguarde um instante.'
});

/** Leitura de dados individuais sensíveis pela equipe (diário do aluno, anotações): freia a coleta em massa. */
export const limitadorConsultaSensivel = criarLimitador({
  janelaMs: MINUTO,
  limite: 30,
  chave: chavePorUsuario,
  mensagem: 'Muitas consultas em pouco tempo. Aguarde um instante.'
});

/** Gerar relatório é caro (varre o período inteiro). */
export const limitadorRelatorios = criarLimitador({
  janelaMs: HORA,
  limite: 20,
  chave: chavePorUsuario,
  mensagem: 'Muitos relatórios gerados em pouco tempo. Tente novamente mais tarde.'
});

/** Contas criadas pela equipe e senhas redefinidas: poucas por hora, por usuário. */
export const limitadorGestaoDeContas = criarLimitador({
  janelaMs: HORA,
  limite: 120,
  chave: chavePorUsuario,
  mensagem: 'Muitas operações de conta em pouco tempo. Tente novamente mais tarde.'
});

/** Tentativas falhas de trocar senha/e-mail ou excluir a conta (protege a "senha atual" contra token roubado). */
export const limitadorTrocaDeCredenciais = criarLimitador({
  janelaMs: 15 * MINUTO,
  limite: 5,
  ignorarSucessos: true,
  chave: chavePorUsuario,
  mensagem: 'Muitas tentativas. Aguarde 15 minutos para alterar e-mail ou senha.'
});
