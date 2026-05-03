-- Add share visibility for trip planner sharing.
ALTER TABLE trip_plans
  ADD COLUMN IF NOT EXISTS share_visibility varchar(16) NOT NULL DEFAULT 'PUBLIC';

UPDATE trip_plans
SET share_visibility = CASE WHEN is_public = true THEN 'PUBLIC' ELSE 'FRIENDS' END
WHERE share_visibility IS NULL;