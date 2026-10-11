import { LIMITES, PAPEIS_QUE_REGISTRAM_EMOCAO, STATUS_META } from '../configuracao/constantes.js';
import { reservarId } from '../repositorios/ids.repositorio.js';
import * as metaRepositorio from '../repositorios/meta.repositorio.js';
import { serializarMeta } from '../serializadores/meta.serializador.js';
import { cifrarTexto, decifrarTexto } from '../utilitarios/cifra.js';
import { contextoCifra } from '../utilitarios/contextoCifra.js';
import { conflito, naoEncontrado, proibido } from '../utilitarios/erros.js';
import { calcularDeslocamento, respostaPaginada } from '../utilitarios/paginacao.js';

/**
 * Metas de saúde mental (RF10): redução do estresse, autocuidado, sono... O título é íntimo e fica CIFRADO.
 * Só o dono enxerga e altera: toda consulta filtra pelo `usuarioId` do token.
 */

const decifrarTitulo = (meta) => decifrarTexto(meta.titulo, contextoCifra.metaTitulo(meta.id));

function exigirQuemTemMetas(autenticado) {
  if (!PAPEIS_QUE_REGISTRAM_EMOCAO.includes(autenticado.papel)) throw proibido('Seu perfil não usa metas pessoais.');
}

async function garantirEspacoParaMetaAtiva(usuarioId) {
  if ((await metaRepositorio.contarEmAndamento(usuarioId)) >= LIMITES.maxMetasEmAndamento) {
    throw conflito(`Você já tem ${LIMITES.maxMetasEmAndamento} metas em andamento. Conclua ou abandone alguma antes de criar outra.`);
  }
}

export async function criar(autenticado, { titulo, categoria, prazo }) {
  exigirQuemTemMetas(autenticado);
  await garantirEspacoParaMetaAtiva(autenticado.id);

  const id = await reservarId('metas');
  const meta = await metaRepositorio.criar({
    id,
    usuarioId: autenticado.id,
    titulo: cifrarTexto(titulo, contextoCifra.metaTitulo(id)),
    categoria,
    prazo: prazo ?? undefined
  });
  return serializarMeta(meta, titulo);
}

export async function listar(autenticado, consulta) {
  exigirQuemTemMetas(autenticado);
  const filtros = { usuarioId: autenticado.id, status: consulta.status };
  const [metas, total] = await Promise.all([
    metaRepositorio.listar({ ...filtros, ...calcularDeslocamento(consulta) }),
    metaRepositorio.contar(filtros)
  ]);
  return respostaPaginada(metas.map((meta) => serializarMeta(meta, decifrarTitulo(meta))), total, consulta);
}

async function carregar(autenticado, id) {
  exigirQuemTemMetas(autenticado);
  const meta = await metaRepositorio.buscarDoUsuario(id, autenticado.id);
  if (!meta) throw naoEncontrado('Meta não encontrada.');
  return meta;
}

export async function obter(autenticado, id) {
  const meta = await carregar(autenticado, id);
  return serializarMeta(meta, decifrarTitulo(meta));
}

/** Atualização parcial. Marcar como concluída grava a data; sair de "concluída" a limpa. */
export async function atualizar(autenticado, id, dados) {
  const atual = await carregar(autenticado, id);

  const alteracoes = {};
  if (dados.titulo !== undefined) alteracoes.titulo = cifrarTexto(dados.titulo, contextoCifra.metaTitulo(id));
  if (dados.categoria !== undefined) alteracoes.categoria = dados.categoria;
  if (dados.prazo !== undefined) alteracoes.prazo = dados.prazo; // null remove o prazo

  if (dados.status !== undefined && dados.status !== atual.status) {
    if (dados.status === STATUS_META.EM_ANDAMENTO) await garantirEspacoParaMetaAtiva(autenticado.id);
    alteracoes.status = dados.status;
    alteracoes.concluidaEm = dados.status === STATUS_META.CONCLUIDA ? new Date() : null;
  }

  await metaRepositorio.atualizar(id, autenticado.id, alteracoes);
  return obter(autenticado, id);
}

export async function excluir(autenticado, id) {
  exigirQuemTemMetas(autenticado);
  if ((await metaRepositorio.excluir(id, autenticado.id)) === 0) throw naoEncontrado('Meta não encontrada.');
}
