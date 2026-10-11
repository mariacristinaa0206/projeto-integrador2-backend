import {
  ALVOS_FEEDBACK,
  CATEGORIAS_META,
  EMOCOES,
  INTENSIDADES,
  LIMITES,
  NIVEIS_ENSINO,
  PAPEIS,
  STATUS_ALERTA,
  STATUS_META,
  STATUS_SESSAO,
  STATUS_VINCULO,
  TEMAS,
  TIPOS_ALERTA,
  TIPOS_CONTEUDO,
  TIPOS_NOTIFICACAO,
  TIPOS_RELATORIO
} from '../configuracao/constantes.js';

/** Esquemas (components.schemas) da especificação OpenAPI. */

export const ref = (nome) => ({ $ref: `#/components/schemas/${nome}` });

const dataHora = { type: 'string', format: 'date-time', example: '2026-10-12T13:00:00.000Z' };
const dataPura = { type: 'string', format: 'date', example: '2026-10-12' };
const texto = (exemplo, extra = {}) => ({ type: 'string', example: exemplo, ...extra });
const inteiro = (exemplo = 1, extra = {}) => ({ type: 'integer', example: exemplo, ...extra });
const enumeracao = (valores, exemplo) => ({ type: 'string', enum: Object.values(valores), example: exemplo ?? Object.values(valores)[0] });
const lista = (itens) => ({ type: 'array', items: itens });
const objeto = (propriedades, obrigatorios, descricao) => ({
  type: 'object',
  ...(descricao ? { description: descricao } : {}),
  ...(obrigatorios ? { required: obrigatorios } : {}),
  properties: propriedades
});

/** Envelope de listagem paginada. */
export const paginado = (esquemaItem) =>
  objeto({
    itens: lista(esquemaItem),
    total: inteiro(42),
    pagina: inteiro(1),
    limite: inteiro(LIMITES.paginaPadrao),
    totalPaginas: inteiro(3)
  });

const pessoaResumo = objeto({ id: inteiro(), nome: texto('Ana Beatriz Oliveira') });
const profissionalResumo = objeto({ id: inteiro(), nome: texto('Dra. Ana Psicóloga'), papel: enumeracao({ a: PAPEIS.PSICOLOGO, b: PAPEIS.PEDAGOGICO }) });
const alunoComTurma = objeto({ id: inteiro(), nome: texto('Ana Beatriz Oliveira'), turma: texto('3º A'), nivelEnsino: enumeracao(NIVEIS_ENSINO, 'medio') });

const orientacao = {
  type: 'object',
  description: 'Conteúdo educativo (aqui, do tipo "orientacao").',
  properties: {
    id: inteiro(),
    titulo: texto('Quando a ansiedade aparece: o que fazer agora'),
    descricao: texto('Texto completo...'),
    tipo: enumeracao(TIPOS_CONTEUDO, 'orientacao'),
    tema: enumeracao(TEMAS, 'ansiedade'),
    niveisEnsino: lista(enumeracao(NIVEIS_ENSINO)),
    urlMidia: { type: 'string', nullable: true },
    estrutura: { type: 'object', nullable: true },
    publicado: { type: 'boolean' },
    dataPublicacao: dataPura,
    atualizadoEm: dataHora
  }
};

