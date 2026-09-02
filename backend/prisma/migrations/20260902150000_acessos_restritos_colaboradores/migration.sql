ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "colaborador_id" INTEGER;

ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_colaborador_id_fkey"
  FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
