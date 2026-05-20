# Backfill & Calendar Entries Performance

## Purpose

This document explains how to verify and mitigate the slow queries observed during the calendar backfill at startup.

## Quick checklist

- Ensure the `idx_calendar_entries_trip_plan_id` index exists (migration added: `20260520120000-AddCalendarEntriesTripPlanIndex.ts`).
- Apply migration in staging/production using `npm run migration:run`.
- Run EXPLAIN ANALYZE on the exact slow SQL statements from `server.log` to confirm planner behavior.

## Commands

From `waynest-be`:

```bash
# install deps
npm ci

# run migrations (creates the trip_plan index)
npm run migration:run

# run the app (dev)
npm run start:dev
```

Using `psql` to run EXPLAIN (replace `<PLAN_ID>`)

```bash
# EXPLAIN the per-plan count that used to be executed
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS) SELECT COUNT(*) FROM calendar_entries WHERE trip_plan_id = '<PLAN_ID>';"

# EXPLAIN a representative TripPlan find query
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS) SELECT p.* FROM trip_plans p LEFT JOIN cities c ON c.id = p.city_id WHERE p.user_id IS NOT NULL LIMIT 50;"

# EXPLAIN a sample INSERT (if you have a representative INSERT SQL)
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS) INSERT INTO calendar_entries (user_id, calendar_date, title) VALUES ('<USER_ID>', '2026-05-01', 'Test') RETURNING id;"
```

## Node helper script

There's a small helper script `scripts/run_explain.js` that runs EXPLAIN for you against `DATABASE_URL`.

## What to look for

- If `EXPLAIN` shows a sequential scan for `trip_plan_id` lookups, the index isn't being used; check statistics or create a composite index.
- Confirm that the `CREATE INDEX CONCURRENTLY` succeeded without blocking writes (check migration logs).
- If `INSERT` is slow, verify index maintenance cost and lock contention.

## Rollback

To remove the added index (if necessary):

```bash
npm run migration:revert
```

## Next actions

- Run the EXPLAINs above and paste the output here; I'll interpret them and suggest specific index definitions or query rewrites.
- Or, run the migration and test the backfill in a staging environment to confirm reduced startup latency.
