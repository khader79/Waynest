Delete-flow DB test scripts

This folder contains psql scripts and runners to validate foreign-key delete behaviors for critical entities.

Runners

- run_delete_flow_tests.ps1 — PowerShell runner (Windows)
- run_delete_flow_tests.sh — Bash runner (Linux/macOS)

Requirements

- `psql` client in PATH
- `pgcrypto` extension available in the target DB (scripts create it if missing)
- Environment variables: `PGHOST`, `PGPORT` (optional), `PGDATABASE`, `PGUSER`, `PGPASSWORD`

Usage (Bash)

PGHOST=host PGUSER=user PGPASSWORD=pw PGDATABASE=db ./run_delete_flow_tests.sh

Usage (PowerShell)

$env:PGHOST='host'; $env:PGUSER='user'; $env:PGPASSWORD='pw'; $env:PGDATABASE='db'; .\run_delete_flow_tests.ps1

Notes

- Scripts create temporary rows and attempt deletes; they also try to clean up after themselves.
- Some inserts assume nullable user references; run in an isolated staging DB to avoid collisions.
- These scripts test DB-level FK behavior only. For application-level purge verification, run integration tests or the Node.js harness (not included).
