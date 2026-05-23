Delete-flow integration harness

This harness runs the psql test scripts and can optionally perform simple service-level checks.

Requirements

- Node.js v18+ (for built-in fetch)
- `psql` in PATH
- Environment variables (for SQL tests): `PGHOST`, `PGPORT` (optional), `PGDATABASE`, `PGUSER`, `PGPASSWORD` (psql will prompt if needed)
- Optional service checks: `BASE_URL` and `ADMIN_TOKEN` (Bearer token)
- Optional delete checks: `ADMIN_TEST_USER_ID` and `ADMIN_TEST_PROVIDER_ID` (UUIDs to exercise DELETE endpoints)
- Optional create & test flow: set `AUTO_CREATE=true` to have the harness create a temporary provider, dependent data, call the API to delete it, verify DB cascades, and clean up.

Run

# Run SQL scripts (requires PGDATABASE)

node index.js

# Run with service checks

BASE_URL=https://staging.example.com ADMIN_TOKEN=token node index.js

# Run with service delete checks (provide test IDs)

BASE_URL=https://staging.example.com ADMIN_TOKEN=token ADMIN_TEST_USER_ID=<uuid> ADMIN_TEST_PROVIDER_ID=<uuid> node index.js

Notes

- The harness invokes the same psql scripts in the parent folder; it does not attempt to start or stop your Nest backend.
- Customize `index.js` to add endpoint calls specific to your API routes for more thorough service-level testing.
- WARNING: `AUTO_CREATE=true` will insert rows into the target database and then attempt to delete them. Run only on isolated staging DBs with backups.
