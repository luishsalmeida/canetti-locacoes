# Backup operacional do PostgreSQL

O banco de produÃ§Ã£o deve ser copiado diariamente para um armazenamento externo e criptografado. O plano gratuito do Render nÃ£o Ã© um destino de backup: arquivos gravados no serviÃ§o podem ser perdidos em uma reinicializaÃ§Ã£o.

## Rotina recomendada

1. Configure um armazenamento externo (S3, Backblaze B2, Google Cloud Storage ou equivalente) com retenÃ§Ã£o de pelo menos 30 dias.
2. Crie uma tarefa agendada diÃ¡ria que execute `pg_dump --format=custom --no-owner --file=canetti-AAAAMMDD.dump "$DATABASE_URL"`.
3. Envie o arquivo resultante para o armazenamento externo e valide a restauraÃ§Ã£o mensalmente com `pg_restore --list`.
4. Restrinja as credenciais de backup apenas ao banco e ao bucket de backup.

## RecuperaÃ§Ã£o

Antes de qualquer recuperaÃ§Ã£o, faÃ§a um novo backup do estado atual. Para restaurar, use `pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" canetti-AAAAMMDD.dump` em uma janela de manutenÃ§Ã£o.

