# Backend · ConectaMente

API REST em **Node.js (JavaScript, ESM) + Express 5 + Prisma 7 + PostgreSQL (Neon)** do **ConectaMente – Sistema de Apoio ao Bem-Estar Psicológico** (Projeto Integrador II, UESPI/EAD): uma plataforma para a escola acompanhar o bem-estar emocional dos estudantes, com orientação inicial, conteúdos educativos, sessões e chat com a equipe de apoio, relatórios e indicadores.

- **Aluno**: registra como se sente (escala de sentimentos), recebe orientações, acessa conteúdos e quizzes, define metas, marca sessões, conversa com a equipe, vê relatório mensal e avalia o sistema.
- **Professor** e **Pedagógico**: também acompanham o próprio estado emocional; veem os indicadores coletivos (sem identificar ninguém). O pedagógico ainda vê os alertas, cadastra alunos e escreve anotações pedagógicas.
- **Psicólogo**: recebe sessões e conversas, vê os alertas e, **somente dos alunos que acompanha**, lê o diário emocional e gera relatórios.
- **Administrador**: gerencia contas, conteúdos, relatórios estatísticos, avaliações (anônimas) e a auditoria.

Documentação interativa (Swagger, todas as 69 rotas): `http://localhost:3500/docs`

## Como rodar

