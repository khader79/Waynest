-- Performance indexes for high-traffic search and social filtering paths.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fast ILIKE search for global search users/providers/places/events.
CREATE INDEX IF NOT EXISTS idx_users_username_trgm
  ON users USING gin (lower("username") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_first_name_trgm
  ON users USING gin (lower("firstName") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_last_name_trgm
  ON users USING gin (lower("lastName") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_providers_display_name_trgm
  ON providers USING gin (lower("displayName") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_providers_slug_trgm
  ON providers USING gin (lower("slug") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_places_name_trgm
  ON places USING gin (lower("name") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_places_slug_trgm
  ON places USING gin (lower("slug") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_events_title_trgm
  ON events USING gin (lower("title") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cities_name_trgm
  ON cities USING gin (lower("name") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_countries_name_trgm
  ON countries USING gin (lower("name") gin_trgm_ops);

-- Composite indexes for common fixed filters + ordering.
CREATE INDEX IF NOT EXISTS idx_providers_active_verified_city
  ON providers ("isActive", "verificationStatus", "cityId");

CREATE INDEX IF NOT EXISTS idx_places_active_city_created
  ON places ("isActive", "cityId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_events_active_start_date
  ON events ("isActive", "startDate" DESC);

-- Block relation lookup uses blocker OR blocked by viewer id.
CREATE INDEX IF NOT EXISTS idx_block_relations_blocker_id
  ON block_relations (blocker_id);

CREATE INDEX IF NOT EXISTS idx_block_relations_blocked_id
  ON block_relations (blocked_id);
