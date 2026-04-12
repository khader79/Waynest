-- Cursor-friendly ordering and lookup indexes for high-traffic list endpoints.
-- Safe to run multiple times.

CREATE INDEX IF NOT EXISTS idx_places_active_created_id
  ON places ("isActive", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_places_city_created_id
  ON places ("cityId", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_places_provider_created_id
  ON places ("providerId", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_events_created_id
  ON events ("createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_events_venue_created_id
  ON events ("venueId", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_provider_memberships_user_provider
  ON provider_memberships ("userId", "providerId");

CREATE INDEX IF NOT EXISTS idx_social_posts_created_id
  ON social_posts ("createdAt" DESC, id DESC);
