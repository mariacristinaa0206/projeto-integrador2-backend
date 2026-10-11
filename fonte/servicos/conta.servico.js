import { PAPEIS } from '../configuracao/constantes.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import { conflito, ehViolacaoDeUnicidade, regraDeNegocio } from '../utilitarios/erros.js';
import { gerarHashSenha } from '../utilitarios/senha.js';

/**
 * Regras comuns de criação e edição de contas. Usado pelo cadastro público, pelo cadastro feito pela escola e
 * pelo perfil do próprio usuário, para que todas as portas apliquem exatamente as mesmas regras.
 *
 * O caso de uso do projeto manda informar quando "o usuário já possui cadastro": por isso a mensagem de
 * conflito de e-mail é explícita.
 */

export const MENSAGEM_EMAIL_EM_USO = 'Este e-mail já está cadastrado no sistema.';

/** O e-mail é único no sistema (RN1). A checagem dá a mensagem amigável; quem garante de verdade é o índice único. */
export async function garantirEmailLivre(email, ignorarId) {
  if (await usuarioRepositorio.existeComEmail(email, ignorarId)) throw conflito(MENSAGEM_EMAIL_EM_USO);
}

/** Corrida entre duas requisições: o banco recusa a segunda e traduzimos para o mesmo 409 amigável. */
export async function traduzindoConflitoDeEmail(operacao) {
  try {
    return await operacao();
  } catch (erro) {
    if (ehViolacaoDeUnicidade(erro)) throw conflito(MENSAGEM_EMAIL_EM_USO);
    throw erro;
  }
}

/** Cria a conta (e, para aluno, o perfil com o consentimento). `senha` é em texto: vira hash aqui. */
export async function criarConta({ papel, nome, email, senha, deveTrocarSenha = false, aluno }) {
  await garantirEmailLivre(email);
  const senhaHash = await gerarHashSenha(senha);
  return traduzindoConflitoDeEmail(() =>
    usuarioRepositorio.criar({ papel, nome, email, senhaHash, deveTrocarSenha, aluno })
  );
}

/**
 * Impede que o sistema fique sem administrador ativo. Chame ANTES de desativar, excluir ou rebaixar um
 * administrador. (Se mesmo assim ficar sem nenhum, o servidor recria o primeiro a partir de ADMIN_EMAIL na próxima partida.)
 */
export async function exigirOutroAdministradorAtivo(alvo) {
  if (alvo.papel !== PAPEIS.ADMINISTRADOR || !alvo.ativo) return;
  if ((await usuarioRepositorio.contarAdministradoresAtivos()) <= 1) {
    throw regraDeNegocio('Este é o único administrador ativo. Cadastre outro antes de desativar ou excluir esta conta.');
  }
}
