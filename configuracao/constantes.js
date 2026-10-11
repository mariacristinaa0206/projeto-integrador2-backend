/** Constantes de domínio e limites de segurança usados por toda a aplicação. */

export const PREFIXO_API = '/api/v1';

/** Todo o calendário do sistema (dia do registro, horários de sessão, relatórios) usa o horário de Brasília. */
export const FUSO_HORARIO = 'America/Sao_Paulo';

// Perfis do PDF (TB_USUARIO.TP_USUARIO: Aluno, Professor, Pedagógico, Psicólogo, Administrador), expostos como `papel`.
export const PAPEIS = Object.freeze({
  ALUNO: 'aluno',
  PROFESSOR: 'professor',
  PEDAGOGICO: 'pedagogico',
  PSICOLOGO: 'psicologo',
  ADMINISTRADOR: 'administrador'
});

/** Equipe de apoio: recebe sessões e conversas do aluno e vê os alertas de acompanhamento. */
export const PAPEIS_APOIO = Object.freeze([PAPEIS.PSICOLOGO, PAPEIS.PEDAGOGICO]);

/** RF01 cita "estudantes, professores, orientadores": são os perfis que acompanham o próprio estado emocional. */
export const PAPEIS_QUE_REGISTRAM_EMOCAO = Object.freeze([PAPEIS.ALUNO, PAPEIS.PROFESSOR, PAPEIS.PEDAGOGICO]);

export const PAPEIS_GESTAO_CONTEUDO = Object.freeze([PAPEIS.ADMINISTRADOR, PAPEIS.PSICOLOGO, PAPEIS.PEDAGOGICO]);

/** Indicadores coletivos (sem identificar ninguém). */
export const PAPEIS_PAINEL_COLETIVO = Object.freeze([
  PAPEIS.ADMINISTRADOR,
  PAPEIS.PEDAGOGICO,
  PAPEIS.PSICOLOGO,
  PAPEIS.PROFESSOR
]);

export const NIVEIS_ENSINO = Object.freeze({
  INFANTIL: 'infantil',
  FUNDAMENTAL: 'fundamental',
  MEDIO: 'medio',
  AEE: 'aee'
});

/**
 * Quem pode abrir a própria conta sozinho. Crianças e estudantes do AEE são cadastrados pela escola com o
 * consentimento do responsável (LGPD art. 14): ver `consentimentoResponsavel` no cadastro feito pela equipe.
 */
export const NIVEIS_AUTOCADASTRO = Object.freeze([NIVEIS_ENSINO.MEDIO]);

export const ORIGENS_CONSENTIMENTO = Object.freeze({ TITULAR: 'titular', RESPONSAVEL: 'responsavel' });

export const INTENSIDADES = Object.freeze({ BAIXA: 'baixa', MEDIA: 'media', ALTA: 'alta' });

/**
 * Catálogo de emoções. A "valência" (1 = muito ruim … 5 = muito bom) é a escala de humor usada nas médias e
 * tendências; é definida AQUI, nunca enviada pelo cliente. `tema` aponta as orientações iniciais (RF04).
 * As cinco primeiras da escala do PDF (muito feliz, feliz, neutro, triste, muito triste) estão todas presentes.
 */
export const EMOCOES = Object.freeze({
  muito_feliz: { rotulo: 'Muito feliz', valencia: 5, tema: null },
  feliz: { rotulo: 'Feliz', valencia: 4, tema: null },
  calmo: { rotulo: 'Calmo', valencia: 4, tema: null },
  neutro: { rotulo: 'Neutro', valencia: 3, tema: null },
  irritado: { rotulo: 'Irritado', valencia: 2, tema: 'habilidades_socioemocionais' },
  com_medo: { rotulo: 'Com medo', valencia: 2, tema: 'ansiedade' },
  ansioso: { rotulo: 'Ansioso', valencia: 2, tema: 'ansiedade' },
  estressado: { rotulo: 'Estressado', valencia: 2, tema: 'estresse' },
  triste: { rotulo: 'Triste', valencia: 2, tema: 'tristeza' },
  muito_triste: { rotulo: 'Muito triste', valencia: 1, tema: 'tristeza' }
});

/** Emoção "desconfortável": base das orientações e dos alertas. */
export const VALENCIA_NEGATIVA_MAXIMA = 2;

/**
 * Indicadores do relatório mensal (RF03). São NOMES DE ACOMPANHAMENTO, não diagnóstico: o sistema não
 * diagnostica ninguém (escopo do PDF). Cada indicador agrupa as emoções que o alimentam.
 */
export const INDICADORES = Object.freeze({
  ansiedade: ['ansioso', 'com_medo'],
  estresse: ['estressado', 'irritado'],
  tristeza: ['triste', 'muito_triste']
});

