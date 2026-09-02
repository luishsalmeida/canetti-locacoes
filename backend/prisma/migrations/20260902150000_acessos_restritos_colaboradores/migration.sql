ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "colaborador_id" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_colaborador_id_key" ON "usuarios"("colaborador_id");

ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_colaborador_id_fkey"
  FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
