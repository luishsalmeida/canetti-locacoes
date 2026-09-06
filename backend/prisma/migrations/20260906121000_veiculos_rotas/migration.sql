CREATE TABLE "veiculos" (
    "id" SERIAL NOT NULL,
    "colaborador_id" INTEGER NOT NULL,
    "apelido" TEXT,
    "placa" TEXT,
    "consumo_km_litro" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "preco_combustivel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valor_pneus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vida_util_pneus_km" DOUBLE PRECISION NOT NULL DEFAULT 40000,
    "manutencao_anual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custos_fixos_anuais" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "km_anual" DOUBLE PRECISION NOT NULL DEFAULT 12000,
    "valor_atual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valor_residual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vida_util_km" DOUBLE PRECISION NOT NULL DEFAULT 150000,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "veiculos_colaborador_id_key" ON "veiculos"("colaborador_id");

ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_colaborador_id_fkey"
  FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