export const TIPOS_CONTEUDO = Object.freeze({
  ARTIGO: 'artigo',
  VIDEO: 'video',
  AUDIO: 'audio',
  ATIVIDADE: 'atividade',
  QUIZ: 'quiz',
  ORIENTACAO: 'orientacao'
});

export const TEMAS = Object.freeze({
  ANSIEDADE: 'ansiedade',
  ESTRESSE: 'estresse',
  TRISTEZA: 'tristeza',
  AUTOESTIMA: 'autoestima',
  EMPATIA: 'empatia',
  AUTOCUIDADO: 'autocuidado',
  HABILIDADES_SOCIOEMOCIONAIS: 'habilidades_socioemocionais'
});

export const STATUS_VINCULO = Object.freeze({ ATIVO: 'ativo', ENCERRADO: 'encerrado' });

/** De onde veio o acesso do psicólogo aos registros do aluno (sempre gravado, para auditoria e transparência). */
export const ORIGENS_VINCULO = Object.freeze({
  AGENDAMENTO: 'agendamento', // o aluno compartilhou ao marcar a sessão
  ALERTA: 'alerta', // o psicólogo assumiu um alerta
  DESIGNACAO: 'designacao' // a escola (administrador/pedagógico) designou
});

export const TIPOS_ALERTA = Object.freeze({
  SEQUENCIA_NEGATIVA: 'sequencia_negativa',
  INTENSIDADE_ALTA_RECORRENTE: 'intensidade_alta_recorrente',
  QUEDA_DE_HUMOR: 'queda_de_humor'
});

export const STATUS_ALERTA = Object.freeze({
  ABERTO: 'aberto',
  EM_ACOMPANHAMENTO: 'em_acompanhamento',
  RESOLVIDO: 'resolvido'
});

/**
 * Regras que geram alertas (escopo: "padrões que indiquem possíveis situações de vulnerabilidade emocional").
 * São triagem para a equipe olhar com cuidado, não detecção de crise nem diagnóstico.
 */
export const REGRAS_ALERTA = Object.freeze({
  // Dias seguidos (contando hoje) com registro e humor médio do dia abaixo do limiar.
  diasSequenciaNegativa: 5,
  limiarDiaNegativo: 2.5,
  // Registros desconfortáveis de intensidade alta na janela.
  janelaIntensidadeAltaDias: 7,
  minRegistrosIntensidadeAlta: 3,
  // Humor médio dos últimos 7 dias contra os 7 anteriores.
  janelaQuedaDias: 7,
  minRegistrosPorJanelaQueda: 3,
  quedaMinima: 1.5
});

export const STATUS_SESSAO = Object.freeze({
  SOLICITADA: 'solicitada',
  CONFIRMADA: 'confirmada',
  RECUSADA: 'recusada',
  CANCELADA: 'cancelada',
  CONCLUIDA: 'concluida'
});

/** Sessões ocupam o horário do profissional e do aluno enquanto estiverem nestes status. */
export const STATUS_SESSAO_QUE_OCUPAM = Object.freeze([STATUS_SESSAO.SOLICITADA, STATUS_SESSAO.CONFIRMADA]);

/** Grade de horários: blocos de 30 min, de segunda a sexta, no horário de Brasília. */
export const REGRAS_SESSAO = Object.freeze({
  duracaoMin: 30,
  horaInicial: 7, // primeira sessão do dia começa às 07:00
  horaFinal: 18, // a última termina às 18:00 (começa às 17:30)
  diasUteis: Object.freeze([1, 2, 3, 4, 5]), // 1 = segunda … 5 = sexta
  antecedenciaMinimaMin: 60,
  antecedenciaMaximaDias: 60,
  maxEmAbertoPorAluno: 3
});

export const ALVOS_FEEDBACK = Object.freeze({ SISTEMA: 'sistema', SESSAO: 'sessao' });

export const CATEGORIAS_META = Object.freeze({
  REDUCAO_ESTRESSE: 'reducao_estresse',
  AUTOCUIDADO: 'autocuidado',
  SONO: 'sono',
  ATIVIDADE_FISICA: 'atividade_fisica',
  SOCIALIZACAO: 'socializacao',
  ESTUDOS: 'estudos',
  OUTRA: 'outra'
});

export const STATUS_META = Object.freeze({
  EM_ANDAMENTO: 'em_andamento',
  CONCLUIDA: 'concluida',
  ABANDONADA: 'abandonada'
});

export const TIPOS_RELATORIO = Object.freeze({
  EMOCIONAL: 'emocional',
  PEDAGOGICO: 'pedagogico',
  ESTATISTICO: 'estatistico'
});

export const TIPOS_ACOMPANHAMENTO = Object.freeze({ PEDAGOGICO: 'pedagogico', PSICOLOGICO: 'psicologico' });