export const esquemas = {
  Erro: objeto({
    erro: objeto({
      codigo: texto('REQUISICAO_INVALIDA'),
      mensagem: texto('Dados inválidos.'),
      detalhes: lista(objeto({ campo: texto('corpo.email'), mensagem: texto('E-mail inválido.') })),
      idRequisicao: texto('3f1c9a7e-5b2d-4c1a-9a55-0d6b7c8e9f10', { format: 'uuid' })
    })
  }),

  // ---------------------------------------------------------------- Autenticação e perfil
  CadastroAluno: objeto(
    {
      nome: texto('Ana Beatriz Oliveira'),
      email: texto('ana@escola.edu.br', { format: 'email' }),
      senha: texto('minhasenha1', { format: 'password', description: `Mínimo ${LIMITES.senhaMinima} caracteres, com ao menos uma letra e um número.` }),
      turma: texto('3º A', { description: 'Guardada em maiúsculas.' }),
      nivelEnsino: { type: 'string', enum: ['medio'], example: 'medio', description: 'O autocadastro vale só para os níveis liberados (hoje, ensino médio). Os demais são cadastrados pela escola.' },
      aceiteTermos: { type: 'boolean', enum: [true], description: 'Obrigatório: vira o consentimento registrado (LGPD).' }
    },
    ['nome', 'email', 'senha', 'turma', 'nivelEnsino', 'aceiteTermos']
  ),
  Entrar: objeto({ email: texto('ana@escola.edu.br', { format: 'email' }), senha: texto('minhasenha1', { format: 'password' }) }, ['email', 'senha']),
  TrocarSenha: objeto({ senhaAtual: texto('senhaprovisoria1', { format: 'password' }), novaSenha: texto('minhasenha1', { format: 'password' }) }, ['senhaAtual', 'novaSenha']),
  Conta: objeto({
    id: inteiro(),
    nome: texto('Ana Beatriz Oliveira'),
    email: texto('ana@escola.edu.br', { format: 'email' }),
    papel: enumeracao(PAPEIS, 'aluno'),
    ativo: { type: 'boolean' },
    deveTrocarSenha: { type: 'boolean', description: 'Verdadeiro com senha provisória: a pessoa só consegue trocar a senha.' },
    ultimoAcessoEm: { ...dataHora, nullable: true },
    criadoEm: dataHora,
    aluno: objeto(
      {
        turma: texto('3º A'),
        nivelEnsino: enumeracao(NIVEIS_ENSINO, 'medio'),
        consentimentoEm: dataHora,
        consentimentoOrigem: { type: 'string', enum: ['titular', 'responsavel'] }
      },
      undefined,
      'Somente para o papel "aluno".'
    )
  }),
  Sessao: objeto({
    token: texto('eyJhbGciOi...', { description: 'JWT. Envie em `Authorization: Bearer <token>`.' }),
    tipo: texto('Bearer'),
    expiraEm: dataHora,
    usuario: ref('Conta')
  }),
  PerfilEntrada: objeto(
    {
      nome: texto('Ana B. Oliveira'),
      email: texto('ana@escola.edu.br', { format: 'email' }),
      senhaAtual: texto('minhasenha1', { format: 'password', description: 'Obrigatória para trocar o e-mail.' })
    },
    ['nome', 'email']
  ),
  ExcluirPerfil: objeto({ senhaAtual: texto('minhasenha1', { format: 'password' }) }, ['senhaAtual']),

  // ---------------------------------------------------------------- Gestão de contas
  CriarUsuario: {
    oneOf: [
      objeto(
        {
          papel: { type: 'string', enum: ['aluno'] },
          nome: texto('Léo Infantil'),
          email: texto('leo@escola.edu.br', { format: 'email' }),
          turma: texto('1º ano B'),
          nivelEnsino: enumeracao(NIVEIS_ENSINO, 'infantil'),
          consentimentoResponsavel: { type: 'boolean', enum: [true], description: 'Confirma que o responsável legal consentiu o uso (LGPD art. 14).' }
        },
        ['papel', 'nome', 'email', 'turma', 'nivelEnsino', 'consentimentoResponsavel']
      ),
      objeto(
        {
          papel: { type: 'string', enum: [PAPEIS.PROFESSOR, PAPEIS.PEDAGOGICO, PAPEIS.PSICOLOGO, PAPEIS.ADMINISTRADOR] },
          nome: texto('Paulo Professor'),
          email: texto('paulo@escola.edu.br', { format: 'email' })
        },
        ['papel', 'nome', 'email']
      )
    ]
  },
  UsuarioCriado: objeto({
    usuario: ref('Conta'),
    senhaTemporaria: texto('k7Rm4xQe9bTw', { description: 'Mostrada UMA vez. A pessoa é obrigada a trocá-la no primeiro acesso.' })
  }),
  SenhaTemporaria: objeto({ senhaTemporaria: texto('k7Rm4xQe9bTw') }),
  AtualizarUsuario: objeto(
    {
      nome: texto('Caio M. Mendes'),
      email: texto('caio@escola.edu.br', { format: 'email' }),
      turma: texto('3º B', { description: 'Só alunos.' }),
      nivelEnsino: { ...enumeracao(NIVEIS_ENSINO, 'medio'), description: 'Só alunos.' }
    },
    undefined,
    'Envie ao menos um campo. O papel não muda: para trocar de perfil, crie outra conta.'
  ),
  Situacao: objeto({ ativo: { type: 'boolean' } }, ['ativo']),

  // ---------------------------------------------------------------- Registro emocional
  CatalogoEmocoes: objeto({
    emocoes: lista(objeto({ codigo: enumeracao(Object.fromEntries(Object.keys(EMOCOES).map((e) => [e, e])), 'ansioso'), rotulo: texto('Ansioso'), humor: inteiro(2, { minimum: 1, maximum: 5, description: '1 = muito ruim … 5 = muito bom (definido pelo servidor).' }) })),
    intensidades: lista(enumeracao(INTENSIDADES))
  }),
  RegistrarEntrada: objeto(
    {
      emocao: enumeracao(Object.fromEntries(Object.keys(EMOCOES).map((e) => [e, e])), 'ansioso'),
      intensidade: enumeracao(INTENSIDADES, 'alta'),
      observacao: texto('Prova de matemática amanhã e não consigo dormir', { nullable: true, maxLength: LIMITES.maxCaracteresObservacao, description: 'Opcional (RF09). Guardada cifrada.' })
    },
    ['emocao', 'intensidade']
  ),
  Registro: objeto({
    id: inteiro(),
    emocao: texto('ansioso'),
    rotulo: texto('Ansioso'),
    humor: inteiro(2),
    intensidade: enumeracao(INTENSIDADES),
    observacao: { type: 'string', nullable: true },
    dia: { ...dataPura, description: 'Dia em Brasília (calculado pelo servidor).' },
    registradoEm: dataHora
  }),
  RegistroCriado: objeto({
    registro: ref('Registro'),
    orientacoes: { ...lista(orientacao), description: 'Orientações iniciais (RF04) quando a emoção é desconfortável.' },
    apoioImediato: { ...ref('ApoioImediato'), nullable: true }
  }),
  ApoioImediato: objeto({
    mensagem: texto('Se você estiver muito mal... ligue para o CVV, no 188...'),
    telefones: lista(objeto({ nome: texto('CVV – Centro de Valorização da Vida'), numero: texto('188') }))
  }),
  ObservacaoEntrada: objeto({ observacao: texto('Consegui respirar e dormir melhor.', { nullable: true, description: 'null ou vazio apaga a anotação.' }) }, ['observacao']),
  Orientacoes: objeto({ itens: lista(orientacao), apoioImediato: ref('ApoioImediato') }),

  // ---------------------------------------------------------------- Conteúdos
  Conteudo: orientacao,
  ConteudoEntrada: objeto(
    {
      titulo: texto('Como cultivar a autoestima'),
      descricao: texto('Texto completo...'),
      tipo: enumeracao(TIPOS_CONTEUDO, 'artigo'),
      tema: enumeracao(TEMAS, 'autoestima'),
      niveisEnsino: { ...lista(enumeracao(NIVEIS_ENSINO)), description: 'Vazio = todos os níveis.' },
      urlMidia: texto('https://www.youtube.com/watch?v=...', { nullable: true, description: 'Só https. Obrigatório para vídeo e áudio.' }),
      estrutura: {
        type: 'object',
        nullable: true,
        description: 'Somente quiz.',
        properties: {
          perguntas: lista(objeto({ enunciado: texto('Quantas horas dormir?'), opcoes: lista(texto('8')), correta: inteiro(1, { description: 'Índice (a partir de 0) da alternativa correta.' }), explicacao: { type: 'string', nullable: true } }))
        }
      },
      publicado: { type: 'boolean', default: true }
    },
    ['titulo', 'descricao', 'tipo', 'tema']
  ),
  RespostaQuizEntrada: objeto({ respostas: lista(inteiro(1)) }, ['respostas'], 'Um número por pergunta, na ordem: o índice da alternativa escolhida.'),
  ResultadoQuiz: objeto({
    acertos: inteiro(2),
    total: inteiro(3),
    percentual: inteiro(67),
    resultados: lista(objeto({ pergunta: inteiro(0), acertou: { type: 'boolean' }, alternativaCorreta: inteiro(1), explicacao: { type: 'string', nullable: true } }))
  }),

  // ---------------------------------------------------------------- Metas
  Meta: objeto({
    id: inteiro(),
    titulo: texto('Dormir 8 horas por noite'),
    categoria: enumeracao(CATEGORIAS_META, 'sono'),
    prazo: { ...dataPura, nullable: true },
    status: enumeracao(STATUS_META),
    concluidaEm: { ...dataHora, nullable: true },
    criadoEm: dataHora
  }),
  MetaEntrada: objeto(
    { titulo: texto('Dormir 8 horas por noite'), categoria: enumeracao(CATEGORIAS_META, 'sono'), prazo: { ...dataPura, nullable: true } },
    ['titulo', 'categoria']
  ),
  MetaAtualizacao: objeto(
    { titulo: texto('Dormir 9 horas'), categoria: enumeracao(CATEGORIAS_META), prazo: { ...dataPura, nullable: true, description: 'null remove o prazo.' }, status: enumeracao(STATUS_META) },
    undefined,
    'Atualização parcial: envie só o que muda (ao menos um campo).'
  ),

  // ---------------------------------------------------------------- Sessões
  Profissional: profissionalResumo,
  Horario: objeto({
    inicio: dataHora,
    disponivel: { type: 'boolean' },
    motivoIndisponivel: { type: 'string', nullable: true, enum: ['ocupado', 'fora_do_prazo', null] }
  }),
  SessaoEntrada: objeto(
    {
      profissionalId: inteiro(3),
      inicio: texto('2026-10-12T10:00:00-03:00', { format: 'date-time', description: 'ISO 8601 COM fuso. Blocos de 30 min, seg–sex, 07:00 a 18:00 (Brasília), com 1 h a 60 dias de antecedência.' }),
      motivo: texto('Preciso conversar sobre a pressão das provas', { nullable: true, maxLength: LIMITES.maxCaracteresMotivoSessao }),
      compartilharRegistros: { type: 'boolean', default: false, description: 'Só com psicólogo. Se verdadeiro, ele passa a ver o diário emocional da aluna (cria o vínculo). Sempre opt-in.' }
    },
    ['profissionalId', 'inicio']
  ),
  SessaoAgendada: objeto({
    id: inteiro(),
    status: enumeracao(STATUS_SESSAO, 'solicitada'),
    inicio: dataHora,
    fim: dataHora,
    duracaoMin: inteiro(30),
    motivo: { type: 'string', nullable: true },
    aluno: pessoaResumo,
    profissional: profissionalResumo,
    criadoEm: dataHora
  }),

  // ---------------------------------------------------------------- Chat
  AbrirConversa: objeto(
    { profissionalId: inteiro(3, { description: 'Aluno: com quem conversar.' }), alunoId: inteiro(2, { description: 'Psicólogo vinculado: com qual aluno.' }) },
    undefined,
    'Informe exatamente um dos dois.'
  ),
  Conversa: objeto({
    id: inteiro(),
    com: profissionalResumo,
    naoLidas: inteiro(1),
    ultimaMensagem: { type: 'string', nullable: true },
    ultimaMensagemEm: { ...dataHora, nullable: true },
    criadaEm: dataHora
  }),
  MensagemEntrada: objeto({ texto: texto('Oi, posso falar sobre ontem?', { maxLength: LIMITES.maxCaracteresMensagem }) }, ['texto']),
  Mensagem: objeto({
    id: inteiro(),
    conversaId: inteiro(),
    autorId: inteiro(),
    minha: { type: 'boolean' },
    texto: texto('Oi, posso falar sobre ontem?'),
    enviadaEm: dataHora,
    lida: { type: 'boolean' }
  }),
  Mensagens: objeto({ itens: lista(ref('Mensagem')), ultimoId: { type: 'integer', nullable: true, description: 'Passe em `?depois=` na próxima consulta.' } }),

  // ---------------------------------------------------------------- Feedback
  FeedbackEntrada: {
    oneOf: [
      objeto({ alvo: { type: 'string', enum: [ALVOS_FEEDBACK.SISTEMA] }, nota: inteiro(5, { minimum: 1, maximum: 5 }), comentario: { type: 'string', nullable: true } }, ['alvo', 'nota']),
      objeto({ alvo: { type: 'string', enum: [ALVOS_FEEDBACK.SESSAO] }, sessaoId: inteiro(), nota: inteiro(5, { minimum: 1, maximum: 5 }), comentario: { type: 'string', nullable: true } }, ['alvo', 'sessaoId', 'nota'])
    ]
  },
  Feedback: objeto({ id: inteiro(), alvo: enumeracao(ALVOS_FEEDBACK), sessaoId: { type: 'integer', nullable: true }, nota: inteiro(5), comentario: { type: 'string', nullable: true }, criadoEm: dataHora }),
  FeedbackDaGestao: objeto(
    {
      id: inteiro(),
      alvo: enumeracao(ALVOS_FEEDBACK),
      nota: inteiro(5),
      comentario: { type: 'string', nullable: true },
      profissional: { ...pessoaResumo, nullable: true },
      criadoEm: dataHora
    },
    undefined,
    'NUNCA identifica quem avaliou.'
  ),

  // ---------------------------------------------------------------- Notificações
  Notificacao: objeto({
    id: inteiro(),
    tipo: enumeracao(TIPOS_NOTIFICACAO),
    mensagem: texto('Há um novo alerta de acompanhamento. Abra a lista de alertas para ver.'),
    referenciaId: { type: 'integer', nullable: true, description: 'Id do alerta, sessão ou vínculo a que a notificação se refere.' },
    lida: { type: 'boolean' },
    enviadaEm: dataHora
  }),
  Notificacoes: objeto({ naoLidas: inteiro(2), itens: lista(ref('Notificacao')) }),
  MarcarLidas: objeto({ ids: { ...lista(inteiro()), description: 'Omita para marcar todas.' } }),

  // ---------------------------------------------------------------- Equipe: alertas, vínculos, alunos, anotações
  Alerta: objeto({
    id: inteiro(),
    tipo: enumeracao(TIPOS_ALERTA),
    descricao: texto('Vários dias seguidos com registros emocionais desconfortáveis.', { description: 'Motivo GENÉRICO: nunca traz emoção, texto ou horário dos registros.' }),
    status: enumeracao(STATUS_ALERTA),
    aluno: alunoComTurma,
    responsavel: { ...pessoaResumo, nullable: true },
    podeVerRegistros: { type: 'boolean', description: 'O leitor (psicólogo) já tem vínculo ativo com o aluno?' },
    criadoEm: dataHora,
    assumidoEm: { ...dataHora, nullable: true },
    resolvidoEm: { ...dataHora, nullable: true }
  }),
  VinculoEntrada: objeto({ alunoId: inteiro(2), profissionalId: inteiro(3, { description: 'Precisa ser um psicólogo ativo.' }) }, ['alunoId', 'profissionalId']),
  Vinculo: objeto({
    id: inteiro(),
    status: enumeracao(STATUS_VINCULO),
    origem: { type: 'string', enum: ['agendamento', 'alerta', 'designacao'] },
    aluno: alunoComTurma,
    profissional: profissionalResumo,
    criadoEm: dataHora,
    encerradoEm: { ...dataHora, nullable: true }
  }),
  AlunoDaEquipe: objeto({ id: inteiro(), nome: texto('Ana Beatriz Oliveira'), turma: texto('3º A'), nivelEnsino: enumeracao(NIVEIS_ENSINO), email: texto('ana@escola.edu.br'), criadoEm: dataHora }),
  AcompanhamentoEntrada: objeto(
    { observacao: texto('Relata insônia antes de provas.', { maxLength: LIMITES.maxCaracteresAnotacao }), data: { ...dataPura, description: 'Padrão: hoje. Não pode ser futura nem ter mais de 1 ano.' } },
    ['observacao']
  ),
  Acompanhamento: objeto({
    id: inteiro(),
    tipo: { type: 'string', enum: ['pedagogico', 'psicologico'] },
    observacao: texto('Relata insônia antes de provas.'),
    data: dataPura,
    autor: { ...profissionalResumo, nullable: true },
    criadoEm: dataHora
  }),

  // ---------------------------------------------------------------- Relatórios e painéis
  RelatorioEntrada: {
    oneOf: [
      objeto({ tipo: { type: 'string', enum: [TIPOS_RELATORIO.EMOCIONAL] }, mes: texto('2026-10', { description: 'AAAA-MM.' }), alunoId: inteiro(2, { description: 'Só psicólogo vinculado. Sem ele, é o relatório do próprio usuário.' }) }, ['tipo', 'mes']),
      objeto({ tipo: { type: 'string', enum: [TIPOS_RELATORIO.PEDAGOGICO] }, mes: texto('2026-10'), turma: texto('3º A'), nivelEnsino: enumeracao(NIVEIS_ENSINO) }, ['tipo', 'mes']),
      objeto({ tipo: { type: 'string', enum: [TIPOS_RELATORIO.ESTATISTICO] }, mes: texto('2026-10') }, ['tipo', 'mes'])
    ]
  },
  RelatorioResumo: objeto({
    id: inteiro(),
    tipo: enumeracao(TIPOS_RELATORIO),
    usuarioId: { type: 'integer', nullable: true },
    geradoPor: { type: 'integer', nullable: true },
    periodo: objeto({ inicio: dataPura, fim: dataPura }),
    descricao: texto('Relatório emocional de 10/2026'),
    geradoEm: dataHora
  }),
  Relatorio: objeto({
    id: inteiro(),
    tipo: enumeracao(TIPOS_RELATORIO),
    periodo: objeto({ inicio: dataPura, fim: dataPura }),
    descricao: texto('Relatório emocional de 10/2026'),
    geradoEm: dataHora,
    geradoPorNome: { type: 'string', nullable: true },
    sobre: { ...pessoaResumo, nullable: true },
    dados: {
      type: 'object',
      description:
        'Emocional: totalRegistros, diasComRegistro, humorMedio, humorMedioMesAnterior, variacaoHumor, tendencia (melhora|estavel|queda|sem_dados), distribuicaoPorEmocao, distribuicaoPorIntensidade, indicadores {ansiedade, estresse, tristeza}, serieDiaria[], aviso. ' +
        'Pedagógico: o mesmo formato do painel coletivo. Estatístico: usuários por perfil, registros, sessões por status, mensagens, alertas por tipo, feedbacks, conteúdos.'
    }
  }),
  PainelColetivo: objeto(
    {
      periodo: objeto({ mes: texto('2026-10'), inicio: dataPura, fim: dataPura }),
      filtros: objeto({ turma: { type: 'string', nullable: true }, nivelEnsino: { type: 'string', nullable: true } }),
      suprimido: { type: 'boolean', description: 'Verdadeiro quando poucos alunos registraram no recorte: nenhum número é devolvido.' },
      alunosMatriculados: inteiro(30),
      alunosComRegistro: { type: 'integer', nullable: true },
      participacaoPercentual: { type: 'number', nullable: true },
      geral: { type: 'object', nullable: true, description: 'registros, humorMedio, distribuicaoPorEmocao, distribuicaoPorIntensidade, indicadores.' },
      porNivelEnsino: { type: 'array', items: { type: 'object' } },
      porTurma: { type: 'array', items: { type: 'object' }, description: 'Grupos com menos alunos que o mínimo vêm só como {turma, alunosMatriculados, suprimido: true}.' },
      serieDiaria: { type: 'array', items: { type: 'object' } },
      situacaoAtualDosAlertas: objeto({ aberto: inteiro(), em_acompanhamento: inteiro(), resolvido: inteiro() }),
      aviso: texto('Indicadores coletivos... Não constituem diagnóstico.')
    },
    undefined,
    `Nada que identifique um aluno. Recortes com menos de ${LIMITES.minimoAlunosPorGrupo} alunos registrando têm os números ocultos.`
  ),
  PainelPessoal: {
    type: 'object',
    description:
      'Varia com o perfil. Todos: papel, notificacoesNaoLidas, conversasNaoLidas. Quem acompanha o próprio estado (aluno, professor, pedagógico): registrouHoje, ultimoRegistro (sem observação), ultimosSeteDias, metasEmAndamento. ' +
      'Aluno: proximasSessoes, profissionaisComAcessoAosRegistros. Psicólogo e pedagógico: alertas, sessoesAguardandoResposta, proximasSessoes (psicólogo: alunosAcompanhados). Administrador: usuarios por perfil.'
  },
  LogAuditoria: objeto({
    id: inteiro(),
    usuarioId: { type: 'integer', nullable: true, description: 'Quem agiu.' },
    alvoUsuarioId: { type: 'integer', nullable: true, description: 'Sobre quem.' },
    acao: texto('registros_consultados'),
    recurso: { type: 'string', nullable: true },
    recursoId: { type: 'integer', nullable: true },
    idRequisicao: { type: 'string', nullable: true, description: 'Igual ao X-Request-Id da resposta.' },
    detalhes: { type: 'object', nullable: true },
    criadoEm: dataHora
  })
};
