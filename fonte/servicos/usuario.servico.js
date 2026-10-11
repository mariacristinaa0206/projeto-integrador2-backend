import { ACOES_AUDITORIA, ORIGENS_CONSENTIMENTO, PAPEIS } from '../configuracao/constantes.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import { serializarConta } from '../serializadores/usuario.serializador.js';
import { naoEncontrado, proibido, regraDeNegocio, requisicaoInvalida } from '../utilitarios/erros.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';
import { gerarHashSenha, gerarSenhaTemporaria } from '../utilitarios/senha.js';
import * as auditoriaServico from './auditoria.servico.js';
import * as contaServico from './conta.servico.js';

/**
 * Gestão de contas pela escola (RF01: incluir, alterar e excluir usuários).
 *   - Administrador: qualquer perfil.
 *   - Pedagógico: somente ALUNOS (cadastra, edita, desativa). Não toca em contas da equipe.
 * A senha é gerada pelo servidor, mostrada UMA vez e vale só até o primeiro acesso (o usuário é obrigado a trocá-la).
 */

const ehAdministrador = (autenticado) => autenticado.papel === PAPEIS.ADMINISTRADOR;

/** Conta que o usuário pode gerir. Fora do alcance responde 404, igual a inexistente. */
async function carregarGerenciavel(autenticado, id) {
  const alvo = await usuarioRepositorio.buscarPorId(id);
  if (!alvo || (!ehAdministrador(autenticado) && alvo.papel !== PAPEIS.ALUNO)) {
    throw naoEncontrado('Usuário não encontrado.');
  }
  return alvo;
}

export async function listar(autenticado, consulta) {
  const filtros = {
    papel: ehAdministrador(autenticado) ? consulta.papel : PAPEIS.ALUNO,
    busca: consulta.busca,
    ativo: consulta.ativo,
    turma: consulta.turma,
    nivelEnsino: consulta.nivelEnsino
  };
  const [usuarios, total] = await Promise.all([
    usuarioRepositorio.listar({ ...filtros, ...calcularDeslocamento(consulta) }),
    usuarioRepositorio.contar(filtros)
  ]);
  return respostaPaginada(usuarios.map(serializarConta), total, consulta);
}

export async function obter(autenticado, id) {
  return serializarConta(await carregarGerenciavel(autenticado, id));
}

export async function criar(autenticado, dados) {
  if (!ehAdministrador(autenticado) && dados.papel !== PAPEIS.ALUNO) {
    throw proibido('A coordenação pedagógica só cadastra alunos.');
  }

  const senhaTemporaria = gerarSenhaTemporaria();
  const aluno =
    dados.papel === PAPEIS.ALUNO
      ? {
          turma: dados.turma,
          nivelEnsino: dados.nivelEnsino,
          consentimentoEm: new Date(),
          consentimentoOrigem: ORIGENS_CONSENTIMENTO.RESPONSAVEL,
          consentimentoRegistradoPor: autenticado.id
        }
      : undefined;

  const conta = await contaServico.criarConta({
    papel: dados.papel,
    nome: dados.nome,
    email: dados.email,
    senha: senhaTemporaria,
    deveTrocarSenha: true,
    aluno
  });

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.CONTA_CRIADA,
    alvoUsuarioId: conta.id,
    recurso: 'usuarios',
    recursoId: conta.id,
    detalhes: { papel: conta.papel, origem: 'cadastro_pela_escola' }
  });

  return { usuario: serializarConta(conta), senhaTemporaria };
}

export async function atualizar(autenticado, id, dados) {
  const alvo = await carregarGerenciavel(autenticado, id);

  const alteraPerfilDeAluno = dados.turma !== undefined || dados.nivelEnsino !== undefined;
  if (alteraPerfilDeAluno && alvo.papel !== PAPEIS.ALUNO) {
    throw requisicaoInvalida('Dados inválidos.', [
      { campo: 'corpo.turma', mensagem: 'Turma e nível de ensino só existem para alunos.' }
    ]);
  }

  if (dados.email !== undefined && dados.email !== alvo.email) await contaServico.garantirEmailLivre(dados.email, alvo.id);

  const alteracoes = { nome: dados.nome, email: dados.email };
  if (alteraPerfilDeAluno) alteracoes.aluno = { turma: dados.turma, nivelEnsino: dados.nivelEnsino };

  const atualizado = await contaServico.traduzindoConflitoDeEmail(() => usuarioRepositorio.atualizar(alvo.id, alteracoes));

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.CONTA_ALTERADA,
    alvoUsuarioId: alvo.id,
    detalhes: { campos: Object.keys(dados) }
  });
  return serializarConta(atualizado);
}

/** Ativa ou desativa. Desativar derruba as sessões abertas na hora (versão do token) e impede novo login. */
export async function alterarSituacao(autenticado, id, { ativo }) {
  const alvo = await carregarGerenciavel(autenticado, id);

  if (alvo.id === autenticado.id) throw regraDeNegocio('Você não pode alterar a situação da sua própria conta.');
  if (!ativo) await contaServico.exigirOutroAdministradorAtivo(alvo);

  const atualizado = await usuarioRepositorio.atualizar(alvo.id, {
    ativo,
    ...(ativo ? {} : { versaoToken: { increment: 1 } })
  });

  await auditoriaServico.registrar(autenticado, {
    acao: ativo ? ACOES_AUDITORIA.CONTA_ATIVADA : ACOES_AUDITORIA.CONTA_DESATIVADA,
    alvoUsuarioId: alvo.id
  });
  return serializarConta(atualizado);
}

/**
 * Nova senha provisória (esqueci a senha). Só o administrador: quem redefine passa a conhecer a senha por um
 * instante, então isso não é delegado à coordenação. Derruba as sessões abertas e obriga a troca no próximo acesso.
 */
export async function redefinirSenha(autenticado, id) {
  if (!ehAdministrador(autenticado)) throw proibido('Somente o administrador redefine senhas.');

  const alvo = await usuarioRepositorio.buscarPorId(id);
  if (!alvo) throw naoEncontrado('Usuário não encontrado.');
  if (alvo.id === autenticado.id) throw regraDeNegocio('Para trocar a sua própria senha, use "trocar senha".');

  const senhaTemporaria = gerarSenhaTemporaria();
  await usuarioRepositorio.atualizar(alvo.id, {
    senhaHash: await gerarHashSenha(senhaTemporaria),
    deveTrocarSenha: true,
    versaoToken: { increment: 1 }
  });

  await auditoriaServico.registrar(autenticado, { acao: ACOES_AUDITORIA.SENHA_REDEFINIDA, alvoUsuarioId: alvo.id });
  return { senhaTemporaria };
}

/** Exclusão permanente (apaga também tudo o que depende da conta). Só o administrador. */
export async function excluir(autenticado, id) {
  if (!ehAdministrador(autenticado)) throw proibido('Somente o administrador exclui contas.');

  const alvo = await usuarioRepositorio.buscarPorId(id);
  if (!alvo) throw naoEncontrado('Usuário não encontrado.');
  if (alvo.id === autenticado.id) throw regraDeNegocio('Para excluir a sua própria conta, use a exclusão do perfil.');
  await contaServico.exigirOutroAdministradorAtivo(alvo);

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.CONTA_EXCLUIDA,
    alvoUsuarioId: alvo.id,
    detalhes: { papel: alvo.papel, porConta: 'administrador' }
  });
  await usuarioRepositorio.excluir(alvo.id);
}