export const TIPOS_NOTIFICACAO = Object.freeze({
  ALERTA_ACOMPANHAMENTO: 'alerta_acompanhamento', // para a equipe de apoio
  SESSAO_SOLICITADA: 'sessao_solicitada', // para o profissional
  SESSAO_CONFIRMADA: 'sessao_confirmada', // para o aluno
  SESSAO_RECUSADA: 'sessao_recusada',
  SESSAO_CANCELADA: 'sessao_cancelada',
  ACOMPANHAMENTO_INICIADO: 'acompanhamento_iniciado' // para o aluno: um psicólogo passou a ver os registros
});

/** Ações gravadas no log de auditoria (RNF10). Texto estável: relatórios e filtros dependem dele. */
export const ACOES_AUDITORIA = Object.freeze({
  LOGIN: 'login',
  SENHA_ALTERADA: 'senha_alterada',
  SENHA_REDEFINIDA: 'senha_redefinida',
  CONTA_CRIADA: 'conta_criada',
  CONTA_ALTERADA: 'conta_alterada',
  CONTA_ATIVADA: 'conta_ativada',
  CONTA_DESATIVADA: 'conta_desativada',
  CONTA_EXCLUIDA: 'conta_excluida',
  REGISTROS_CONSULTADOS: 'registros_consultados',
  ACOMPANHAMENTOS_CONSULTADOS: 'acompanhamentos_consultados',
  ACOMPANHAMENTO_CRIADO: 'acompanhamento_criado',
  VINCULO_CRIADO: 'vinculo_criado',
  VINCULO_ENCERRADO: 'vinculo_encerrado',
  ALERTA_ASSUMIDO: 'alerta_assumido',
  ALERTA_RESOLVIDO: 'alerta_resolvido',
  RELATORIO_GERADO: 'relatorio_gerado',
  RELATORIO_CONSULTADO: 'relatorio_consultado',
  CONTEUDO_CRIADO: 'conteudo_criado',
  CONTEUDO_ALTERADO: 'conteudo_alterado',
  CONTEUDO_EXCLUIDO: 'conteudo_excluido',
  FEEDBACKS_CONSULTADOS: 'feedbacks_consultados'
});

export const LIMITES = Object.freeze({
  senhaMinima: 8,
  senhaMaximaBytes: 72, // limite do bcrypt: acima disso o hash ignoraria o restante da senha
  tamanhoSenhaTemporaria: 12,

  maxCaracteresNome: 100,
  maxCaracteresEmail: 254,
  maxCaracteresTurma: 50,
  maxCaracteresObservacao: 2000,
  maxCaracteresAnotacao: 4000,
  maxCaracteresMotivoSessao: 500,
  maxCaracteresMensagem: 2000,
  maxCaracteresComentario: 2000,
  maxCaracteresTitulo: 150,
  maxCaracteresTituloMeta: 150,
  maxCaracteresConteudo: 20_000,
  maxCaracteresUrl: 500,
  maxCaracteresBusca: 100,

  // Quiz (RF05): perguntas e alternativas por conteúdo.
  maxPerguntasQuiz: 20,
  minOpcoesPergunta: 2,
  maxOpcoesPergunta: 6,
  maxCaracteresPergunta: 300,
  maxCaracteresOpcao: 200,

  // Registro emocional.
  maxRegistrosPorDia: 10,
  maxNiveisPorConteudo: 4,

  // Metas em andamento por pessoa.
  maxMetasEmAndamento: 20,

  // Anonimato: grupos com menos alunos que isso NÃO têm números mostrados (indicadores coletivos).
  minimoAlunosPorGrupo: 5,

  // Destinatários de um alerta (equipe de apoio ativa).
  maxDestinatariosAlerta: 200,

  paginaPadrao: 20,
  paginaMaxima: 100,
  maxNotificacoes: 50,
  maxMensagensPorLeitura: 100,
  maxHorariosDoDia: 48,
  maxVinculosPorProfissional: 500,

  // O corpo JSON é pequeno de propósito: não há upload de arquivos nesta API.
  corpoPadrao: '32kb',
  corpoConteudo: '128kb'
});

/** Texto fixo de apoio imediato, devolvido junto com as orientações quando o registro é desconfortável. */
export const APOIO_IMEDIATO = Object.freeze({
  mensagem:
    'Se você estiver muito mal, ou pensando em se machucar, fale agora com um adulto de confiança. ' +
    'Você também pode ligar para o CVV, gratuito e 24 horas, no 188 (ou pelo site cvv.org.br). ' +
    'Em risco imediato, ligue 192 (SAMU).',
  telefones: Object.freeze([
    Object.freeze({ nome: 'CVV – Centro de Valorização da Vida', numero: '188' }),
    Object.freeze({ nome: 'SAMU', numero: '192' })
  ])
});