Requisitos: Node 20.19+ (testado no 24) e um banco no [Neon](https://neon.tech) (ou qualquer PostgreSQL).

```bash
npm install
cp .env.exemplo .env     # preencha DATABASE_URL, CHAVE_CRIPTOGRAFIA e o administrador inicial
npm run db:setup         # gera o client do Prisma e aplica a migração (cria tabelas e conteúdos iniciais)
npm run dev              # ou: npm start
```

Variáveis do `.env` (detalhes e opcionais no `.env.exemplo`):

| Variável | O que é |
|---|---|
| `DATABASE_URL` | **Obrigatória.** URL do PostgreSQL (Neon: painel › Connect). Mantenha `?sslmode=require`. |
| `CHAVE_CRIPTOGRAFIA` | **Obrigatória.** 64 caracteres hexadecimais (32 bytes). Gere com `node -p "require('node:crypto').randomBytes(32).toString('hex')"`. |
| `ADMIN_EMAIL` + `ADMIN_SENHA` | Recomendadas na 1ª partida. Se não existir nenhum administrador, o servidor cria este (com senha **provisória**: a troca é obrigatória no 1º login). Depois que existe um, são ignoradas. |
| `DOMINIOS_EMAIL_PERMITIDOS` | Opcional. Restringe o **cadastro público** a e-mails institucionais (ponto de extensão do caso de uso "Cadastrar usuário"). |
| `CORS_ORIGINS`, `TRUST_PROXY`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `DOCS_ENABLED` | Opcionais, com padrão seguro. |

> **`CHAVE_CRIPTOGRAFIA` não pode ser perdida nem trocada.** Ela cifra as observações dos registros emocionais, as anotações da equipe, as mensagens do chat, os motivos das sessões, as metas, os comentários de feedback e os relatórios. Sem ela esses dados ficam ilegíveis para sempre. Guarde uma cópia fora do banco. Por isso ela nunca é derivada de outra variável.

> **Neon:** para rodar a migração use a URL de conexão **direta** (sem `-pooler` no host). Depois, a URL pooled funciona normalmente para o servidor.

> **Front em desenvolvimento:** sirva o front por um servidor local (Live Server, `npx serve`...), não abrindo o `index.html` direto do disco (`file://`): o navegador enviaria `Origin: null` e a API responderia 403 (CORS). Qualquer `http://localhost:PORTA` é aceito em desenvolvimento.

| Script | O que faz |
|---|---|
| `npm run dev` | servidor com reinício automático |
| `npm start` | servidor em produção |
| `npm run db:generate` | gera o client do Prisma |
| `npm run db:migrate` | aplica as migrações (`prisma migrate deploy`) |
| `npm run db:setup` | os dois acima em sequência |

## Do PDF para a API

### Requisitos funcionais

| RF | Como está no backend | Rotas principais |
|---|---|---|
| RF01 cadastro (incluir, alterar, excluir) | Autocadastro do aluno do ensino médio; a escola cadastra os demais; edição; desativar; excluir (admin ou a própria pessoa). | `POST /autenticacao/cadastro`, `/usuarios`, `/perfil`, `POST /perfil/excluir` |
| RF02 registro diário por escala de sentimentos | 10 emoções (a escala muito feliz … muito triste + calmo, irritado, com medo, ansioso, estressado) × intensidade baixa/média/alta. Até 10 por dia. | `/registros`, `/registros/catalogo` |
| RF03 relatório mensal com gráficos e tendências | Humor médio, comparação com o mês anterior, série diária, distribuições e indicadores de ansiedade/estresse/tristeza, prontos para gráfico. | `POST /relatorios` (`emocional`), `GET /relatorios/{id}` |
| RF04 orientações iniciais (ansiedade, estresse, tristeza) | Devolvidas junto com o registro desconfortável e em `/orientacoes`, no texto do **nível de ensino** (criança, adolescente). Intensidade alta traz o **CVV 188**. | `/orientacoes` |
| RF05 conteúdos (artigos, vídeos, quizzes, exercícios) | CRUD pela gestão; aluno vê só publicados do seu nível; quiz corrigido no servidor (o gabarito não vai ao aluno). | `/conteudos`, `POST /conteudos/{id}/respostas` |
| RF06 agendamento de sessões | Blocos de 30 min, seg–sex, 07:00–18:00 (Brasília); solicitada → confirmada/recusada → concluída; cancelar. | `/sessoes`, `/sessoes/profissionais/{id}/horarios` |
| RF07 chat seguro em tempo real | Mensagens cifradas; só os dois participantes. "Tempo real" por **leitura incremental** (`?depois=<último id>` a cada poucos segundos). | `/conversas` |
| RF08 feedback | Nota 1–5 + comentário, do sistema ou de uma sessão concluída; a gestão lê **sem ver quem avaliou**. | `/feedbacks` |
| RF09 anotações sobre o estado emocional | Campo `observacao` do registro, editável/apagável. | `PUT /registros/{id}/observacao` |
| RF10 metas de saúde mental | Metas pessoais (título cifrado), categorias, prazo, status. | `/metas` |

### Requisitos não funcionais

| RNF | Situação |
|---|---|
| RNF01/05/07/08 (responsivo, intuitivo, navegadores, acessibilidade) | São do **front**. A API ajuda: erros claros em português, catálogo de emoções com rótulos, conteúdos por nível (infantil/AEE com linguagem simples). |
| RNF02 resposta em até 3 s | Medido na bateria de testes (login com bcrypt, painéis, relatórios): todos abaixo de 3 s; 60 painéis simultâneos em ~0,5 s (máquina local, banco local). |
| RNF03 JWT | HS256 com emissor/público fixos, algoritmo travado (bloqueia `alg: none`), e conferência da conta no banco **a cada requisição** (logout, troca de senha e desativação derrubam o acesso na hora). |
| RNF04 LGPD | Ver "Privacidade". |
| RNF06 disponibilidade | `GET /saude`, desligamento limpo (SIGTERM), timeouts contra conexões lentas. A disponibilidade em si é da hospedagem. |
| RNF09 escalabilidade | Sem estado no servidor (JWT, chat por leitura incremental). Dois pontos a conhecer: o limitador de taxa é em memória do processo (com mais de uma instância, trocar o `store` por Redis) e o `bcryptjs` é JavaScript puro, que gasta ~240 ms de CPU por login na mesma thread (vazão de ~4 logins/s por instância; picos de login, como o início da aula, pedem mais instâncias). |
| RNF10 logs | Log estruturado (1 linha JSON por evento, **sem** corpo, query string, senha ou dado pessoal) + **trilha de auditoria no banco** (`GET /auditoria`). |

## Privacidade (LGPD): quem vê o quê

Dado emocional é **dado pessoal sensível** (saúde), e a maioria dos usuários é menor de idade. Por isso:

| Dado | Aluno (dono) | Psicólogo **com vínculo** | Pedagógico | Professor | Administrador |
|---|:-:|:-:|:-:|:-:|:-:|
| Diário (emoção, intensidade, observação) | sim | **sim** (auditado) | não | não | não |
| Relatório emocional do aluno | sim | sim (enquanto o vínculo existir) | não | não | não |
| Alertas (quem + motivo genérico) | — | sim | sim | não | não |
| Anotações da equipe | não¹ | as suas psicológicas + pedagógicas | só pedagógicas | não | não |
| Chat | participante | participante | participante | não | não |
| Indicadores coletivos | não | sim | sim | sim | sim |
| Avaliações (feedback) | as próprias | não | não | não | sim, **anônimas** |
| Auditoria | não | não | não | não | sim |

¹ O direito de acesso do titular às anotações da equipe não é atendido por esta API (decisão a tomar com o encarregado de dados da escola).

- **Vínculo** = permissão do psicólogo sobre o diário de **um** aluno. Nasce de 3 formas, todas gravadas com a origem: o **aluno** marca sessão e escolhe compartilhar (sempre opt-in, desligado por padrão); o psicólogo **assume um alerta**; a escola **designa**. Quando não foi o próprio aluno, ele é **notificado**. O aluno **revoga quando quiser** (`POST /vinculos/{id}/encerrar`) e o diário fecha na hora.
- **Cifra em repouso (AES-256-GCM)** nos textos livres, presa à linha de origem (copiar a cifra de outra linha é detectado). Emoção e intensidade ficam em claro porque os indicadores e alertas as agregam no banco.
- **Indicadores coletivos** nunca identificam alguém e escondem recortes com menos de **5 alunos** registrando (`suprimido: true`); se só um recorte ficar oculto, o menor dos visíveis também é ocultado (senão bastaria subtrair do total).
- **Notificações** têm texto fixo e genérico: nunca nome de aluno, emoção ou conteúdo.
- **Menores:** só o ensino médio se cadastra sozinho (`NIVEIS_AUTOCADASTRO` em `fonte/configuracao/constantes.js`). Infantil, fundamental e AEE são cadastrados pela escola, que precisa confirmar o **consentimento do responsável** (`consentimentoResponsavel: true`); fica registrado quem consentiu e quando (LGPD art. 14).
- **Eliminação:** `POST /perfil/excluir` (com a senha) apaga a conta e tudo que depende dela. A auditoria permanece, sem conteúdo.
- **O sistema não diagnostica.** Os relatórios chamam o que medem de "ansiedade, estresse e tristeza" (e não de "depressão", que seria diagnóstico) e trazem um aviso. Os alertas são triagem, não detecção de crise.

### Alertas de acompanhamento

Gerados ao registrar (só alunos), sem repetir enquanto o anterior não for resolvido:

1. `sequencia_negativa`: 5 dias seguidos (incluindo hoje) com humor médio do dia ≤ 2,5;
2. `intensidade_alta_recorrente`: 3 registros desconfortáveis de intensidade alta nos últimos 7 dias;
3. `queda_de_humor`: humor médio dos últimos 7 dias ≥ 1,5 ponto abaixo dos 7 anteriores (mínimo de 3 registros em cada janela).

Os limiares estão em `REGRAS_ALERTA` e podem ser ajustados com a psicologia da escola.

## Arquitetura em camadas

Pastas e arquivos em português; só o `server.js` mantém o nome padrão. Os nomes em inglês que restam são **exigidos pelas ferramentas**: `package.json`, `package-lock.json`, `node_modules`, `.env`, `.gitignore`, `prisma.config.js` (o Prisma só lê esse nome; ele aponta para as nossas pastas) e `migration.sql` / `migration_lock.toml`.

```
fonte/
├── server.js            boot, administrador inicial, timeouts, desligamento limpo
├── aplicacao.js         monta o Express e a ordem dos middlewares de segurança
├── configuracao/        ambiente (zod), constantes e regras de negócio, política de origens (CORS)
├── rotas/               URLs + corrente de intermediários de cada rota (a segurança fica visível aqui)
├── intermediarios/      autenticar, exigirPapel, validar, limitadores, corpoJson, tratadorErros
├── validadores/         esquemas zod (entrada)            ┐
├── controladores/       HTTP ⇄ serviço (finos)            │ a requisição
├── servicos/            regras de negócio e autorização   │ desce por
├── repositorios/        único lugar que fala com o Prisma │ estas camadas
├── serializadores/      o que sai para o cliente (DTO)    ┘
├── banco/               pool pg + PrismaClient
├── utilitarios/         datas (fuso), cifra, indicadores, senha, token, registrador...
└── documentacao/        especificação OpenAPI (Swagger)
modelagem/               modelo.prisma + migração (SQL)
```

Ordem das defesas em cada requisição: id da requisição → helmet → CORS → limite de taxa por IP → autenticação (confere a conta no banco) → perfil → limite por usuário → leitura do corpo (≤ 32 KB) → validação (zod, `strict`) → controlador.

## Banco de dados

| Tabela do PDF | Tabela | Acréscimos |
|---|---|---|
| TB_USUARIO | `usuarios` | `papel`, `ativo`, `deve_trocar_senha`, `versao_token`, `ultimo_acesso_em` |
| TB_ALUNO | `alunos` | `nivel_ensino` (infantil, **fundamental**, médio, AEE), consentimento (quando, de quem, registrado por quem) |
| TB_REGISTRO_EMOCIONAL | `registros_emocionais` | `dia` (data local de Brasília); observação cifrada |
| TB_CONTEUDO_EDUCATIVO | `conteudos_educativos` | tipos `quiz` e `orientacao`, `tema`, `niveis_ensino`, `url_midia`, `estrutura` (quiz), `publicado` |
| TB_ACOMPANHAMENTO | `acompanhamentos` | autor, tipo (pedagógico/psicológico), cifrado |
| TB_NOTIFICACAO | `notificacoes` | `tipo`, `referencia_id` |
| TB_RELATORIO | `relatorios` | dono, autor, período, `dados` cifrados |
| — | `vinculos`, `alertas`, `sessoes`, `conversas`, `mensagens`, `feedbacks`, `metas`, `logs_auditoria` | exigidas pelos RF06–RF10 e RNF10 |

A migração (`modelagem/migracoes/…/migration.sql`) tem, no fim, regras escritas à mão que o Prisma não expressa: CHECKs (e-mail minúsculo, grade de 30 min, nota 1–5, quiz ⇔ estrutura, link só https…), **índices únicos parciais** (impedem dois agendamentos vivos no mesmo horário e dois alertas vivos do mesmo tipo) e os conteúdos iniciais (orientações por nível, uma atividade de respiração e um quiz).

> **Datas e horas:** as colunas são `timestamp` (UTC) **sem fuso, de propósito**. Com `timestamptz`, o adaptador `pg` do Prisma envia o valor sem fuso e o Postgres o interpreta no fuso da *sessão*: num servidor fora de UTC (como um Postgres local no Brasil) tudo era gravado 3 h deslocado, sem a API perceber. Não troque para `@db.Timestamptz` sem revisar isso. O **dia** de cada registro é o de Brasília (`America/Sao_Paulo`), calculado pelo servidor.

## Como o front deve integrar

1. **Login:** `POST /autenticacao/entrar` → `{ token, usuario }`. Envie `Authorization: Bearer <token>`. O `usuario.papel` escolhe a tela inicial.
2. **Senha provisória:** se `usuario.deveTrocarSenha` for `true`, mostre só a tela de troca (`POST /autenticacao/trocar-senha`); as demais rotas respondem `403 TROCA_DE_SENHA_OBRIGATORIA`.
3. **Tela inicial:** `GET /painel` traz tudo numa chamada (varia com o perfil).
4. **Registrar emoção:** `GET /registros/catalogo` monta a escala; `POST /registros` devolve `orientacoes` e, se for o caso, `apoioImediato` para exibir na hora.
5. **Chat:** a cada 3 s, `GET /conversas/{id}/mensagens?depois=<ultimoId>`; ao abrir a conversa, `POST /conversas/{id}/lidas`.
6. **Agendar:** `GET /sessoes/profissionais` → `GET /sessoes/profissionais/{id}/horarios?data=` → `POST /sessoes`. Enviar o `inicio` com fuso, ex.: `2026-10-12T10:00:00-03:00`. Explique ao aluno, antes do `compartilharRegistros`, que o psicólogo passará a ver o diário.
7. **Erros:** sempre `{ erro: { codigo, mensagem, detalhes?, idRequisicao } }`. `detalhes[].campo` aponta o campo (ex.: `corpo.email`). Guarde o `idRequisicao` ao reportar problemas: é o `X-Request-Id`, que também localiza a linha na auditoria.
8. **Listagens** são paginadas (`pagina`, `limite`). **IDs são numéricos.**

## Limites de segurança

Login: 20 falhas/15 min por IP e 15 falhas/h por conta · cadastro público: 20/h por IP · escritas: 30/min por usuário · mensagens: 40/min · leitura do diário e das anotações pela equipe: 30/min · relatórios: 20/h · troca de senha/e-mail e exclusão de conta: 5 falhas/15 min · teto geral: 1000/15 min por IP. Atrás de proxy (Render etc.) defina `TRUST_PROXY=1`.

## Decisões que completam ou divergem do PDF

O PDF é a especificação; estas são as escolhas feitas onde ele é omisso, ambíguo ou conflita com a LGPD. Vale o grupo e a escola confirmarem:

- **Aluno e nível "fundamental":** o PDF lista Infantil, Ensino Médio e AEE; foi acrescentado *fundamental*.
- **Sessões e chat são só para alunos** (RF06/RF07 dizem "usuário"; a persona e o escopo são o estudante). Estender a professores exige renomear `aluno_id` nessas tabelas.
- **Pedagógico não lê o diário.** O PDF diz que a equipe vê "indicadores gerais, sem expor dados sensíveis individuais"; o pedagógico recebe alertas (quem + motivo genérico) e anotações, nunca o conteúdo dos registros.
- **"Depressão" (RF03)** virou o indicador **"tristeza"**, por não diagnosticar (escopo do PDF).
- **Responsáveis legais** são citados como parte interessada, mas não têm perfil nem tela nesta versão; o consentimento é registrado pela escola.
- **Esqueci a senha:** sem e-mail transacional no escopo, o administrador redefine (`POST /usuarios/{id}/redefinir-senha`) e entrega a senha provisória.
- **Troca de perfil** (aluno → professor etc.) não existe: crie outra conta. Evita herdar vínculos e dados.
- **Exclusão de profissional:** o que ele criou (conteúdos, anotações) permanece, sem autor; o acesso dele acaba. Alerta que ele tinha assumido volta a poder ser assumido.

## Como foi validado

Contra um **PostgreSQL real** (embutido, em fuso diferente de UTC de propósito), com uma bateria de **906 checagens ponta a ponta**, fora deste projeto: autenticação e JWT forjado (assinatura, versão, `alg: none`, papel falso no token), IDOR em todos os recursos, privacidade por perfil, cifra e adulteração, corridas (cadastro, agendamento, alertas, chat), limites de taxa, CHECKs e índices parciais direto no banco, regras de alerta e anonimato nas fronteiras, fuso, cascata de exclusão, auditoria, validação do ambiente e varredura dos logs atrás de dado sensível. A especificação OpenAPI foi validada e cobre exatamente as 69 rotas.

**Não foi feito:** teste contra o **Neon real** e integração com o **front**. O projeto não tem testes automatizados dentro dele.

## Não implementado (próximos passos)

- WebSocket/SSE para o chat (hoje é leitura incremental) e notificações push.
- E-mail transacional (recuperação de senha, avisos).
- Perfil e telas para pais/responsáveis; política de retenção e anonimização de dados antigos (LGPD).
- Tradução do direito de acesso do titular às anotações da equipe.
- Upload de mídia (os conteúdos de vídeo/áudio apontam para links `https`).
- Os 4 avisos de severidade alta do `npm audit` vêm do CLI do Prisma (`deepmerge-ts`, `mysql2`), usado só nas migrações; não fazem parte do servidor em execução.
