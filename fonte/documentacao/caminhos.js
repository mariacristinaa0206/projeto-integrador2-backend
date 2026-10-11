import { LIMITES, PAPEIS, PAPEIS_APOIO, PAPEIS_GESTAO_CONTEUDO, PAPEIS_PAINEL_COLETIVO, PAPEIS_QUE_REGISTRAM_EMOCAO } from '../configuracao/constantes.js';
import { paginado, ref } from './esquemas.js';

/** Caminhos (paths) da especificação OpenAPI, montados a partir de pequenos construtores. */

const autenticado = [{ bearerAuth: [] }];

const erro = (codigo) => ({ $ref: `#/components/responses/Erro${codigo}` });
const json = (esquema) => ({ content: { 'application/json': { schema: esquema } } });
const corpoJson = (esquema, obrigatorio = true) => ({ required: obrigatorio, content: { 'application/json': { schema: esquema } } });

const parametroCaminho = (nome = 'id', descricao = 'Identificador numérico') => ({
  name: nome,
  in: 'path',
  required: true,
  description: descricao,
  schema: { type: 'integer', minimum: 1 }
});

const consulta = (nome, esquema, descricao) => ({ name: nome, in: 'query', ...(descricao ? { description: descricao } : {}), schema: esquema });

const paginacao = [
  consulta('pagina', { type: 'integer', minimum: 1, default: 1 }),
  consulta('limite', { type: 'integer', minimum: 1, maximum: LIMITES.paginaMaxima, default: LIMITES.paginaPadrao })
];

const ROTULO = {
  [PAPEIS.ALUNO]: 'Aluno',
  [PAPEIS.PROFESSOR]: 'Professor',
  [PAPEIS.PEDAGOGICO]: 'Pedagógico',
  [PAPEIS.PSICOLOGO]: 'Psicólogo',
  [PAPEIS.ADMINISTRADOR]: 'Administrador'
};

/**
 * Monta uma operação. Os erros mais comuns são deduzidos: 401 se exige login, 403 se restringe perfil, 400 se recebe
 * dados, 404 se tem parâmetro de caminho, 429 sempre. `papeis: null` = qualquer perfil autenticado.
 */
function operacao({ tag, resumo, descricao, papeis = null, publico = false, parametros = [], corpo, ok = 200, resposta, extras = [], provisoria = false }) {
  const codigos = new Set(extras);
  if (!publico) codigos.add(401);
  if (papeis && !provisoria) codigos.add(403);
  if (!publico && !provisoria) codigos.add(403); // senha provisória bloqueia as demais rotas
  if (corpo || parametros.length > 0) codigos.add(400);
  if (parametros.some((p) => p.in === 'path')) codigos.add(404);
  codigos.add(429);

  const quemPode = publico
    ? '**Acesso:** público.'
    : papeis
      ? `**Perfis:** ${papeis.map((p) => ROTULO[p]).join(', ')}.`
      : '**Perfis:** qualquer pessoa autenticada.';
  const observacao = !publico && !provisoria ? 'Quem ainda está com senha provisória recebe 403 `TROCA_DE_SENHA_OBRIGATORIA`.' : '';

  return {
    tags: [tag],
    summary: resumo,
    description: [quemPode, descricao, observacao].filter(Boolean).join('\n\n'),
    ...(publico ? {} : { security: autenticado }),
    ...(parametros.length > 0 ? { parameters: parametros } : {}),
    ...(corpo ? { requestBody: corpo } : {}),
    responses: {
      [ok]: { description: ok === 204 ? 'Sem conteúdo.' : 'Sucesso.', ...(resposta ? json(resposta) : {}) },
      ...Object.fromEntries([...codigos].sort().map((c) => [String(c), erro(c)]))
    }
  };
}

const ID = parametroCaminho();
const TODOS = null;
const EQUIPE = [...PAPEIS_APOIO];
const registram = [...PAPEIS_QUE_REGISTRAM_EMOCAO];

