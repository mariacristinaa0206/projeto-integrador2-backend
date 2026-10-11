import { TIPOS_ALERTA } from '../configuracao/constantes.js';

/** Descrição GENÉRICA do motivo: diz o padrão, nunca a emoção, o texto ou o horário dos registros. */
const DESCRICAO_DO_TIPO = Object.freeze({
  [TIPOS_ALERTA.SEQUENCIA_NEGATIVA]: 'Vários dias seguidos com registros emocionais desconfortáveis.',
  [TIPOS_ALERTA.INTENSIDADE_ALTA_RECORRENTE]: 'Registros desconfortáveis de intensidade alta repetidos na última semana.',
  [TIPOS_ALERTA.QUEDA_DE_HUMOR]: 'O humor médio da última semana ficou bem abaixo do da semana anterior.'
});

/**
 * `podeVerRegistros`: o leitor (psicólogo) já tem vínculo ativo com o aluno? Se não, ele pode assumir o alerta
 * (o que cria o vínculo), mas ainda não vê o diário.
 */
export function serializarAlerta(alerta, { podeVerRegistros = false } = {}) {
  return {
    id: alerta.id,
    tipo: alerta.tipo,
    descricao: DESCRICAO_DO_TIPO[alerta.tipo],
    status: alerta.status,
    aluno: {
      id: alerta.aluno.id,
      nome: alerta.aluno.nome,
      turma: alerta.aluno.aluno?.turma ?? null,
      nivelEnsino: alerta.aluno.aluno?.nivelEnsino ?? null
    },
    responsavel: alerta.responsavel ? { id: alerta.responsavel.id, nome: alerta.responsavel.nome } : null,
    podeVerRegistros,
    criadoEm: alerta.criadoEm.toISOString(),
    assumidoEm: alerta.assumidoEm?.toISOString() ?? null,
    resolvidoEm: alerta.resolvidoEm?.toISOString() ?? null
  };
}
