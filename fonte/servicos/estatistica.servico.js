import { ALVOS_FEEDBACK, PAPEIS, STATUS_SESSAO, TIPOS_ALERTA, TIPOS_CONTEUDO } from '../configuracao/constantes.js';
import * as estatisticaRepositorio from '../repositorios/estatistica.repositorio.js';
import { arredondar } from '../utilitarios/indicadores.js';

/** Contagem por categoria com todas as categorias presentes (zeradas), para o gráfico não "perder" nenhuma. */
function contagemCompleta(categorias, grupos, campo) {
  const resultado = Object.fromEntries(Object.values(categorias).map((categoria) => [categoria, 0]));
  for (const grupo of grupos) resultado[grupo[campo]] = grupo._count._all;
  return resultado;
}

/**
 * Relatório estatístico (uso da plataforma) de um mês. Só totais: nenhum dado pessoal nem de saúde, e por isso
 * pode ser exibido à gestão sem as travas de anonimato dos indicadores emocionais.
 */
export async function montarRelatorio(periodo) {
  const intervalo = { inicio: periodo.inicio, fim: periodo.fim };
  const [porPapel, novos, registros, quemRegistrou, quemEntrou, sessoes, mensagens, alertas, feedbacks, conteudos] =
    await Promise.all([
      estatisticaRepositorio.usuariosPorPapel(),
      estatisticaRepositorio.novosUsuarios(intervalo),
      estatisticaRepositorio.totalDeRegistros(intervalo),
      estatisticaRepositorio.usuariosQueRegistraram(intervalo),
      estatisticaRepositorio.usuariosQueEntraram(intervalo),
      estatisticaRepositorio.sessoesPorStatus(intervalo),
      estatisticaRepositorio.totalDeMensagens(intervalo),
      estatisticaRepositorio.alertasPorTipo(intervalo),
      estatisticaRepositorio.feedbacksPorAlvo(intervalo),
      estatisticaRepositorio.conteudosPorTipo()
    ]);

  const usuarios = Object.fromEntries(Object.values(PAPEIS).map((papel) => [papel, { ativos: 0, inativos: 0 }]));
  for (const grupo of porPapel) usuarios[grupo.papel][grupo.ativo ? 'ativos' : 'inativos'] = grupo._count._all;

  const feedbacksPorAlvo = Object.fromEntries(
    Object.values(ALVOS_FEEDBACK).map((alvo) => [alvo, { total: 0, notaMedia: null }])
  );
  for (const grupo of feedbacks) {
    feedbacksPorAlvo[grupo.alvo] = {
      total: grupo._count._all,
      notaMedia: grupo._avg.nota === null ? null : arredondar(grupo._avg.nota)
    };
  }

  return {
    periodo,
    usuarios: {
      porPapel: usuarios,
      novosNoPeriodo: novos,
      comAcessoNoPeriodo: quemEntrou,
      comRegistroEmocionalNoPeriodo: quemRegistrou
    },
    registrosEmocionais: { total: registros },
    sessoes: { porStatus: contagemCompleta(STATUS_SESSAO, sessoes, 'status') },
    chat: { mensagensEnviadas: mensagens },
    alertas: { geradosPorTipo: contagemCompleta(TIPOS_ALERTA, alertas, 'tipo') },
    feedbacks: feedbacksPorAlvo,
    conteudosPublicados: { porTipo: contagemCompleta(TIPOS_CONTEUDO, conteudos, 'tipo') }
  };
}

/** Usuários por perfil (para o painel inicial do administrador). */
export async function usuariosPorPerfil() {
  const grupos = await estatisticaRepositorio.usuariosPorPapel();
  const usuarios = Object.fromEntries(Object.values(PAPEIS).map((papel) => [papel, { ativos: 0, inativos: 0 }]));
  for (const grupo of grupos) usuarios[grupo.papel][grupo.ativo ? 'ativos' : 'inativos'] = grupo._count._all;
  return usuarios;
}