export const caminhos = {
  '/saude': {
    get: { tags: ['Sistema'], summary: 'Verificação de saúde (banco acessível)', responses: { 200: { description: 'OK.' }, 503: erro(503) } }
  },

  // ---------------------------------------------------------------- Autenticação
  '/autenticacao/cadastro': {
    post: operacao({
      tag: 'Autenticação',
      resumo: 'Cadastrar-se como aluno (autocadastro)',
      publico: true,
      descricao:
        'Só aluno e só dos níveis liberados para autocadastro (ensino médio). Crianças e alunos do AEE são cadastrados pela escola (`POST /usuarios`) com o consentimento do responsável. ' +
        'O `aceiteTermos` vira o consentimento registrado. E-mail repetido → 409. Com `DOMINIOS_EMAIL_PERMITIDOS` configurado, exige e-mail institucional.',
      corpo: corpoJson(ref('CadastroAluno')),
      ok: 201,
      resposta: ref('Sessao'),
      extras: [409]
    })
  },
  '/autenticacao/entrar': {
    post: operacao({
      tag: 'Autenticação',
      resumo: 'Entrar (login)',
      publico: true,
      descricao:
        'Só e-mail e senha; o perfil vem na resposta (`usuario.papel`). Senha errada e e-mail inexistente respondem igual. Limite de tentativas por IP e por conta. ' +
        'Conta desativada (com a senha certa) → 403 `CONTA_DESATIVADA`. Com `usuario.deveTrocarSenha = true`, só `trocar-senha` e `GET /perfil` funcionam.',
      corpo: corpoJson(ref('Entrar')),
      resposta: ref('Sessao'),
      extras: [401, 403]
    })
  },
  '/autenticacao/sair': {
    post: operacao({
      tag: 'Autenticação',
      resumo: 'Sair em todos os dispositivos',
      descricao: 'Invalida TODOS os tokens da conta (sobe a versão do token).',
      provisoria: true,
      ok: 204
    })
  },
  '/autenticacao/trocar-senha': {
    post: operacao({
      tag: 'Autenticação',
      resumo: 'Trocar a própria senha',
      descricao: 'Único caminho de quem entrou com senha provisória. Invalida os tokens antigos e devolve uma sessão nova. A nova senha precisa de letra e número.',
      provisoria: true,
      corpo: corpoJson(ref('TrocarSenha')),
      resposta: ref('Sessao'),
      extras: [403]
    })
  },

  // ---------------------------------------------------------------- Perfil
  '/perfil': {
    get: operacao({ tag: 'Perfil', resumo: 'Ver o próprio perfil', provisoria: true, resposta: ref('Conta') }),
    put: operacao({
      tag: 'Perfil',
      resumo: 'Editar o próprio nome e e-mail',
      descricao: 'Trocar o e-mail exige `senhaAtual`. Turma e nível de ensino só a escola altera.',
      corpo: corpoJson(ref('PerfilEntrada')),
      resposta: { type: 'object', properties: { usuario: ref('Conta') } },
      extras: [403, 409]
    })
  },
  '/perfil/excluir': {
    post: operacao({
      tag: 'Perfil',
      resumo: 'Excluir a própria conta (direito de eliminação)',
      descricao: 'Apaga a conta e TUDO que depende dela (registros, metas, sessões, conversas, vínculos...). A trilha de auditoria permanece, sem conteúdo. O último administrador não pode se excluir (422).',
      corpo: corpoJson(ref('ExcluirPerfil')),
      ok: 204,
      extras: [403, 422]
    })
  },

  // ---------------------------------------------------------------- Usuários
  '/usuarios': {
    get: operacao({
      tag: 'Usuários',
      resumo: 'Listar contas',
      papeis: [PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO],
      descricao: 'O pedagógico vê somente alunos.',
      parametros: [
        consulta('papel', { type: 'string', enum: Object.values(PAPEIS) }),
        consulta('busca', { type: 'string' }, 'Parte do nome ou e-mail.'),
        consulta('ativo', { type: 'boolean' }),
        consulta('turma', { type: 'string' }),
        consulta('nivelEnsino', { type: 'string' }),
        ...paginacao
      ],
      resposta: paginado(ref('Conta'))
    }),
    post: operacao({
      tag: 'Usuários',
      resumo: 'Cadastrar conta (RF01)',
      papeis: [PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO],
      descricao:
        'Administrador cria qualquer perfil; pedagógico só alunos. Aluno exige `consentimentoResponsavel: true`. A senha é gerada pelo servidor, devolvida UMA vez, e o primeiro acesso obriga a troca.',
      corpo: corpoJson(ref('CriarUsuario')),
      ok: 201,
      resposta: ref('UsuarioCriado'),
      extras: [409]
    })
  },
  '/usuarios/{id}': {
    get: operacao({ tag: 'Usuários', resumo: 'Ver uma conta', papeis: [PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO], parametros: [ID], resposta: ref('Conta') }),
    put: operacao({
      tag: 'Usuários',
      resumo: 'Editar uma conta',
      papeis: [PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO],
      descricao: 'Conta fora do alcance (ex.: pedagógico → psicólogo) responde 404.',
      parametros: [ID],
      corpo: corpoJson(ref('AtualizarUsuario')),
      resposta: ref('Conta'),
      extras: [409]
    }),
    delete: operacao({
      tag: 'Usuários',
      resumo: 'Excluir uma conta (permanente)',
      papeis: [PAPEIS.ADMINISTRADOR],
      descricao: 'Exige `?confirmar=true`. Apaga também tudo que depende da conta. Conteúdos e anotações que a pessoa criou continuam, sem autor.',
      parametros: [ID, consulta('confirmar', { type: 'string', enum: ['true'] }, 'Obrigatório.')],
      ok: 204,
      extras: [422]
    })
  },
  '/usuarios/{id}/situacao': {
    put: operacao({
      tag: 'Usuários',
      resumo: 'Ativar ou desativar uma conta',
      papeis: [PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO],
      descricao: 'Desativar derruba as sessões abertas na hora e impede novo login. Ninguém altera a própria situação (422).',
      parametros: [ID],
      corpo: corpoJson(ref('Situacao')),
      resposta: ref('Conta'),
      extras: [422]
    })
  },
  '/usuarios/{id}/redefinir-senha': {
    post: operacao({
      tag: 'Usuários',
      resumo: 'Redefinir a senha (esqueci a senha)',
      papeis: [PAPEIS.ADMINISTRADOR],
      descricao: 'Gera nova senha provisória (devolvida uma vez), derruba as sessões e obriga a troca no próximo acesso.',
      parametros: [ID],
      resposta: ref('SenhaTemporaria'),
      extras: [422]
    })
  },

  // ---------------------------------------------------------------- Registro emocional
  '/registros/catalogo': {
    get: operacao({ tag: 'Registro emocional', resumo: 'Escala de sentimentos (emoções e intensidades)', papeis: registram, resposta: ref('CatalogoEmocoes') })
  },
  '/registros': {
    post: operacao({
      tag: 'Registro emocional',
      resumo: 'Registrar o estado emocional (RF02, RF09)',
      papeis: registram,
      descricao:
        'O dia vem do servidor (Brasília) e o humor é derivado da emoção. Até 10 registros por dia. Emoção desconfortável devolve as orientações iniciais (RF04); com intensidade alta (ou "muito triste"), também o apoio imediato (CVV 188). ' +
        'Para alunos, a gravação avalia os alertas de acompanhamento.',
      corpo: corpoJson(ref('RegistrarEntrada')),
      ok: 201,
      resposta: ref('RegistroCriado'),
      extras: [422]
    }),
    get: operacao({
      tag: 'Registro emocional',
      resumo: 'Listar os próprios registros',
      papeis: registram,
      parametros: [
        consulta('mes', { type: 'string', example: '2026-10' }, 'AAAA-MM. Não combina com de/ate.'),
        consulta('de', { type: 'string', format: 'date' }),
        consulta('ate', { type: 'string', format: 'date' }),
        consulta('emocao', { type: 'string' }),
        ...paginacao
      ],
      resposta: paginado(ref('Registro'))
    })
  },
  '/registros/{id}': {
    get: operacao({ tag: 'Registro emocional', resumo: 'Ver um registro próprio', papeis: registram, parametros: [ID], resposta: ref('Registro') }),
    delete: operacao({ tag: 'Registro emocional', resumo: 'Excluir um registro próprio', papeis: registram, parametros: [ID], ok: 204 })
  },
  '/registros/{id}/observacao': {
    put: operacao({
      tag: 'Registro emocional',
      resumo: 'Editar ou apagar a anotação do registro (RF09)',
      papeis: registram,
      descricao: 'Emoção e intensidade não mudam depois de gravadas.',
      parametros: [ID],
      corpo: corpoJson(ref('ObservacaoEntrada')),
      resposta: ref('Registro')
    })
  },

  // ---------------------------------------------------------------- Orientações e conteúdos
  '/orientacoes': {
    get: operacao({
      tag: 'Conteúdos',
      resumo: 'Orientações iniciais (RF04)',
      papeis: TODOS,
      descricao: 'Por tema ou pela emoção. Usa o texto do nível de ensino da pessoa (criança, adolescente...). Emoção confortável devolve lista vazia. O apoio imediato acompanha sempre.',
      parametros: [consulta('tema', { type: 'string' }), consulta('emocao', { type: 'string' })],
      resposta: ref('Orientacoes')
    })
  },
  '/conteudos': {
    get: operacao({
      tag: 'Conteúdos',
      resumo: 'Listar conteúdos educativos (RF05)',
      papeis: TODOS,
      descricao: 'Aluno vê só publicados do seu nível. Gestão (administrador, psicólogo, pedagógico) vê rascunhos e o gabarito dos quizzes.',
      parametros: [
        consulta('tipo', { type: 'string', enum: ['artigo', 'video', 'audio', 'atividade', 'quiz', 'orientacao'] }),
        consulta('tema', { type: 'string' }),
        consulta('busca', { type: 'string' }),
        consulta('publicado', { type: 'boolean' }, 'Só tem efeito para a gestão.'),
        ...paginacao
      ],
      resposta: paginado(ref('Conteudo'))
    }),
    post: operacao({
      tag: 'Conteúdos',
      resumo: 'Criar conteúdo',
      papeis: [...PAPEIS_GESTAO_CONTEUDO],
      descricao: 'Quiz exige `estrutura`; vídeo e áudio exigem `urlMidia` (https).',
      corpo: corpoJson(ref('ConteudoEntrada')),
      ok: 201,
      resposta: ref('Conteudo')
    })
  },
  '/conteudos/{id}': {
    get: operacao({ tag: 'Conteúdos', resumo: 'Ver um conteúdo', papeis: TODOS, parametros: [ID], resposta: ref('Conteudo') }),
    put: operacao({
      tag: 'Conteúdos',
      resumo: 'Substituir um conteúdo',
      papeis: [...PAPEIS_GESTAO_CONTEUDO],
      descricao: 'Administrador edita qualquer um; psicólogo e pedagógico, só os que criaram (senão 403).',
      parametros: [ID],
      corpo: corpoJson(ref('ConteudoEntrada')),
      resposta: ref('Conteudo')
    }),
    delete: operacao({ tag: 'Conteúdos', resumo: 'Excluir um conteúdo', papeis: [...PAPEIS_GESTAO_CONTEUDO], descricao: 'Mesma regra de autoria da edição.', parametros: [ID], ok: 204 })
  },
  '/conteudos/{id}/respostas': {
    post: operacao({
      tag: 'Conteúdos',
      resumo: 'Responder um quiz',
      papeis: TODOS,
      descricao: 'A correção é feita no servidor (o gabarito nunca vai para quem responde). Nada é gravado.',
      parametros: [ID],
      corpo: corpoJson(ref('RespostaQuizEntrada')),
      resposta: ref('ResultadoQuiz'),
      extras: [422]
    })
  },

  // ---------------------------------------------------------------- Metas
  '/metas': {
    post: operacao({ tag: 'Metas', resumo: 'Criar meta de saúde mental (RF10)', papeis: registram, descricao: `Até ${LIMITES.maxMetasEmAndamento} metas em andamento.`, corpo: corpoJson(ref('MetaEntrada')), ok: 201, resposta: ref('Meta'), extras: [409] }),
    get: operacao({ tag: 'Metas', resumo: 'Listar as próprias metas', papeis: registram, parametros: [consulta('status', { type: 'string', enum: ['em_andamento', 'concluida', 'abandonada'] }), ...paginacao], resposta: paginado(ref('Meta')) })
  },
  '/metas/{id}': {
    get: operacao({ tag: 'Metas', resumo: 'Ver uma meta própria', papeis: registram, parametros: [ID], resposta: ref('Meta') }),
    put: operacao({ tag: 'Metas', resumo: 'Atualizar uma meta (parcial)', papeis: registram, descricao: 'Concluir grava a data; sair de "concluída" a limpa.', parametros: [ID], corpo: corpoJson(ref('MetaAtualizacao')), resposta: ref('Meta'), extras: [409] }),
    delete: operacao({ tag: 'Metas', resumo: 'Excluir uma meta', papeis: registram, parametros: [ID], ok: 204 })
  },

  // ---------------------------------------------------------------- Sessões
  '/sessoes/profissionais': {
    get: operacao({ tag: 'Sessões', resumo: 'Profissionais com quem marcar sessão', papeis: [PAPEIS.ALUNO], resposta: { type: 'object', properties: { itens: { type: 'array', items: ref('Profissional') } } } })
  },
  '/sessoes/profissionais/{id}/horarios': {
    get: operacao({
      tag: 'Sessões',
      resumo: 'Grade de horários de um profissional em um dia',
      papeis: [PAPEIS.ALUNO],
      descricao: 'Blocos de 30 min (07:00–17:30, segunda a sexta). Fim de semana → lista vazia.',
      parametros: [ID, consulta('data', { type: 'string', format: 'date' }, 'Obrigatório.')],
      resposta: { type: 'object', properties: { data: { type: 'string', format: 'date' }, itens: { type: 'array', items: ref('Horario') } } }
    })
  },
  '/sessoes': {
    post: operacao({
      tag: 'Sessões',
      resumo: 'Solicitar sessão (RF06)',
      papeis: [PAPEIS.ALUNO],
      descricao:
        'Choque de horário (do profissional ou da própria aluna) → 409; fora da grade/prazo → 422; máximo de 3 solicitações em aberto. ' +
        '`compartilharRegistros: true` (opt-in, só psicólogo) cria o vínculo que permite ao psicólogo ver o diário.',
      corpo: corpoJson(ref('SessaoEntrada')),
      ok: 201,
      resposta: ref('SessaoAgendada'),
      extras: [409, 422]
    }),
    get: operacao({
      tag: 'Sessões',
      resumo: 'Listar as próprias sessões',
      papeis: [PAPEIS.ALUNO, ...EQUIPE],
      parametros: [consulta('status', { type: 'string', enum: ['solicitada', 'confirmada', 'recusada', 'cancelada', 'concluida'] }), consulta('de', { type: 'string', format: 'date' }), consulta('ate', { type: 'string', format: 'date' }), ...paginacao],
      resposta: paginado(ref('SessaoAgendada'))
    })
  },
  '/sessoes/{id}': { get: operacao({ tag: 'Sessões', resumo: 'Ver uma sessão', papeis: [PAPEIS.ALUNO, ...EQUIPE], descricao: 'Só os dois participantes.', parametros: [ID], resposta: ref('SessaoAgendada') }) },
  '/sessoes/{id}/confirmar': { post: operacao({ tag: 'Sessões', resumo: 'Confirmar solicitação', papeis: EQUIPE, parametros: [ID], resposta: ref('SessaoAgendada'), extras: [409] }) },
  '/sessoes/{id}/recusar': { post: operacao({ tag: 'Sessões', resumo: 'Recusar solicitação', papeis: EQUIPE, parametros: [ID], resposta: ref('SessaoAgendada'), extras: [409] }) },
  '/sessoes/{id}/concluir': { post: operacao({ tag: 'Sessões', resumo: 'Concluir sessão (depois do horário)', papeis: EQUIPE, parametros: [ID], resposta: ref('SessaoAgendada'), extras: [409] }) },
  '/sessoes/{id}/cancelar': { post: operacao({ tag: 'Sessões', resumo: 'Cancelar sessão (antes do início)', papeis: [PAPEIS.ALUNO, ...EQUIPE], descricao: 'A outra parte é avisada.', parametros: [ID], resposta: ref('SessaoAgendada'), extras: [409] }) },

  // ---------------------------------------------------------------- Chat
  '/conversas': {
    get: operacao({ tag: 'Chat', resumo: 'Listar as conversas', papeis: [PAPEIS.ALUNO, ...EQUIPE], resposta: { type: 'object', properties: { itens: { type: 'array', items: ref('Conversa') } } } }),
    post: operacao({
      tag: 'Chat',
      resumo: 'Abrir (ou reabrir) conversa (RF07)',
      papeis: [PAPEIS.ALUNO, ...EQUIPE],
      descricao: 'O aluno abre com qualquer profissional de apoio. O psicólogo só abre com aluno que acompanha (vínculo ativo); o pedagógico apenas reabre conversa que o aluno iniciou. Idempotente.',
      corpo: corpoJson(ref('AbrirConversa')),
      resposta: ref('Conversa')
    })
  },
  '/conversas/{id}/mensagens': {
    get: operacao({
      tag: 'Chat',
      resumo: 'Ler mensagens (polling incremental)',
      papeis: [PAPEIS.ALUNO, ...EQUIPE],
      descricao: 'Só os dois participantes (inclusive o administrador recebe 403/404). Sem `depois`: as mais recentes. Com `depois=<último id>`: só as novas. Consulte a cada poucos segundos.',
      parametros: [ID, consulta('depois', { type: 'integer' }), consulta('limite', { type: 'integer', default: 50, maximum: LIMITES.maxMensagensPorLeitura })],
      resposta: ref('Mensagens')
    }),
    post: operacao({ tag: 'Chat', resumo: 'Enviar mensagem', papeis: [PAPEIS.ALUNO, ...EQUIPE], descricao: 'Mensagens são cifradas no banco. Destinatário desativado → 409.', parametros: [ID], corpo: corpoJson(ref('MensagemEntrada')), ok: 201, resposta: ref('Mensagem'), extras: [409] })
  },
  '/conversas/{id}/lidas': {
    post: operacao({ tag: 'Chat', resumo: 'Marcar como lidas as mensagens da outra pessoa', papeis: [PAPEIS.ALUNO, ...EQUIPE], parametros: [ID], resposta: { type: 'object', properties: { marcadas: { type: 'integer' } } } })
  },

  // ---------------------------------------------------------------- Feedback
  '/feedbacks': {
    post: operacao({
      tag: 'Feedback',
      resumo: 'Avaliar o sistema ou uma sessão concluída (RF08)',
      papeis: TODOS,
      descricao: 'Nota de 1 a 5. Sistema: até 3 por dia. Sessão: só o aluno dela, depois de concluída, uma vez (senão 409).',
      corpo: corpoJson(ref('FeedbackEntrada')),
      ok: 201,
      resposta: ref('Feedback'),
      extras: [409, 422]
    }),
    get: operacao({
      tag: 'Feedback',
      resumo: 'Gestão: todas as avaliações (anônimas)',
      papeis: [PAPEIS.ADMINISTRADOR],
      descricao: 'Nunca identifica quem avaliou. Inclui nota média por alvo em `resumo`.',
      parametros: [consulta('alvo', { type: 'string', enum: ['sistema', 'sessao'] }), consulta('notaMinima', { type: 'integer' }), consulta('notaMaxima', { type: 'integer' }), consulta('de', { type: 'string', format: 'date' }), consulta('ate', { type: 'string', format: 'date' }), ...paginacao],
      resposta: { allOf: [paginado(ref('FeedbackDaGestao')), { type: 'object', properties: { resumo: { type: 'array', items: { type: 'object', properties: { alvo: { type: 'string' }, total: { type: 'integer' }, notaMedia: { type: 'number', nullable: true } } } } } }] }
    })
  },
  '/feedbacks/meus': { get: operacao({ tag: 'Feedback', resumo: 'Listar as próprias avaliações', papeis: TODOS, parametros: paginacao, resposta: paginado(ref('Feedback')) }) },

  // ---------------------------------------------------------------- Notificações
  '/notificacoes': { get: operacao({ tag: 'Notificações', resumo: 'Listar notificações', papeis: TODOS, descricao: 'Textos genéricos: nunca trazem nome de aluno, emoção ou conteúdo.', resposta: ref('Notificacoes') }) },
  '/notificacoes/lidas': {
    post: operacao({ tag: 'Notificações', resumo: 'Marcar como lidas', papeis: TODOS, descricao: 'Corpo opcional: sem `ids`, marca todas. Só mexe nas do próprio usuário.', corpo: corpoJson(ref('MarcarLidas'), false), resposta: { type: 'object', properties: { marcadas: { type: 'integer' } } } })
  },

  // ---------------------------------------------------------------- Alertas
  '/alertas': {
    get: operacao({
      tag: 'Alertas',
      resumo: 'Alertas de acompanhamento',
      papeis: EQUIPE,
      descricao: 'Mostra QUEM é o aluno e um motivo genérico. Não mostra o conteúdo dos registros: o psicólogo só vê o diário ao assumir o alerta (vínculo).',
      parametros: [consulta('status', { type: 'string', enum: ['aberto', 'em_acompanhamento', 'resolvido'] }), consulta('tipo', { type: 'string' }), consulta('turma', { type: 'string' }), ...paginacao],
      resposta: paginado(ref('Alerta'))
    })
  },
  '/alertas/{id}/assumir': {
    post: operacao({ tag: 'Alertas', resumo: 'Assumir o acompanhamento do alerta', papeis: EQUIPE, descricao: 'O psicólogo que assume ganha vínculo (e o aluno é avisado); o pedagógico assume sem acesso ao diário. Só um vence se vários tentarem.', parametros: [ID], resposta: ref('Alerta'), extras: [409] })
  },
  '/alertas/{id}/resolver': {
    post: operacao({ tag: 'Alertas', resumo: 'Resolver o alerta', papeis: EQUIPE, descricao: 'Quem assumiu resolve o seu; alerta aberto (ou sem responsável) qualquer um da equipe encerra; o de outra pessoa → 403.', parametros: [ID], resposta: ref('Alerta'), extras: [409] })
  },

  // ---------------------------------------------------------------- Vínculos
  '/vinculos': {
    get: operacao({
      tag: 'Vínculos',
      resumo: 'Quem pode ver os registros de quem',
      papeis: [PAPEIS.ALUNO, PAPEIS.PSICOLOGO, PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO],
      descricao: 'Aluno vê QUEM pode ver os seus registros; psicólogo vê os seus alunos; administrador e pedagógico filtram por `alunoId`/`profissionalId`.',
      parametros: [consulta('status', { type: 'string', enum: ['ativo', 'encerrado'] }), consulta('alunoId', { type: 'integer' }), consulta('profissionalId', { type: 'integer' }), ...paginacao],
      resposta: paginado(ref('Vinculo'))
    }),
    post: operacao({
      tag: 'Vínculos',
      resumo: 'Designar psicólogo para acompanhar um aluno',
      papeis: [PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO],
      descricao: 'A aluna é avisada. Repetir não duplica (uma linha por par).',
      corpo: corpoJson(ref('VinculoEntrada')),
      ok: 201,
      resposta: ref('Vinculo'),
      extras: [409]
    })
  },
  '/vinculos/{id}/encerrar': {
    post: operacao({ tag: 'Vínculos', resumo: 'Encerrar o acesso', papeis: [PAPEIS.ALUNO, PAPEIS.PSICOLOGO, PAPEIS.ADMINISTRADOR, PAPEIS.PEDAGOGICO], descricao: 'O aluno revoga quando quiser: o diário fecha para o psicólogo na hora.', parametros: [ID], resposta: ref('Vinculo'), extras: [409] })
  },

  // ---------------------------------------------------------------- Alunos (equipe)
  '/alunos': {
    get: operacao({
      tag: 'Alunos (equipe)',
      resumo: 'Listar alunos',
      papeis: EQUIPE,
      descricao: 'Psicólogo: só os que acompanha. Pedagógico: todos os ativos (identificação e turma).',
      parametros: [consulta('busca', { type: 'string' }), consulta('turma', { type: 'string' }), consulta('nivelEnsino', { type: 'string' }), ...paginacao],
      resposta: paginado(ref('AlunoDaEquipe'))
    })
  },
  '/alunos/{id}': { get: operacao({ tag: 'Alunos (equipe)', resumo: 'Ver um aluno', papeis: EQUIPE, parametros: [ID], resposta: ref('AlunoDaEquipe') }) },
  '/alunos/{id}/registros': {
    get: operacao({
      tag: 'Alunos (equipe)',
      resumo: 'Diário emocional do aluno',
      papeis: [PAPEIS.PSICOLOGO],
      descricao: 'Só o psicólogo com vínculo ATIVO (senão 404). Cada leitura é gravada na auditoria. Limite de consultas por minuto.',
      parametros: [ID, consulta('mes', { type: 'string' }), consulta('de', { type: 'string', format: 'date' }), consulta('ate', { type: 'string', format: 'date' }), consulta('emocao', { type: 'string' }), ...paginacao],
      resposta: paginado(ref('Registro'))
    })
  },
  '/alunos/{id}/acompanhamentos': {
    get: operacao({
      tag: 'Alunos (equipe)',
      resumo: 'Anotações da equipe sobre o aluno',
      papeis: EQUIPE,
      descricao: 'Psicólogo: as próprias psicológicas (sempre) e as pedagógicas (com vínculo). Pedagógico: só as pedagógicas. Nenhum psicólogo lê a anotação psicológica de outro.',
      parametros: [ID, ...paginacao],
      resposta: paginado(ref('Acompanhamento'))
    }),
    post: operacao({
      tag: 'Alunos (equipe)',
      resumo: 'Registrar anotação (imutável)',
      papeis: EQUIPE,
      descricao: 'Psicólogo precisa de vínculo ativo; o tipo da anotação vem do perfil do autor.',
      parametros: [ID],
      corpo: corpoJson(ref('AcompanhamentoEntrada')),
      ok: 201,
      resposta: ref('Acompanhamento'),
      extras: [422]
    })
  },

  // ---------------------------------------------------------------- Relatórios
  '/relatorios': {
    post: operacao({
      tag: 'Relatórios',
      resumo: 'Gerar relatório mensal (RF03)',
      papeis: TODOS,
      descricao:
        '**emocional**: o próprio (aluno, professor, pedagógico) ou, com `alunoId`, de aluno vinculado (psicólogo). **pedagogico**: indicadores coletivos (administrador, pedagógico, psicólogo, professor). **estatistico**: uso da plataforma (administrador). ' +
        'Grava um instantâneo cifrado. Limite de 20 por hora.',
      corpo: corpoJson(ref('RelatorioEntrada')),
      ok: 201,
      resposta: ref('Relatorio'),
      extras: [422]
    }),
    get: operacao({ tag: 'Relatórios', resumo: 'Listar relatórios gerados por mim ou sobre mim', papeis: TODOS, parametros: [consulta('tipo', { type: 'string', enum: ['emocional', 'pedagogico', 'estatistico'] }), ...paginacao], resposta: paginado(ref('RelatorioResumo')) })
  },
  '/relatorios/{id}': {
    get: operacao({ tag: 'Relatórios', resumo: 'Abrir um relatório', papeis: TODOS, descricao: 'O psicólogo só reabre relatório de aluno enquanto o vínculo estiver ativo.', parametros: [ID], resposta: ref('Relatorio') })
  },

  // ---------------------------------------------------------------- Painéis
  '/painel': { get: operacao({ tag: 'Painéis', resumo: 'Tela inicial do perfil', papeis: TODOS, descricao: 'Uma chamada traz o que a tela inicial precisa (varia com o perfil).', resposta: ref('PainelPessoal') }) },
  '/painel/coletivo': {
    get: operacao({
      tag: 'Painéis',
      resumo: 'Indicadores emocionais coletivos',
      papeis: [...PAPEIS_PAINEL_COLETIVO],
      descricao: `Sem identificar ninguém. Recortes com menos de ${LIMITES.minimoAlunosPorGrupo} alunos registrando têm os números ocultos (\`suprimido: true\`).`,
      parametros: [consulta('mes', { type: 'string', example: '2026-10' }, 'Padrão: mês atual.'), consulta('turma', { type: 'string' }), consulta('nivelEnsino', { type: 'string' })],
      resposta: ref('PainelColetivo')
    })
  },

  // ---------------------------------------------------------------- Auditoria
  '/auditoria': {
    get: operacao({
      tag: 'Auditoria',
      resumo: 'Trilha de auditoria (RNF10)',
      papeis: [PAPEIS.ADMINISTRADOR],
      descricao: 'Somente leitura. Datas em dias de Brasília. Nunca guarda conteúdo.',
      parametros: [consulta('usuarioId', { type: 'integer' }, 'Quem agiu.'), consulta('alvoUsuarioId', { type: 'integer' }, 'Sobre quem.'), consulta('acao', { type: 'string' }), consulta('de', { type: 'string', format: 'date' }), consulta('ate', { type: 'string', format: 'date' }), ...paginacao],
      resposta: paginado(ref('LogAuditoria'))
    })
  }
};
