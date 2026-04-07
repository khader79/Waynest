-- Add FRIENDS visibility enum value and migrate existing user posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'social_posts_visibility_enum' AND e.enumlabel = 'FRIENDS'
  ) THEN
    ALTER TYPE social_posts_visibility_enum ADD VALUE 'FRIENDS';
  END IF;
END$$;

-- Convert legacy posts: those that used FOLLOWERS but are not provider posts
UPDATE social_posts
SET visibility = 'FRIENDS'
WHERE visibility = 'FOLLOWERS' AND provider_id IS NULL;
