-- Review SET NULL test for place/event deletion

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TEMP TABLE tmp_ids(k text, v uuid) ON COMMIT DROP;

INSERT INTO tmp_ids VALUES ('place', gen_random_uuid());
INSERT INTO tmp_ids VALUES ('event', gen_random_uuid());
INSERT INTO tmp_ids VALUES ('review_place', gen_random_uuid());
INSERT INTO tmp_ids VALUES ('review_event', gen_random_uuid());

-- Create a place and event
INSERT INTO places (id, name, slug, description, "cityId", "createdAt", "updatedAt")
VALUES ((SELECT v FROM tmp_ids WHERE k='place'), 'delete-flow-test-place-3', ('df-place-' || substring(md5(now()::text) from 1 for 6)), 'test', (SELECT id FROM cities LIMIT 1), now(), now());

INSERT INTO events (id, title, slug, "createdAt", "updatedAt", "venueId")
VALUES ((SELECT v FROM tmp_ids WHERE k='event'), 'delete-flow-test-event-2', ('df-event-' || substring(md5(now()::text) from 1 for 6)), now(), now(), (SELECT v FROM tmp_ids WHERE k='place'));

-- Create reviews pointing to place and event (user_id required; use NULL for user to avoid constraints if allowed)
-- If user_id is non-nullable, tests must be run in an environment with a test user; otherwise these inserts may fail.

INSERT INTO reviews (id, "place_id", "event_id", "user_id", rating, comment, "createdAt", "updatedAt")
VALUES ((SELECT v FROM tmp_ids WHERE k='review_place'), (SELECT v FROM tmp_ids WHERE k='place'), NULL, NULL, 5, 'place review', now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO reviews (id, "place_id", "event_id", "user_id", rating, comment, "createdAt", "updatedAt")
VALUES ((SELECT v FROM tmp_ids WHERE k='review_event'), NULL, (SELECT v FROM tmp_ids WHERE k='event'), NULL, 4, 'event review', now(), now())
ON CONFLICT DO NOTHING;

-- Pre-delete checks
SELECT 'pre-delete review place_id' AS tag, COUNT(*) FROM reviews WHERE id = (SELECT v FROM tmp_ids WHERE k='review_place') AND place_id IS NOT NULL;
SELECT 'pre-delete review event_id' AS tag, COUNT(*) FROM reviews WHERE id = (SELECT v FROM tmp_ids WHERE k='review_event') AND event_id IS NOT NULL;

-- Delete place and event
DELETE FROM places WHERE id = (SELECT v FROM tmp_ids WHERE k='place');
DELETE FROM events WHERE id = (SELECT v FROM tmp_ids WHERE k='event');

-- Post-delete checks: reviews should have place_id/event_id set to NULL (SET NULL behavior)
SELECT 'post-delete review place_id IS NULL?' AS tag, COUNT(*) FROM reviews WHERE id = (SELECT v FROM tmp_ids WHERE k='review_place') AND place_id IS NULL;
SELECT 'post-delete review event_id IS NULL?' AS tag, COUNT(*) FROM reviews WHERE id = (SELECT v FROM tmp_ids WHERE k='review_event') AND event_id IS NULL;

-- Cleanup
DELETE FROM reviews WHERE id IN ((SELECT v FROM tmp_ids WHERE k='review_place'), (SELECT v FROM tmp_ids WHERE k='review_event'));
DELETE FROM events WHERE id = (SELECT v FROM tmp_ids WHERE k='event');
DELETE FROM places WHERE id = (SELECT v FROM tmp_ids WHERE k='place');

-- End
