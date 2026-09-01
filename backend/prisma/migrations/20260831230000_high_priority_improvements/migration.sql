ALTER TABLE "clinicas" ALTER COLUMN "limite_credito" TYPE DECIMAL(12,2) USING "limite_credito"::numeric;
ALTER TABLE "clinicas" ALTER COLUMN "saldo_credor" TYPE DECIMAL(12,2) USING "saldo_credor"::numeric;
ALTER TABLE "equipamentos" ALTER COLUMN "valor_diaria" TYPE DECIMAL(12,2) USING "valor_diaria"::numeric;
ALTER TABLE "equipamentos" ALTER COLUMN "valor_semanal" TYPE DECIMAL(12,2) USING "valor_semanal"::numeric;
ALTER TABLE "equipamentos" ALTER COLUMN "valor_mensal" TYPE DECIMAL(12,2) USING "valor_mensal"::numeric;
ALTER TABLE "locacoes" ALTER COLUMN "valor_total" TYPE DECIMAL(12,2) USING "valor_total"::numeric;
ALTER TABLE "locacoes" ALTER COLUMN "valor_desconto" TYPE DECIMAL(12,2) USING "valor_desconto"::numeric;
ALTER TABLE "locacoes" ALTER COLUMN "valor_final" TYPE DECIMAL(12,2) USING "valor_final"::numeric;
ALTER TABLE "itens_locacao" ALTER COLUMN "valor_diaria" TYPE DECIMAL(12,2) USING "valor_diaria"::numeric;
ALTER TABLE "itens_locacao" ALTER COLUMN "valor_total" TYPE DECIMAL(12,2) USING "valor_total"::numeric;

CREATE TABLE "pagamentos" (
  "id" SERIAL NOT NULL,
  "locacao_id" INTEGER NOT NULL,
  "forma" TEXT NOT NULL,
  "valor" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "vencimento" TIMESTAMP(3),
  "recebido_em" TIMESTAMP(3),
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pagamentos_locacao_id_idx" ON "pagamentos"("locacao_id");
CREATE INDEX "pagamentos_status_idx" ON "pagamentos"("status");
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_locacao_id_fkey" FOREIGN KEY ("locacao_id") REFERENCES "locacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "auditorias" (
  "id" SERIAL NOT NULL,
  "usuario_id" INTEGER,
  "entidade" TEXT NOT NULL,
  "entidade_id" INTEGER,
  "acao" TEXT NOT NULL,
  "dados_antes" JSONB,
  "dados_depois" JSONB,
  "ip" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auditorias_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "auditorias_entidade_entidade_id_idx" ON "auditorias"("entidade", "entidade_id");
CREATE INDEX "auditorias_usuario_id_idx" ON "auditorias"("usuario_id");
CREATE INDEX "auditorias_criado_em_idx" ON "auditorias"("criado_em");
ALTER TABLE "auditorias" ADD CONSTRAINT "auditorias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

