-- CreateEnum
CREATE TYPE "papel_usuario" AS ENUM ('aluno', 'professor', 'pedagogico', 'psicologo', 'administrador');

-- CreateEnum
CREATE TYPE "nivel_ensino" AS ENUM ('infantil', 'fundamental', 'medio', 'aee');

-- CreateEnum
CREATE TYPE "origem_consentimento" AS ENUM ('titular', 'responsavel');

-- CreateEnum
CREATE TYPE "emocao" AS ENUM ('muito_feliz', 'feliz', 'calmo', 'neutro', 'irritado', 'com_medo', 'ansioso', 'estressado', 'triste', 'muito_triste');

-- CreateEnum
CREATE TYPE "intensidade" AS ENUM ('baixa', 'media', 'alta');

-- CreateEnum
CREATE TYPE "tipo_conteudo" AS ENUM ('artigo', 'video', 'audio', 'atividade', 'quiz', 'orientacao');

-- CreateEnum
CREATE TYPE "tema_conteudo" AS ENUM ('ansiedade', 'estresse', 'tristeza', 'autoestima', 'empatia', 'autocuidado', 'habilidades_socioemocionais');

-- CreateEnum
CREATE TYPE "tipo_acompanhamento" AS ENUM ('pedagogico', 'psicologico');

-- CreateEnum
CREATE TYPE "status_vinculo" AS ENUM ('ativo', 'encerrado');

-- CreateEnum
CREATE TYPE "origem_vinculo" AS ENUM ('agendamento', 'alerta', 'designacao');

-- CreateEnum
CREATE TYPE "tipo_alerta" AS ENUM ('sequencia_negativa', 'intensidade_alta_recorrente', 'queda_de_humor');

-- CreateEnum
CREATE TYPE "status_alerta" AS ENUM ('aberto', 'em_acompanhamento', 'resolvido');

-- CreateEnum
CREATE TYPE "status_sessao" AS ENUM ('solicitada', 'confirmada', 'recusada', 'cancelada', 'concluida');

-- CreateEnum
CREATE TYPE "alvo_feedback" AS ENUM ('sistema', 'sessao');

-- CreateEnum
CREATE TYPE "categoria_meta" AS ENUM ('reducao_estresse', 'autocuidado', 'sono', 'atividade_fisica', 'socializacao', 'estudos', 'outra');

-- CreateEnum
CREATE TYPE "status_meta" AS ENUM ('em_andamento', 'concluida', 'abandonada');

-- CreateEnum
CREATE TYPE "tipo_relatorio" AS ENUM ('emocional', 'pedagogico', 'estatistico');

