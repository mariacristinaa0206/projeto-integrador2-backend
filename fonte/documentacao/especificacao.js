import { LIMITES, PREFIXO_API } from '../configuracao/constantes.js';
import { caminhos } from './caminhos.js';
import { esquemas } from './esquemas.js';

/** Especificação OpenAPI 3.0 servida pelo Swagger UI em /docs. */

const respostaErro = (descricao) => ({
  description: descricao,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } }
});

export const especificacaoOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'ConectaMente · API',
    version: '1.0.0',
    description: [
      'API do **ConectaMente – Sistema de Apoio ao Bem-Estar Psicológico**, para o ambiente escolar: registro emocional, orientações, conteúdos educativos, sessões com a equipe de apoio, chat seguro, relatórios e indicadores coletivos.',
      '',
      '**Como usar:** faça `POST /autenticacao/entrar` (ou `/autenticacao/cadastro`), copie o `token` e clique em **Authorize** (cadeado). Contas criadas pela escola nascem com **senha provisória**: o primeiro login só permite `POST /autenticacao/trocar-senha`.',
      '',
      '**Perfis (`papel`):** `aluno`, `professor`, `pedagogico`, `psicologo`, `administrador`. O perfil vem do banco a cada requisição (não do token).',
      '',
      '**Privacidade (LGPD):** dado emocional é dado de saúde. O diário individual (`/alunos/{id}/registros`) só abre para o **psicólogo com vínculo ativo** com aquele aluno (o aluno autoriza ao marcar sessão, a escola designa ou o psicólogo assume um alerta; o aluno revoga quando quiser). O pedagógico vê alertas e indicadores, não o diário. Os painéis coletivos escondem recortes com poucos alunos. Textos livres são cifrados (AES-256-GCM) e toda leitura sensível fica na auditoria.',
      '',
      '**O sistema não diagnostica.** Relatórios e alertas são indicadores de acompanhamento e triagem, não diagnóstico.',
      '',
      `**Padrões:** listagens paginadas (\`pagina\`, \`limite\`; padrão ${LIMITES.paginaPadrao}, máximo ${LIMITES.paginaMaxima}). Erros: \`{ erro: { codigo, mensagem, detalhes?, idRequisicao } }\`. Datas \`AAAA-MM-DD\`; instantes em ISO 8601 com fuso. Dias e horários seguem o **horário de Brasília**.`
    ].join('\n')
  },
  servers: [{ url: PREFIXO_API, description: 'Esta instância' }],
  tags: [
    { name: 'Sistema' },
    { name: 'Autenticação' },
    { name: 'Perfil' },
    { name: 'Usuários', description: 'Gestão de contas pela escola (RF01).' },
    { name: 'Registro emocional', description: 'Escala de sentimentos e anotações (RF02, RF09).' },
    { name: 'Conteúdos', description: 'Orientações iniciais, artigos, vídeos, atividades e quizzes (RF04, RF05).' },
    { name: 'Metas', description: 'Metas de saúde mental (RF10).' },
    { name: 'Sessões', description: 'Agendamento com a equipe de apoio (RF06).' },
    { name: 'Chat', description: 'Conversa segura entre aluno e equipe de apoio (RF07).' },
    { name: 'Feedback', description: 'Avaliação do sistema e das sessões (RF08).' },
    { name: 'Notificações' },
    { name: 'Alertas', description: 'Triagem de padrões que merecem atenção da equipe.' },
    { name: 'Vínculos', description: 'Quem pode ver os registros de quem.' },
    { name: 'Alunos (equipe)', description: 'Visão da equipe de apoio sobre os alunos.' },
    { name: 'Relatórios', description: 'Relatórios mensais (RF03).' },
    { name: 'Painéis' },
    { name: 'Auditoria', description: 'Quem fez o quê e sobre quem (RNF10).' }
  ],
  paths: caminhos,
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: esquemas,
    responses: {
      Erro400: respostaErro('Dados inválidos.'),
      Erro401: respostaErro('Não autenticado, sessão encerrada ou credenciais inválidas.'),
      Erro403: respostaErro('Perfil sem permissão, senha provisória pendente ou senha atual incorreta.'),
      Erro404: respostaErro('Recurso não encontrado (ou fora do alcance da pessoa: não se revela que existe).'),
      Erro409: respostaErro('Conflito (dado duplicado, horário ocupado ou ação incompatível com a situação atual).'),
      Erro422: respostaErro('Pedido bem-formado, mas que quebra uma regra do negócio.'),
      Erro429: respostaErro('Muitas requisições.'),
      Erro503: respostaErro('Banco de dados indisponível.')
    }
  }
};
