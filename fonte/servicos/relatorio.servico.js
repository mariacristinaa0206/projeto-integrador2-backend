import { ACOES_AUDITORIA, PAPEIS, PAPEIS_PAINEL_COLETIVO, PAPEIS_QUE_REGISTRAM_EMOCAO, TIPOS_RELATORIO } from '../configuracao/constantes.js';
import { reservarId } from '../repositorios/ids.repositorio.js';
import * as registroRepositorio from '../repositorios/registro.repositorio.js';
import * as relatorioRepositorio from '../repositorios/relatorio.repositorio.js';
import { serializarRelatorio, serializarRelatorioResumo } from '../serializadores/relatorio.serializador.js';
import { cifrarJson, decifrarJson } from '../utilitarios/cifra.js';
import { contextoCifra } from '../utilitarios/contextoCifra.js';
import { intervaloDoMes, mesAnterior, mesAtual } from '../utilitarios/datas.js';
import { naoEncontrado, proibido, regraDeNegocio } from '../utilitarios/erros.js';
import { montarRelatorioEmocional } from '../utilitarios/indicadores.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';
import * as auditoriaServico from './auditoria.servico.js';
import * as estatisticaServico from './estatistica.servico.js';
import * as painelServico from './painel.servico.js';
import * as vinculoServico from './vinculo.servico.js';

/**
 * Relatórios (RF03). Cada pedido calcula os números na hora e GRAVA um instantâneo (TB_RELATORIO), com os dados
 * CIFRADOS. Três tipos:
 *   - emocional  : o relatório mensal da própria pessoa (ou de um aluno acompanhado, para o psicólogo vinculado);
 *   - pedagogico : indicadores coletivos por turma e nível (com as travas de anonimato);
 *   - estatistico: uso da plataforma (só administrador).
 */

const mesParaBR = (mes) => `${mes.slice(5)}/${mes.slice(0, 4)}`;

function exigirMesJaIniciado(mes) {
  if (mes > mesAtual()) throw regraDeNegocio('Este mês ainda não começou.');
}

async function gerarEmocional(autenticado, { mes, alunoId }) {
  const alvoId = alunoId ?? autenticado.id;

  if (alvoId === autenticado.id) {
    if (!PAPEIS_QUE_REGISTRAM_EMOCAO.includes(autenticado.papel)) {
      throw proibido('Seu perfil não tem relatório emocional pessoal.');
    }
  } else {
    // Relatório de OUTRA pessoa: só o psicólogo, só de aluno com vínculo ativo.
    if (autenticado.papel !== PAPEIS.PSICOLOGO) throw naoEncontrado('Aluno não encontrado entre os seus acompanhados.');
    await vinculoServico.exigirAlunoVinculado(autenticado.id, alvoId);
  }

  const periodo = intervaloDoMes(mes);
  const anterior = intervaloDoMes(mesAnterior(mes));
  const [registros, registrosAnteriores] = await Promise.all([
    registroRepositorio.listarParaCalculo({ usuarioId: alvoId, de: periodo.inicio, ate: periodo.fim }),
    registroRepositorio.listarParaCalculo({ usuarioId: alvoId, de: anterior.inicio, ate: anterior.fim })
  ]);

  return {
    tipo: TIPOS_RELATORIO.EMOCIONAL,
    usuarioId: alvoId,
    periodo,
    descricao: `Relatório emocional de ${mesParaBR(mes)}`,
    dados: montarRelatorioEmocional({ periodo, registros, registrosAnteriores })
  };
}

async function gerarPedagogico(autenticado, { mes, turma, nivelEnsino }) {
  if (!PAPEIS_PAINEL_COLETIVO.includes(autenticado.papel)) throw proibido();
  const periodo = intervaloDoMes(mes);
  const recorte = [turma && `turma ${turma}`, nivelEnsino && `nível ${nivelEnsino}`].filter(Boolean).join(', ');
  return {
    tipo: TIPOS_RELATORIO.PEDAGOGICO,
    usuarioId: null,
    periodo,
    descricao: `Relatório pedagógico de ${mesParaBR(mes)}${recorte ? ` (${recorte})` : ''}`,
    dados: await painelServico.indicadoresColetivos({ mes, turma, nivelEnsino })
  };
}

