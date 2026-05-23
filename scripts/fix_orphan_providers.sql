-- Fix orphan provider users: set role back to USER when no provider exists
-- Run this once against your database (adjust schema/table names if needed)

BEGIN;

-- Example for Postgres (adjust "user" table name if different):
UPDATE "user"
SET role = 'USER'
WHERE role = 'PROVIDER'
  AND id NOT IN (SELECT "ownerUserId" FROM provider WHERE "ownerUserId" IS NOT NULL);

COMMIT;

-- NOTE:
-- - Backup DB before running.
-- - Some apps use table name "users" or different column names; verify with your schema.
-- - Alternatively run a SELECT first to preview affected rows:
--   SELECT id, username FROM "user" WHERE role = 'PROVIDER' AND id NOT IN (SELECT "ownerUserId" FROM provider);
