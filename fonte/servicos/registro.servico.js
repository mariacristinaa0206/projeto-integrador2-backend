import { APOIO_IMEDIATO, EMOCOES, INTENSIDADES, LIMITES, PAPEIS, PAPEIS_QUE_REGISTRAM_EMOCAO } from '../configuracao/constantes.js';
import * as registroRepositorio from '../repositorios/registro.repositorio.js';
import { reservarId } from '../repositorios/ids.repositorio.js';
import { serializarCatalogoDeEmocoes, serializarRegistro } from '../serializadores/registro.serializador.js';
import { cifrarTexto, decifrarTexto } from '../utilitarios/cifra.js';
import { contextoCifra } from '../utilitarios/contextoCifra.js';
import { hojeISO, intervaloDoMes } from '../utilitarios/datas.js';
import { naoEncontrado, proibido, regraDeNegocio } from '../utilitarios/erros.js';
import { ehDesconfortavel } from '../utilitarios/indicadores.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';
import { registrador, resumirErro } from '../utilitarios/registrador.js';
import * as alertaServico from './alerta.servico.js';
import * as conteudoServico from './conteudo.servico.js';

/**
 * Registro do estado emocional (RF02) e anotações sobre ele (RF09).
 * Cada pessoa só enxerga e altera os PRÓPRIOS registros: a consulta SEMPRE filtra por `usuarioId` do token.
 * (O acesso do psicólogo ao diário de um aluno vinculado fica em aluno.servico.js e é auditado.)
 */

const decifrarObservacao = (registro) =>
  decifrarTexto(registro.observacao, contextoCifra.registroObservacao(registro.id));

function exigirQuemRegistra(autenticado) {
  if (!PAPEIS_QUE_REGISTRAM_EMOCAO.includes(autenticado.papel)) {
    throw proibido('Seu perfil não faz registros emocionais.');
  }
}

/** Escala de sentimentos do PDF (RF02), para o front montar a tela. */
export function catalogo() {
  return {
    emocoes: serializarCatalogoDeEmocoes(),
    intensidades: Object.values(INTENSIDADES)
  };
}

/**
 * O dia vem do relógio de Brasília (nunca do cliente) e o humor é derivado da emoção. Se a emoção for desconfortável,
 * a resposta já traz as orientações iniciais (RF04); em caso de intensidade alta, também o apoio imediato.
 */
export async function registrar(autenticado, { emocao, intensidade, observacao }) {
  exigirQuemRegistra(autenticado);

  const dia = hojeISO();
  if ((await registroRepositorio.contarDoDia(autenticado.id, dia)) >= LIMITES.maxRegistrosPorDia) {
    throw regraDeNegocio(`Você já fez ${LIMITES.maxRegistrosPorDia} registros hoje. Volte amanhã.`);
  }

  const id = await reservarId('registros_emocionais');
  const registro = await registroRepositorio.criar({
    id,
    usuarioId: autenticado.id,
    emocao,
    intensidade,
    observacao: cifrarTexto(observacao, contextoCifra.registroObservacao(id)),
    dia
  });

  // O registro JÁ foi gravado: uma falha na avaliação de alertas não pode virar erro para o aluno
  // (ele tentaria de novo e duplicaria). Fica no log técnico e a próxima avaliação recupera.
  if (autenticado.papel === PAPEIS.ALUNO) {
    try {
      await alertaServico.avaliarAluno(autenticado.id);
    } catch (erro) {
      registrador.erro('falha_ao_avaliar_alertas', { idRequisicao: autenticado.idRequisicao, ...resumirErro(erro) });
    }
  }

  const desconfortavel = ehDesconfortavel(emocao);
  const precisaDeApoio = intensidade === INTENSIDADES.ALTA || emocao === 'muito_triste';
  return {
    registro: serializarRegistro(registro, observacao),
    orientacoes: desconfortavel ? await conteudoServico.orientacoesDoTema(autenticado, EMOCOES[emocao].tema, 2) : [],
    apoioImediato: desconfortavel && precisaDeApoio ? APOIO_IMEDIATO : null
  };
}

/** Intervalo pedido: `mes` vira o primeiro e o último dia; senão vale `de`/`ate`. */
export function resolverPeriodo({ mes, de, ate }) {
  if (mes) {
    const intervalo = intervaloDoMes(mes);
    return { de: intervalo.inicio, ate: intervalo.fim };
  }
  return { de, ate };
}

export async function listar(autenticado, consulta) {
  exigirQuemRegistra(autenticado);
  const filtros = { usuarioId: autenticado.id, emocao: consulta.emocao, ...resolverPeriodo(consulta) };
  const [registros, total] = await Promise.all([
    registroRepositorio.listar({ ...filtros, ...calcularDeslocamento(consulta) }),
    registroRepositorio.contar(filtros)
  ]);
  return respostaPaginada(
    registros.map((registro) => serializarRegistro(registro, decifrarObservacao(registro))),
    total,
    consulta
  );
}

export async function obter(autenticado, id) {
  exigirQuemRegistra(autenticado);
  const registro = await registroRepositorio.buscarDoUsuario(id, autenticado.id);
  if (!registro) throw naoEncontrado('Registro não encontrado.');
  return serializarRegistro(registro, decifrarObservacao(registro));
}

/** RF09: editar (ou apagar, com null) a anotação de um registro. Emoção e intensidade não mudam depois de gravadas. */
export async function atualizarObservacao(autenticado, id, { observacao }) {
  exigirQuemRegistra(autenticado);
  const alterados = await registroRepositorio.atualizarObservacao(
    id,
    autenticado.id,
    cifrarTexto(observacao, contextoCifra.registroObservacao(id))
  );
  if (alterados === 0) throw naoEncontrado('Registro não encontrado.');
  return obter(autenticado, id);
}

/** Direito de eliminação: o próprio titular apaga um registro seu. */
export async function excluir(autenticado, id) {
  exigirQuemRegistra(autenticado);
  if ((await registroRepositorio.excluir(id, autenticado.id)) === 0) throw naoEncontrado('Registro não encontrado.');
}