async function gerarEstatistico(autenticado, { mes }) {
  if (autenticado.papel !== PAPEIS.ADMINISTRADOR) throw proibido('Somente o administrador gera o relatório estatístico.');
  const periodo = intervaloDoMes(mes);
  return {
    tipo: TIPOS_RELATORIO.ESTATISTICO,
    usuarioId: null,
    periodo,
    descricao: `Relatório estatístico de ${mesParaBR(mes)}`,
    dados: await estatisticaServico.montarRelatorio(periodo)
  };
}

const geradores = {
  [TIPOS_RELATORIO.EMOCIONAL]: gerarEmocional,
  [TIPOS_RELATORIO.PEDAGOGICO]: gerarPedagogico,
  [TIPOS_RELATORIO.ESTATISTICO]: gerarEstatistico
};

export async function gerar(autenticado, dados) {
  exigirMesJaIniciado(dados.mes);
  const { tipo, usuarioId, periodo, descricao, dados: conteudo } = await geradores[dados.tipo](autenticado, dados);

  const id = await reservarId('relatorios');
  const relatorio = await relatorioRepositorio.criar({
    id,
    tipo,
    usuarioId,
    geradoPor: autenticado.id,
    periodoInicio: periodo.inicio,
    periodoFim: periodo.fim,
    descricao,
    dados: cifrarJson(conteudo, contextoCifra.relatorioDados(id))
  });

  await auditoriaServico.registrar(autenticado, {
    acao: ACOES_AUDITORIA.RELATORIO_GERADO,
    alvoUsuarioId: usuarioId ?? undefined,
    recurso: 'relatorios',
    recursoId: id,
    detalhes: { tipo, mes: dados.mes }
  });
  return serializarRelatorio(relatorio, conteudo);
}

/** Relatórios que a pessoa gerou ou que são sobre ela. */
export async function listar(autenticado, consulta) {
  const filtros = { pessoaId: autenticado.id, tipo: consulta.tipo };
  const [relatorios, total] = await Promise.all([
    relatorioRepositorio.listar({ ...filtros, ...calcularDeslocamento(consulta) }),
    relatorioRepositorio.contar(filtros)
  ]);
  return respostaPaginada(relatorios.map(serializarRelatorioResumo), total, consulta);
}

/**
 * Quem pode abrir um relatório já gravado:
 *   - emocional: a própria pessoa; ou o psicólogo que o gerou, ENQUANTO o vínculo com o aluno estiver ativo
 *     (se o aluno encerrar o acesso, os relatórios antigos dele deixam de abrir para o psicólogo);
 *   - pedagógico: quem vê os painéis coletivos;
 *   - estatístico: o administrador.
 */
async function podeAbrir(autenticado, relatorio) {
  if (relatorio.tipo === TIPOS_RELATORIO.EMOCIONAL) {
    if (relatorio.usuarioId === autenticado.id) return true;
    return (
      autenticado.papel === PAPEIS.PSICOLOGO &&
      relatorio.geradoPor === autenticado.id &&
      (await vinculoServico.possuiVinculoAtivo(autenticado.id, relatorio.usuarioId))
    );
  }
  if (relatorio.tipo === TIPOS_RELATORIO.PEDAGOGICO) return PAPEIS_PAINEL_COLETIVO.includes(autenticado.papel);
  return autenticado.papel === PAPEIS.ADMINISTRADOR;
}

export async function obter(autenticado, id) {
  const relatorio = await relatorioRepositorio.buscarPorId(id);
  if (!relatorio || !(await podeAbrir(autenticado, relatorio))) throw naoEncontrado('Relatório não encontrado.');

  if (relatorio.tipo === TIPOS_RELATORIO.EMOCIONAL && relatorio.usuarioId !== autenticado.id) {
    await auditoriaServico.registrar(autenticado, {
      acao: ACOES_AUDITORIA.RELATORIO_CONSULTADO,
      alvoUsuarioId: relatorio.usuarioId,
      recurso: 'relatorios',
      recursoId: id
    });
  }
  return serializarRelatorio(relatorio, decifrarJson(relatorio.dados, contextoCifra.relatorioDados(id)));
}
