import { LIMITES, PAPEIS, PAPEIS_APOIO } from '../configuracao/constantes.js';
import * as conversaRepositorio from '../repositorios/conversa.repositorio.js';
import { reservarId } from '../repositorios/ids.repositorio.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import { serializarConversa, serializarMensagem } from '../serializadores/conversa.serializador.js';
import { cifrarTexto, decifrarTexto } from '../utilitarios/cifra.js';
import { contextoCifra } from '../utilitarios/contextoCifra.js';
import { conflito, naoEncontrado, proibido, requisicaoInvalida } from '../utilitarios/erros.js';
import * as vinculoServico from './vinculo.servico.js';

/**
 * Chat seguro entre o aluno e a equipe de apoio (RF07). Mensagens CIFRADAS no banco; só os dois participantes
 * enxergam a conversa (qualquer outra pessoa recebe 404, inclusive o administrador).
 *
 * Quem inicia: o ALUNO abre conversa com qualquer profissional de apoio. O PSICÓLOGO só abre com aluno que ele
 * acompanha (vínculo ativo); o pedagógico só responde. Assim ninguém da equipe puxa conversa com um aluno aleatório.
 *
 * "Tempo real" por leitura incremental: o cliente consulta `?depois=<último id>` a cada poucos segundos e recebe
 * só o que é novo. Sem estado no servidor, então escala com várias instâncias.
 */

const decifrar = (mensagem) => decifrarTexto(mensagem.texto, contextoCifra.mensagemTexto(mensagem.id));
const PREVIA_MAXIMA = 80;

function exigirQuemConversa(autenticado) {
  if (autenticado.papel !== PAPEIS.ALUNO && !PAPEIS_APOIO.includes(autenticado.papel)) {
    throw proibido('Seu perfil não usa o chat.');
  }
}

const previa = (texto) => (texto.length > PREVIA_MAXIMA ? `${texto.slice(0, PREVIA_MAXIMA - 1)}…` : texto);

export async function abrir(autenticado, { profissionalId, alunoId }) {
  exigirQuemConversa(autenticado);

  let conversa;
  if (autenticado.papel === PAPEIS.ALUNO) {
    if (profissionalId === undefined) {
      throw requisicaoInvalida('Dados inválidos.', [{ campo: 'corpo.profissionalId', mensagem: 'Informe o profissional.' }]);
    }
    const profissional = await usuarioRepositorio.buscarAtivoPorPapeis(profissionalId, PAPEIS_APOIO);
    if (!profissional) throw naoEncontrado('Profissional não encontrado.');
    conversa = await conversaRepositorio.acharOuCriar(autenticado.id, profissional.id);
  } else {
    if (alunoId === undefined) {
      throw requisicaoInvalida('Dados inválidos.', [{ campo: 'corpo.alunoId', mensagem: 'Informe o aluno.' }]);
    }
    // Reabrir uma conversa que já existe é sempre permitido; criar uma nova, só o psicólogo com vínculo ativo.
    conversa = await conversaRepositorio.buscarEntre(alunoId, autenticado.id);
    if (!conversa) {
      if (autenticado.papel !== PAPEIS.PSICOLOGO) throw naoEncontrado('Conversa não encontrada.');
      await vinculoServico.exigirAlunoVinculado(autenticado.id, alunoId);
      if (!(await usuarioRepositorio.buscarAlunoAtivo(alunoId))) throw naoEncontrado('Aluno não encontrado.');
      conversa = await conversaRepositorio.acharOuCriar(alunoId, autenticado.id);
    }
  }
  return serializarConversa(conversa, autenticado.id);
}

export async function listar(autenticado) {
  exigirQuemConversa(autenticado);
  const conversas = await conversaRepositorio.listarDoUsuario(autenticado.id, LIMITES.maxNotificacoes);

  const naoLidas = await conversaRepositorio.contarNaoLidasPorConversa(
    conversas.map((conversa) => conversa.id),
    autenticado.id
  );
  const ultimas = await Promise.all(conversas.map((conversa) => conversaRepositorio.buscarUltimaMensagem(conversa.id)));

  return {
    itens: conversas.map((conversa, indice) =>
      serializarConversa(conversa, autenticado.id, {
        naoLidas: naoLidas.get(conversa.id) ?? 0,
        ultimaMensagem: ultimas[indice] ? previa(decifrar(ultimas[indice])) : null
      })
    )
  };
}

async function carregarConversa(autenticado, id) {
  exigirQuemConversa(autenticado);
  const conversa = await conversaRepositorio.buscarDoParticipante(id, autenticado.id);
  if (!conversa) throw naoEncontrado('Conversa não encontrada.');
  return conversa;
}

/** Sem `depois`: as mais recentes. Com `depois`: só as posteriores àquele id (polling). Sempre em ordem cronológica. */
export async function lerMensagens(autenticado, id, { depois, limite }) {
  await carregarConversa(autenticado, id);
  const mensagens = depois
    ? await conversaRepositorio.listarDepois(id, depois, limite)
    : await conversaRepositorio.listarUltimas(id, limite);
  return {
    itens: mensagens.map((mensagem) => serializarMensagem(mensagem, decifrar(mensagem), autenticado.id)),
    ultimoId: mensagens.length > 0 ? mensagens[mensagens.length - 1].id : (depois ?? null)
  };
}

export async function enviar(autenticado, id, { texto }) {
  const conversa = await carregarConversa(autenticado, id);

  const destinatarioId = conversa.alunoId === autenticado.id ? conversa.profissionalId : conversa.alunoId;
  const destinatario = await usuarioRepositorio.buscarCredencialPorId(destinatarioId);
  if (!destinatario?.ativo) throw conflito('Esta pessoa não está mais disponível para conversar.');

  const mensagemId = await reservarId('mensagens');
  const mensagem = await conversaRepositorio.criarMensagem({
    id: mensagemId,
    conversaId: id,
    autorId: autenticado.id,
    texto: cifrarTexto(texto, contextoCifra.mensagemTexto(mensagemId))
  });
  return serializarMensagem(mensagem, texto, autenticado.id);
}

/** Marca como lidas as mensagens da outra pessoa. Idempotente. */
export async function marcarComoLidas(autenticado, id) {
  await carregarConversa(autenticado, id);
  return { marcadas: await conversaRepositorio.marcarLidas(id, autenticado.id) };
}
