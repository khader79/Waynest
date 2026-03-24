-- Production migration (run when TypeORM synchronize is false).
-- Verify enum name: SELECT t.typname FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname LIKE '%providerrole%' GROUP BY t.typname;

-- New provider membership roles (ADMIN, EDITOR). Legacy MANAGER/STAFF remain valid.
-- Run once per environment (repeat runs may error if labels already exist).
ALTER TYPE provider_memberships_providerrole_enum ADD VALUE 'ADMIN';
ALTER TYPE provider_memberships_providerrole_enum ADD VALUE 'EDITOR';

-- Provider business-page fields (mirror TypeORM entity).
ALTER TABLE providers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS categories TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS owner_user_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_providers_owner_user_id ON providers (owner_user_id);

-- Social feed: provider-scoped ordering (mirror TypeORM @Index).
CREATE INDEX IF NOT EXISTS idx_social_posts_provider_created ON social_posts ("provider_id", "createdAt");
