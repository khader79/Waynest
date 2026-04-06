**Migrations: safe rollout and commands**

- **Purpose:** apply DB performance indexes and other schema changes in a controlled way.

- **Back up first:** always snapshot or take a dump of the target DB before applying migrations.

- **Preferred method (TypeORM CLI - uses project's migration files):**
  - Example (PowerShell):

    ```powershell
    $env:DB_HOST = "db.example.com"
    $env:DB_PORT = "5432"
    $env:DB_USERNAME = "user"
    $env:DB_PASSWORD = "password"
    $env:DB_NAME = "waynest"
    npm run migration:run
    ```

  - Example (Linux / macOS):

    ```bash
    DB_HOST=db.example.com DB_PORT=5432 DB_USERNAME=user DB_PASSWORD=password DB_NAME=waynest npm run migration:run
    ```

- **Alternative: apply raw SQL directly with psql**
  - This is useful for running a single SQL file (e.g. index-only migrations). Example:

    ```bash
    psql "postgresql://user:password@db.example.com:5432/waynest" -f db/migrations/20260406150000_search_performance_indexes.sql
    ```

- **Notes & recommendations**
  - Run on staging first and verify application functionality and performance.
  - For very large tables prefer creating indexes `CONCURRENTLY` to avoid lock contention; the current migration file uses regular `CREATE INDEX` — plan a maintenance window if tables are large.
  - Monitor long-running index creation via `pg_stat_progress_create_index` and active queries via `pg_stat_activity`.
  - To roll back the last TypeORM migration run: `npm run migration:revert`.

- **Post-deploy checks**
  - Verify indexes exist with `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'places';`
  - Run a few representative search queries and check `EXPLAIN ANALYZE` to confirm index usage.
