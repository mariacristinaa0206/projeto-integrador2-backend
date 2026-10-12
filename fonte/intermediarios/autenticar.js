import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import { ErroApp, naoAutenticado } from '../utilitarios/erros.js';
import { verificarToken } from '../utilitarios/token.js';

function lerTokenDoCabecalho(req) {
  const [esquema, token, ...sobra] = (req.get('authorization') ?? '').split(' ');
  if (esquema?.toLowerCase() !== 'bearer' || !token || sobra.length > 0) return null;
  return token;
}

function recusar(mensagem) {
  const erro = naoAutenticado(mensagem);
  erro.cabecalhos = { 'WWW-Authenticate': 'Bearer' };
  return erro;
}

/**
 * Confere o token e popula `req.usuario = { id, nome, email, papel, deveTrocarSenha, versaoToken, idRequisicao }`.
 * Além da assinatura, confere no banco que a conta existe, está ATIVA e que o token não foi revogado
 * (versão do token): desativar a conta, trocar a senha ou fazer logout derruba o acesso na hora.
 */
async function identificar(req) {
  const token = lerTokenDoCabecalho(req);
  if (!token) throw recusar('Token de acesso ausente.');

  let carga;
  try {
    carga = verificarToken(token);
  } catch {
    throw recusar('Token inválido ou expirado.');
  }

  const id = Number(carga.sub);
  if (!Number.isInteger(id) || id <= 0) throw recusar('Token inválido.');

  const conta = await usuarioRepositorio.buscarCredencialPorId(id);
  if (!conta || !conta.ativo || conta.versaoToken !== carga.ver) {
    throw recusar('Sessão encerrada. Faça login novamente.');
  }

  req.usuario = { ...conta, idRequisicao: req.id };
}

/**
 * Exige `Authorization: Bearer <jwt>`. Quem ainda está com a senha PROVISÓRIA (conta criada ou redefinida pela
 * escola) não passa daqui: só consegue trocar a senha (rotas que usam `autenticarPermitindoSenhaProvisoria`).
 */
export async function autenticar(req, res, next) {
  await identificar(req);
  if (req.usuario.deveTrocarSenha) {
    throw new ErroApp(403, 'TROCA_DE_SENHA_OBRIGATORIA', 'Defina uma nova senha para continuar.');
  }
  return next();
}

/** Igual a `autenticar`, mas aceita a senha provisória: use SÓ em trocar-senha, sair e consulta do próprio perfil. */
export async function autenticarPermitindoSenhaProvisoria(req, res, next) {
  await identificar(req);
  return next();
}

/** Autorização por perfil. Use sempre depois de `autenticar`. */
export const exigirPapel =
  (...papeisPermitidos) =>
  (req, res, next) => {
    if (!papeisPermitidos.includes(req.usuario?.papel)) {
      throw new ErroApp(403, 'PROIBIDO', 'Seu perfil não tem permissão para acessar este recurso.');
    }
    next();
  };
