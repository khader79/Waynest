# Delete-flow Test Plan

This document describes the steps to apply the deletion-fix migrations and verify delete behaviors for Users, Providers, Places and Events on a staging database.

IMPORTANT: Always run on a staging snapshot and take a DB backup before applying migrations.

## 1) Backup (Postgres)

Run on the staging DB host:

```bash
PGHOST=<staging-host> PGPORT=5432 PGDATABASE=<db> PGUSER=<user> pg_dump --format=custom --file=backup_before_delete_flow_fix.dump
```

## 2) Apply migrations (staging)

From repository root:

```bash
cd waynest-be
npm install
npm run build
npm run migration:run
```

To revert the last migration:

```bash
npm run migration:revert
```

## 3) Quick FK sanity query (Postgres)

This query lists foreign keys and their on-delete action (letter codes: a=NO ACTION, r=RESTRICT, c=CASCADE, n=SET NULL, d=SET DEFAULT):

```sql
SELECT
  con.conname AS constraint_name,
  conrelid::regclass AS table_name,
  array_to_string(conkey, ',') AS column_nums,
  pg_get_constraintdef(con.oid) AS definition,
  con.confdeltype AS confdeltype
FROM pg_constraint con
WHERE contype = 'f'
ORDER BY table_name;
```

Look for updated constraints added by migrations:

- `FK_places_provider_id` -> ON DELETE CASCADE
- `FK_place_pricing_place_id` -> ON DELETE CASCADE
- `FK_place_opening_hours_place_id` -> ON DELETE CASCADE
- `FK_bookings_place_id` -> ON DELETE CASCADE
- `FK_wishlists_place_id` -> ON DELETE CASCADE
- `FK_reviews_place_id` -> ON DELETE SET NULL
- `FK_reviews_event_id` -> ON DELETE SET NULL
- `FK_social_posts_provider_id` -> ON DELETE SET NULL
- `FK_social_posts_event_id` -> ON DELETE SET NULL

## 4) Test scenarios

Run these scenarios against staging (use API endpoints or directly call services in a test harness). Verify expected SQL outcomes.

A) User delete flow

- Create a test `User` with posts, comments, reviews, provider (owner) and messages.
- Call `DELETE /users/:id` (or invoke `UsersService.remove(id)`).
- Expected:
  - User row removed.
  - `social_posts` by author deleted.
  - Notifications where `recipient_id` deleted; `actor_id` set to NULL where applicable.
  - Provider owned by user deleted along with places, events, place_pricing, opening hours, wishlists.
  - Reviews/comments authored by user removed, or `place_id`/`event_id` set NULL per migration.
- Verify queries (examples):

```sql
-- no user
SELECT COUNT(*) FROM users WHERE id = '<user-id>';
-- no social posts
SELECT COUNT(*) FROM social_posts WHERE author_id = '<user-id>' OR provider_id IS NULL AND author_id IS NULL;
-- providers cleaned
SELECT COUNT(*) FROM providers WHERE owner_user_id = '<user-id>';
-- orphaned places
SELECT COUNT(*) FROM places WHERE providerId IS NULL AND created_at >= now() - interval '1 hour';
```

B) Provider delete flow

- Create provider with 1-2 places and events and social posts referencing them.
- Call `ProvidersService.remove(providerId)`.
- Expected:
  - `providers` row deleted.
  - `places` rows cascade-deleted by FK `providerId ON DELETE CASCADE`.
  - `place_pricing`, `place_opening_hours`, `bookings`, `wishlists` cascade or removed.
  - `events` deleted (places cascade) and `social_posts` referencing provider/event are soft-deleted by service logic or provider_id/event_id set to NULL depending on code path.
- Verify queries:

```sql
SELECT COUNT(*) FROM providers WHERE id = '<provider-id>';
SELECT COUNT(*) FROM places WHERE providerId = '<provider-id>';
SELECT COUNT(*) FROM events WHERE venueId IN (SELECT id FROM places WHERE providerId = '<provider-id>');
SELECT COUNT(*) FROM social_posts WHERE provider_id = '<provider-id>' OR event_id IN (...);
```

C) Place delete (soft-delete) flow

- Soft-delete a place via `PlaceService.remove(placeId)`.
- Expected: place `deleted_at` set (softDelete), bookings/wishlist rows removed by FK `ON DELETE CASCADE` only when a hard delete occurs. Since soft-delete keeps row, nothing cascades immediately.
- Verify queries:

```sql
SELECT deleted_at FROM places WHERE id = '<place-id>';
SELECT COUNT(*) FROM wishlists WHERE place_id = '<place-id>';
```

D) Event delete (soft-delete)

- Soft-delete event with posts referencing it.
- Expected: `event.deleted_at` set; `social_posts.event_id` should remain or be set to NULL by service logic when posts are purged.

## 5) Verify FK behaviors after migrations

Check `confdeltype` values (map letters to behavior) for key constraints. Example mapping: 'c' = CASCADE, 'n' = SET NULL, 'a' = NO ACTION.

## 6) Rollback & cleanup

If verification fails, revert migrations and restore backup:

```bash
cd waynest-be
npm run migration:revert
PGHOST=<staging-host> pg_restore --dbname=<db> --verbose backup_before_delete_flow_fix.dump
```

## 7) Notes for reviewers

- Migrations are defensive: they drop existing foreign keys and re-create them with desired `ON DELETE` policies.
- Service-level purges remain responsible for business rules (e.g., demoting provider owner, soft-deleting social posts). DB cascades handle owned child data.

---

If you want, I can also generate small automated SQL test scripts for each scenario to run in staging. Tell me if you prefer `psql` scripts or a Node.js test harness.