-- CreateEnum
CREATE TYPE "tipo_notificacao" AS ENUM ('alerta_acompanhamento', 'sessao_solicitada', 'sessao_confirmada', 'sessao_recusada', 'sessao_cancelada', 'acompanhamento_iniciado');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "senha_hash" VARCHAR(100) NOT NULL,
    "papel" "papel_usuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deve_trocar_senha" BOOLEAN NOT NULL DEFAULT false,
    "versao_token" INTEGER NOT NULL DEFAULT 0,
    "ultimo_acesso_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "turma" VARCHAR(50) NOT NULL,
    "nivel_ensino" "nivel_ensino" NOT NULL,
    "consentimento_em" TIMESTAMP(3) NOT NULL,
    "consentimento_origem" "origem_consentimento" NOT NULL,
    "consentimento_registrado_por" INTEGER,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_emocionais" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "emocao" "emocao" NOT NULL,
    "intensidade" "intensidade" NOT NULL,
    "observacao" TEXT,
    "dia" DATE NOT NULL,
    "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "registros_emocionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudos_educativos" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "tipo_conteudo" NOT NULL,
    "tema" "tema_conteudo" NOT NULL,
    "niveis_ensino" "nivel_ensino"[],
    "url_midia" VARCHAR(500),
    "estrutura" JSONB,
    "publicado" BOOLEAN NOT NULL DEFAULT true,
    "data_publicacao" DATE NOT NULL,
    "criado_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "conteudos_educativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acompanhamentos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "autor_id" INTEGER,
    "tipo" "tipo_acompanhamento" NOT NULL,
    "observacao" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "acompanhamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinculos" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "profissional_id" INTEGER NOT NULL,
    "origem" "origem_vinculo" NOT NULL,
    "status" "status_vinculo" NOT NULL DEFAULT 'ativo',
    "criado_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "encerrado_em" TIMESTAMP(3),

    CONSTRAINT "vinculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "tipo" "tipo_alerta" NOT NULL,
    "status" "status_alerta" NOT NULL DEFAULT 'aberto',
    "responsavel_id" INTEGER,
    "resolvido_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "assumido_em" TIMESTAMP(3),
    "resolvido_em" TIMESTAMP(3),
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "profissional_id" INTEGER NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "status" "status_sessao" NOT NULL DEFAULT 'solicitada',
    "motivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversas" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "profissional_id" INTEGER NOT NULL,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "ultima_mensagem_em" TIMESTAMP(3),

    CONSTRAINT "conversas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens" (
    "id" SERIAL NOT NULL,
    "conversa_id" INTEGER NOT NULL,
    "autor_id" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "enviada_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "lida_em" TIMESTAMP(3),

    CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "alvo" "alvo_feedback" NOT NULL,
    "sessao_id" INTEGER,
    "nota" SMALLINT NOT NULL,
    "comentario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" "categoria_meta" NOT NULL,
    "prazo" DATE,
    "status" "status_meta" NOT NULL DEFAULT 'em_andamento',
    "concluida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" "tipo_notificacao" NOT NULL,
    "mensagem" VARCHAR(255) NOT NULL,
    "referencia_id" INTEGER,
    "enviada_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    "lida" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios" (
    "id" SERIAL NOT NULL,
    "tipo" "tipo_relatorio" NOT NULL,
    "usuario_id" INTEGER,
    "gerado_por" INTEGER,
    "periodo_inicio" DATE NOT NULL,
    "periodo_fim" DATE NOT NULL,
    "descricao" TEXT,
    "dados" TEXT NOT NULL,
    "gerado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "relatorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "alvo_usuario_id" INTEGER,
    "acao" VARCHAR(60) NOT NULL,
    "recurso" VARCHAR(40),
    "recurso_id" INTEGER,
    "id_requisicao" VARCHAR(36),
    "detalhes" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_papel_ativo_idx" ON "usuarios"("papel", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_usuario_id_key" ON "alunos"("usuario_id");

-- CreateIndex
CREATE INDEX "alunos_turma_idx" ON "alunos"("turma");

-- CreateIndex
CREATE INDEX "alunos_nivel_ensino_idx" ON "alunos"("nivel_ensino");

-- CreateIndex
CREATE INDEX "registros_usuario_dia_idx" ON "registros_emocionais"("usuario_id", "dia");

-- CreateIndex
CREATE INDEX "registros_dia_emocao_idx" ON "registros_emocionais"("dia", "emocao");

-- CreateIndex
CREATE INDEX "conteudos_publicado_tipo_tema_idx" ON "conteudos_educativos"("publicado", "tipo", "tema");

-- CreateIndex
CREATE INDEX "acompanhamentos_usuario_data_idx" ON "acompanhamentos"("usuario_id", "data");

-- CreateIndex
CREATE INDEX "vinculos_profissional_status_idx" ON "vinculos"("profissional_id", "status");

-- CreateIndex
CREATE INDEX "vinculos_aluno_status_idx" ON "vinculos"("aluno_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vinculos_aluno_profissional_key" ON "vinculos"("aluno_id", "profissional_id");

-- CreateIndex
CREATE INDEX "alertas_status_criado_em_idx" ON "alertas"("status", "criado_em");

-- CreateIndex
CREATE INDEX "alertas_aluno_status_idx" ON "alertas"("aluno_id", "status");

-- CreateIndex
CREATE INDEX "sessoes_aluno_inicio_idx" ON "sessoes"("aluno_id", "inicio");

-- CreateIndex
CREATE INDEX "sessoes_profissional_inicio_idx" ON "sessoes"("profissional_id", "inicio");

-- CreateIndex
CREATE INDEX "conversas_profissional_idx" ON "conversas"("profissional_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversas_aluno_profissional_key" ON "conversas"("aluno_id", "profissional_id");

-- CreateIndex
CREATE INDEX "mensagens_conversa_id_idx" ON "mensagens"("conversa_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_sessao_id_key" ON "feedbacks"("sessao_id");

-- CreateIndex
CREATE INDEX "feedbacks_alvo_criado_em_idx" ON "feedbacks"("alvo", "criado_em");

-- CreateIndex
CREATE INDEX "feedbacks_usuario_idx" ON "feedbacks"("usuario_id");

-- CreateIndex
CREATE INDEX "metas_usuario_status_idx" ON "metas"("usuario_id", "status");

-- CreateIndex
CREATE INDEX "notificacoes_usuario_lida_enviada_idx" ON "notificacoes"("usuario_id", "lida", "enviada_em");

-- CreateIndex
CREATE INDEX "relatorios_tipo_gerado_em_idx" ON "relatorios"("tipo", "gerado_em");

-- CreateIndex
CREATE INDEX "relatorios_usuario_gerado_em_idx" ON "relatorios"("usuario_id", "gerado_em");

-- CreateIndex
CREATE INDEX "logs_auditoria_criado_em_idx" ON "logs_auditoria"("criado_em");

-- CreateIndex
CREATE INDEX "logs_auditoria_usuario_criado_em_idx" ON "logs_auditoria"("usuario_id", "criado_em");

-- CreateIndex
CREATE INDEX "logs_auditoria_alvo_criado_em_idx" ON "logs_auditoria"("alvo_usuario_id", "criado_em");

-- CreateIndex
CREATE INDEX "logs_auditoria_acao_criado_em_idx" ON "logs_auditoria"("acao", "criado_em");

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_consentimento_registrado_por_fkey" FOREIGN KEY ("consentimento_registrado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_emocionais" ADD CONSTRAINT "registros_emocionais_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos_educativos" ADD CONSTRAINT "conteudos_educativos_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acompanhamentos" ADD CONSTRAINT "acompanhamentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acompanhamentos" ADD CONSTRAINT "acompanhamentos_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos" ADD CONSTRAINT "vinculos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos" ADD CONSTRAINT "vinculos_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos" ADD CONSTRAINT "vinculos_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_resolvido_por_fkey" FOREIGN KEY ("resolvido_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "conversas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "sessoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_gerado_por_fkey" FOREIGN KEY ("gerado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ================================================================================================
-- A PARTIR DAQUI: regras escritas à mão (o Prisma não as expressa no modelo)
-- ================================================================================================

-- Lista de níveis de ensino de um conteúdo: nunca nula (vazia = serve para todos os níveis).
ALTER TABLE "conteudos_educativos" ALTER COLUMN "niveis_ensino" SET DEFAULT ARRAY[]::"nivel_ensino"[];
UPDATE "conteudos_educativos" SET "niveis_ensino" = ARRAY[]::"nivel_ensino"[] WHERE "niveis_ensino" IS NULL;
ALTER TABLE "conteudos_educativos" ALTER COLUMN "niveis_ensino" SET NOT NULL;

-- Regras de formato e coerência repetidas no banco (defesa em profundidade: valem até para quem escrever fora da API).
ALTER TABLE "usuarios"
    ADD CONSTRAINT "usuarios_email_minusculo_chk" CHECK ("email" = lower("email")),
    ADD CONSTRAINT "usuarios_nome_preenchido_chk" CHECK (btrim("nome") <> '');

ALTER TABLE "alunos"
    ADD CONSTRAINT "alunos_turma_preenchida_chk" CHECK (btrim("turma") <> '');

ALTER TABLE "conteudos_educativos"
    ADD CONSTRAINT "conteudos_titulo_preenchido_chk" CHECK (btrim("titulo") <> ''),
    -- Quiz tem estrutura; os demais tipos não têm.
    ADD CONSTRAINT "conteudos_quiz_estrutura_chk" CHECK (("tipo" = 'quiz') = ("estrutura" IS NOT NULL)),
    -- Links de mídia só em HTTPS (nunca javascript:, data: ou http sem criptografia).
    ADD CONSTRAINT "conteudos_url_https_chk" CHECK ("url_midia" IS NULL OR "url_midia" ~ '^https://[^[:space:]]+$');

-- Um profissional não é aluno de si mesmo.
ALTER TABLE "vinculos"
    ADD CONSTRAINT "vinculos_pessoas_distintas_chk" CHECK ("aluno_id" <> "profissional_id"),
    ADD CONSTRAINT "vinculos_encerramento_coerente_chk" CHECK (("status" = 'encerrado') = ("encerrado_em" IS NOT NULL));

ALTER TABLE "conversas"
    ADD CONSTRAINT "conversas_pessoas_distintas_chk" CHECK ("aluno_id" <> "profissional_id");

ALTER TABLE "alertas"
    ADD CONSTRAINT "alertas_resolucao_coerente_chk" CHECK (("status" = 'resolvido') = ("resolvido_em" IS NOT NULL));

-- Sessões: blocos de 30 minutos exatos (minuto 00 ou 30, sem segundos nem milésimos). A API confere o dia útil,
-- o horário de funcionamento e a antecedência; o banco garante a grade.
ALTER TABLE "sessoes"
    ADD CONSTRAINT "sessoes_pessoas_distintas_chk" CHECK ("aluno_id" <> "profissional_id"),
    ADD CONSTRAINT "sessoes_grade_30min_chk" CHECK (
        date_part('second', "inicio") = 0 AND date_part('minute', "inicio") IN (0, 30)
    );

ALTER TABLE "feedbacks"
    ADD CONSTRAINT "feedbacks_nota_chk" CHECK ("nota" BETWEEN 1 AND 5),
    -- Avaliação de sessão aponta a sessão; avaliação do sistema não.
    ADD CONSTRAINT "feedbacks_alvo_sessao_chk" CHECK (("alvo" = 'sessao') = ("sessao_id" IS NOT NULL));

ALTER TABLE "metas"
    ADD CONSTRAINT "metas_conclusao_coerente_chk" CHECK (("status" = 'concluida') = ("concluida_em" IS NOT NULL));

ALTER TABLE "notificacoes"
    ADD CONSTRAINT "notificacoes_mensagem_preenchida_chk" CHECK (btrim("mensagem") <> '');

ALTER TABLE "relatorios"
    ADD CONSTRAINT "relatorios_periodo_chk" CHECK ("periodo_fim" >= "periodo_inicio"),
    -- Só o relatório emocional pertence a uma pessoa.
    ADD CONSTRAINT "relatorios_dono_chk" CHECK (("tipo" = 'emocional') = ("usuario_id" IS NOT NULL));

-- Índices únicos PARCIAIS: a garantia de que dois pedidos simultâneos não ocupam o mesmo horário e de que
-- não existem dois alertas vivos do mesmo tipo para o mesmo aluno (o segundo INSERT é recusado pelo banco).
CREATE UNIQUE INDEX "sessoes_profissional_horario_vivo_key"
    ON "sessoes" ("profissional_id", "inicio") WHERE "status" IN ('solicitada', 'confirmada');

CREATE UNIQUE INDEX "sessoes_aluno_horario_vivo_key"
    ON "sessoes" ("aluno_id", "inicio") WHERE "status" IN ('solicitada', 'confirmada');

CREATE UNIQUE INDEX "alertas_vivo_por_aluno_tipo_key"
    ON "alertas" ("aluno_id", "tipo") WHERE "status" <> 'resolvido';


-- ================================================================================================
-- Conteúdos iniciais (RF04 – orientações iniciais; RF05 – atividade e quiz de exemplo).
-- São textos comuns: a administração pode editá-los, despublicá-los ou excluí-los pela API.
-- ================================================================================================

INSERT INTO "conteudos_educativos" ("titulo", "descricao", "tipo", "tema", "niveis_ensino", "data_publicacao") VALUES
(
  'Quando a ansiedade aparece: o que fazer agora',
  $t$Sentir ansiedade de vez em quando é normal: o corpo se prepara para algo que parece difícil. Quando ela fica forte, estas ideias ajudam:

1. Respire devagar. Puxe o ar pelo nariz contando até 4, segure contando até 4 e solte pela boca contando até 6. Repita 5 vezes.
2. Traga a atenção para o agora (5-4-3-2-1): perceba 5 coisas que você vê, 4 que consegue tocar, 3 que ouve, 2 que cheira e 1 que saboreia.
3. Divida a tarefa que preocupa em passos pequenos e comece pelo menor.
4. Escreva o que está pensando. No papel, o problema muitas vezes parece menor.
5. Converse com alguém de confiança: um amigo, alguém da família, um professor ou o orientador da escola.

Se a ansiedade atrapalha o seu sono, os seus estudos ou os seus dias com frequência, procure a equipe de apoio da escola. Pedir ajuda é uma forma de cuidar de si.

Esta é uma orientação inicial e não substitui o atendimento de um profissional de saúde.$t$,
  'orientacao', 'ansiedade', ARRAY['fundamental', 'medio']::"nivel_ensino"[], CURRENT_DATE
),
(
  'Respirando como um balão',
  $t$Quando o coração bate rápido ou a barriga fica estranha, o corpo pode estar com medo ou preocupação. Isso acontece com todo mundo.

Vamos fazer o balão?
1. Coloque as mãos na barriga.
2. Puxe o ar pelo nariz, bem devagar, enchendo a barriga como um balão. Conte até 3.
3. Solte o ar pela boca, devagar, esvaziando o balão. Conte até 3.
4. Faça de novo 5 vezes.

Depois, conte para um adulto de confiança (professor, alguém da família ou o orientador) o que você sentiu. Você não precisa ficar sozinho com esse sentimento.$t$,
  'orientacao', 'ansiedade', ARRAY['infantil', 'aee']::"nivel_ensino"[], CURRENT_DATE
),
(
  'Estresse: como aliviar a pressão do dia a dia',
  $t$Estresse é a reação do corpo a muitas cobranças ao mesmo tempo, como provas, trabalhos e uma rotina corrida. Ele pode causar cansaço, dor de cabeça, irritação e dificuldade de concentração.

O que ajuda:
1. Faça uma lista do que precisa ser feito e organize por prioridade. Comece pelo mais urgente.
2. Faça pausas curtas: a cada 45 a 50 minutos de estudo, levante, alongue o corpo e beba água.
3. Durma bem. Dormir pouco aumenta o estresse e atrapalha a memória.
4. Mexa o corpo: uma caminhada ou uma atividade de que você goste alivia a tensão.
5. Reserve um tempo do dia para algo de que gosta, sem culpa.

Se o cansaço e a irritação estiverem fortes por muitos dias, converse com a equipe de apoio da escola.

Esta é uma orientação inicial e não substitui o atendimento de um profissional de saúde.$t$,
  'orientacao', 'estresse', ARRAY['fundamental', 'medio']::"nivel_ensino"[], CURRENT_DATE
),
(
  'Quando eu estou muito agitado',
  $t$Às vezes acontece muita coisa e a gente fica agitado, irritado ou cansado. Isso se chama estresse. O que eu posso fazer:

1. Parar um pouquinho e respirar fundo 3 vezes.
2. Beber água.
3. Esticar os braços para cima, como se quisesse tocar o teto.
4. Pedir uma pausa para o professor ou para um adulto.
5. Fazer algo de que eu gosto: desenhar, brincar ou ouvir uma música tranquila.

Se eu não sei o que fazer, posso dizer: "Preciso de ajuda". Os adultos da escola estão aqui para ajudar.$t$,
  'orientacao', 'estresse', ARRAY['infantil', 'aee']::"nivel_ensino"[], CURRENT_DATE
),
(
  'Quando a tristeza chega: como cuidar de você',
  $t$Todo mundo fica triste às vezes. A tristeza mostra que algo é importante para nós e, em geral, passa com o tempo.

O que pode ajudar:
1. Permita-se sentir. Você não precisa fingir que está tudo bem.
2. Fale com alguém em quem confia, mesmo que seja só um pouco. Dividir alivia.
3. Cuide do básico: comer, beber água, dormir e pegar um pouco de sol.
4. Faça uma coisa pequena de que você gostava, mesmo sem muita vontade: ouvir música, caminhar, desenhar.
5. Evite ficar isolado por muito tempo.

Se a tristeza durar semanas, tirar a vontade de fazer o que você gosta ou vier com pensamentos de se machucar, peça ajuda agora: fale com um adulto de confiança, com a equipe de apoio da escola ou ligue para o CVV, no 188 (gratuito, 24 horas).

Esta é uma orientação inicial e não substitui o atendimento de um profissional de saúde.$t$,
  'orientacao', 'tristeza', ARRAY['fundamental', 'medio']::"nivel_ensino"[], CURRENT_DATE
),
(
  'Quando eu estou triste',
  $t$Ficar triste é normal, e tudo bem chorar. Quando eu estou triste, posso:

1. Pedir um abraço para alguém de confiança.
2. Desenhar como eu estou me sentindo.
3. Contar para um adulto: "Estou triste porque...". Se eu não souber o motivo, posso dizer só: "Estou triste".
4. Abraçar um brinquedo, ouvir uma música calma ou olhar um livro.

A tristeza fica menor quando a gente divide com alguém. Os adultos da escola podem me ajudar.$t$,
  'orientacao', 'tristeza', ARRAY['infantil', 'aee']::"nivel_ensino"[], CURRENT_DATE
),
(
  'Exercício de respiração em 4 passos',
  $t$Um exercício rápido para acalmar o corpo, que pode ser feito em qualquer lugar:

1. Sente-se com as costas apoiadas e os pés no chão.
2. Inspire pelo nariz contando 1, 2, 3, 4.
3. Segure o ar contando 1, 2, 3, 4.
4. Solte devagar pela boca contando 1, 2, 3, 4, 5, 6.

Repita de 5 a 10 vezes, prestando atenção só na respiração. Se perder a conta, comece de novo, sem pressa.$t$,
  'atividade', 'autocuidado', ARRAY[]::"nivel_ensino"[], CURRENT_DATE
);

INSERT INTO "conteudos_educativos" ("titulo", "descricao", "tipo", "tema", "niveis_ensino", "estrutura", "data_publicacao") VALUES
(
  'Quiz: reconhecendo e cuidando das emoções',
  'Responda às perguntas e descubra o que você já sabe sobre cuidar das emoções.',
  'quiz', 'habilidades_socioemocionais', ARRAY['fundamental', 'medio']::"nivel_ensino"[],
  $j${"perguntas": [
    {
      "enunciado": "Sentir ansiedade, tristeza ou raiva de vez em quando é:",
      "opcoes": ["Sinal de fraqueza", "Algo normal, que todas as pessoas sentem", "Algo que precisa ser escondido de todo mundo"],
      "correta": 1,
      "explicacao": "As emoções fazem parte da vida de todo mundo. O importante é aprender a lidar com elas e pedir ajuda quando precisar."
    },
    {
      "enunciado": "Qual destas atitudes ajuda quando você está estressado?",
      "opcoes": ["Dormir menos para estudar mais", "Fazer pausas curtas e respirar fundo", "Ficar sozinho sem falar com ninguém"],
      "correta": 1,
      "explicacao": "Pausas curtas, respiração e uma boa noite de sono ajudam o corpo e a mente a recuperar o equilíbrio."
    },
    {
      "enunciado": "Um colega parece triste e está isolado. O que você pode fazer?",
      "opcoes": ["Fingir que não viu", "Fazer piada para ele reagir", "Chegar com respeito, perguntar como ele está e avisar um adulto se ficar preocupado"],
      "correta": 2,
      "explicacao": "Empatia é perceber o outro e se aproximar com respeito. Se a situação preocupar, avisar um adulto de confiança também é cuidar."
    }
  ]}$j$::jsonb,
  CURRENT_DATE
);
