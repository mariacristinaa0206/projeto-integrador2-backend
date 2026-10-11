import { ACOES_AUDITORIA, PAPEIS, TIPOS_ACOMPANHAMENTO } from '../configuracao/constantes.js';
import * as acompanhamentoRepositorio from '../repositorios/acompanhamento.repositorio.js';
import { reservarId } from '../repositorios/ids.repositorio.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import { serializarAcompanhamento } from '../serializadores/acompanhamento.serializador.js';
import { cifrarTexto, decifrarTexto } from '../utilitarios/cifra.js';
import { contextoCifra } from '../utilitarios/contextoCifra.js';
import { diferencaEmDias, hojeISO } from '../utilitarios/datas.js';
import { naoEncontrado, regraDeNegocio } from '../utilitarios/erros.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';
import * as auditoriaServico from './auditoria.servico.js';
import * as vinculoServico from './vinculo.servico.js';

/**
 * Acompanhamento (TB_ACOMPANHAMENTO): anotações da equipe sobre um aluno. IMUTÁVEIS e CIFRADAS.
 *
 * Quem escreve e quem lê:
 *   - Psicólogo (com vínculo ativo): escreve anotação PSICOLÓGICA. Lê as suas próprias anotações psicológicas
 *     (sigilo profissional: nenhum colega lê) e, enquanto o vínculo estiver ativo, as pedagógicas.
 *   - Pedagógico: escreve anotação PEDAGÓGICA sobre qualquer aluno ativo. Lê as pedagógicas de qualquer autor,
 *     nunca as psicológicas.
 *   - O próprio aluno e os demais perfis não acessam por esta API.
 */

const DIAS_MAXIMOS_NO_PASSADO = 365;

const decifrar = (acompanhamento) =>
  decifrarTexto(acompanhamento.observacao, contextoCifra.acompanhamentoObservacao(acompanhamento.id));

/** Garante que o aluno existe/está ativo e, para o psicólogo, que há vínculo. Responde 404 em qualquer falha. */
async function exigirAlcance(autenticado, alunoId) {
  if (autenticado.papel === PAPEIS.PSICOLOGO) {
    await vinculoServico.exigirAlunoVinculado(autenticado.id, alunoId);
  }
  if (!(await usuarioRepositorio.buscarAlunoAtivo(alunoId))) throw naoEncontrado('Aluno não encontrado.');
}

export async function criar(autenticado, alunoId, { observacao, data }) {
  await exigirAlcance(autenticado, alunoId);

  const dia = data ?? hojeISO();
  const diferenca = diferencaEmDias(dia, hojeISO());
  if (diferenca < 0) throw regraDeNegocio('A data do acompanhamento não pode estar no futuro.');
  if (diferenca > DIAS_MAXIMOS_NO_PASSADO) throw regraDeNegocio('A data do acompanhamento é antiga demais.');

  const id = await reservarId('acompanhamentos');
  const acompanhamento = await acompanhamentoRepositorio.criar({
    id,
    usuarioId: alunoId,
    autorId: autenticado.id,
    tipo: autenticado.papel === PAPEIS.PSICOLOGO ? TIPOS_ACOMPANHAMENTO.PSICOLOGICO : TIPOS_ACOMPANHAMENTO.PEDAGOGICO,
    observacao: cifrarTexto(observacao, contextoCifra.acompanhamentoObservacao(id)),
    data: dia
  });

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.ACOMPANHAMENTO_CRIADO,
    alvoUsuarioId: alunoId,
    recurso: 'acompanhamentos',
    recursoId: id
  });
  return serializarAcompanhamento(acompanhamento, observacao);
}

export async function listar(autenticado, alunoId, consulta) {
  const aluno = await usuarioRepositorio.buscarPorId(alunoId);
  if (!aluno || aluno.papel !== PAPEIS.ALUNO) throw naoEncontrado('Aluno não encontrado.');

  let visibilidade = { pedagogicas: true, psicologicasDoAutorId: null };

  if (autenticado.papel === PAPEIS.PSICOLOGO) {
    // O psicólogo sempre lê as suas anotações psicológicas; as pedagógicas só com vínculo ativo.
    const temVinculo = await vinculoServico.possuiVinculoAtivo(autenticado.id, alunoId);
    visibilidade = { psicologicasDoAutorId: autenticado.id, pedagogicas: temVinculo };

    // Sem vínculo e sem anotação própria, nada deste aluno é dele: 404, para não revelar quais ids são de alunos.
    if (!temVinculo && (await acompanhamentoRepositorio.contarVisiveis({ alunoId, visibilidade })) === 0) {
      throw naoEncontrado('Aluno não encontrado entre os seus acompanhados.');
    }
  }

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.ACOMPANHAMENTOS_CONSULTADOS,
    alvoUsuarioId: alunoId,
    recurso: 'acompanhamentos'
  });

  const [itens, total] = await Promise.all([
    acompanhamentoRepositorio.listarVisiveis({ alunoId, visibilidade, ...calcularDeslocamento(consulta) }),
    acompanhamentoRepositorio.contarVisiveis({ alunoId, visibilidade })
  ]);
  return respostaPaginada(itens.map((item) => serializarAcompanhamento(item, decifrar(item))), total, consulta);
}
