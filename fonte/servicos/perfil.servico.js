import { ACOES_AUDITORIA } from '../configuracao/constantes.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import { serializarConta } from '../serializadores/usuario.serializador.js';
import { ErroApp, naoAutenticado, requisicaoInvalida } from '../utilitarios/erros.js';
import { conferirSenha } from '../utilitarios/senha.js';
import * as auditoriaServico from './auditoria.servico.js';
import * as contaServico from './conta.servico.js';

async function exigirSenhaAtual(atual, senhaInformada) {
  if (!senhaInformada) {
    throw requisicaoInvalida('Informe a senha atual para continuar.', [
      { campo: 'corpo.senhaAtual', mensagem: 'Obrigatória para esta operação.' }
    ]);
  }
  if (!(await conferirSenha(senhaInformada, atual.senhaHash))) {
    throw new ErroApp(403, 'SENHA_ATUAL_INCORRETA', 'Senha atual incorreta.');
  }
}

export async function obter(autenticado) {
  const conta = await usuarioRepositorio.buscarPorId(autenticado.id);
  if (!conta) throw naoAutenticado();
  return serializarConta(conta);
}

/**
 * Edita o próprio nome e e-mail. Trocar o e-mail exige a senha atual (defesa contra token roubado).
 * Turma e nível de ensino só a escola altera: eles definem o conteúdo e os indicadores do aluno.
 */
export async function atualizar(autenticado, { nome, email, senhaAtual }) {
  const atual = await usuarioRepositorio.buscarPorIdComSenha(autenticado.id);
  if (!atual) throw naoAutenticado();

  const trocouEmail = email !== atual.email;
  if (trocouEmail) {
    await exigirSenhaAtual(atual, senhaAtual);
    await contaServico.garantirEmailLivre(email, atual.id);
  }

  const atualizado = await contaServico.traduzindoConflitoDeEmail(() =>
    usuarioRepositorio.atualizar(atual.id, { nome, email })
  );

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.CONTA_ALTERADA,
    alvoUsuarioId: atual.id,
    detalhes: { campos: trocouEmail ? ['nome', 'email'] : ['nome'] }
  });
  return { usuario: serializarConta(atualizado) };
}

/**
 * Exclusão da própria conta (direito de eliminação, LGPD): apaga a conta e TUDO o que depende dela (registros,
 * metas, sessões, conversas, vínculos...). A trilha de auditoria permanece, sem conteúdo.
 */
export async function excluir(autenticado, { senhaAtual }) {
  const atual = await usuarioRepositorio.buscarPorIdComSenha(autenticado.id);
  if (!atual) throw naoAutenticado();
  await exigirSenhaAtual(atual, senhaAtual);
  await contaServico.exigirOutroAdministradorAtivo(atual);

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.CONTA_EXCLUIDA,
    alvoUsuarioId: atual.id,
    detalhes: { papel: atual.papel, porConta: 'propria' }
  });
  await usuarioRepositorio.excluir(atual.id);
}
