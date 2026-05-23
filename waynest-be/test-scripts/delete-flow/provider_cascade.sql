-- Provider cascade test
-- Run in a staging DB session. Requires "pgcrypto" extension for gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE tmp_ids(k text, v uuid) ON COMMIT DROP;

INSERT INTO tmp_ids VALUES ('provider', gen_random_uuid());
INSERT INTO tmp_ids VALUES ('place', gen_random_uuid());
INSERT INTO tmp_ids VALUES ('event', gen_random_uuid());
INSERT INTO tmp_ids VALUES ('post', gen_random_uuid());

-- Create a provider (owner_user_id left NULL to avoid user creation requirements)
INSERT INTO providers (id, "displayName", slug, "createdAt", "updatedAt", "owner_user_id")
VALUES ((SELECT v FROM tmp_ids WHERE k='provider'), 'delete-flow-test-provider', ('delete-flow-test-' || substring(md5(now()::text) from 1 for 6)), now(), now(), NULL);

-- Create a place owned by provider
INSERT INTO places (id, name, slug, description, "cityId", "createdAt", "updatedAt", "providerId")
VALUES ((SELECT v FROM tmp_ids WHERE k='place'), 'delete-flow-test-place', ('delete-flow-place-' || substring(md5(now()::text) from 1 for 6)), 'test place', (SELECT id FROM cities LIMIT 1), now(), now(), (SELECT v FROM tmp_ids WHERE k='provider'));

-- Create place_pricing and opening_hours rows
INSERT INTO place_pricing (id, "placeId", "createdAt", "updatedAt", price)
VALUES (gen_random_uuid(), (SELECT v FROM tmp_ids WHERE k='place'), now(), now(), 100);

INSERT INTO place_opening_hours (id, "placeId", "createdAt", "updatedAt", day_of_week, open_time, close_time)
VALUES (gen_random_uuid(), (SELECT v FROM tmp_ids WHERE k='place'), now(), now(), 1, '09:00', '17:00');

-- Create a booking and wishlist if schema allows (best-effort)
INSERT INTO bookings (id, "place_id", "user_id", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), (SELECT v FROM tmp_ids WHERE k='place'), NULL, now(), now());

INSERT INTO wishlists (id, "place_id", "user_id", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), (SELECT v FROM tmp_ids WHERE k='place'), NULL, now(), now());

-- Create an event linked to the place (venue)
INSERT INTO events (id, title, slug, "createdAt", "updatedAt", "venueId")
VALUES ((SELECT v FROM tmp_ids WHERE k='event'), 'delete-flow-test-event', ('delete-flow-event-' || substring(md5(now()::text) from 1 for 6)), now(), now(), (SELECT v FROM tmp_ids WHERE k='place'));

-- Create a social post referencing provider and event
INSERT INTO social_posts (id, author_id, title, body, "createdAt", "updatedAt", "provider_id", "event_id")
VALUES ((SELECT v FROM tmp_ids WHERE k='post'), NULL, 'test post', 'body', now(), now(), (SELECT v FROM tmp_ids WHERE k='provider'), (SELECT v FROM tmp_ids WHERE k='event'));

-- Verify pre-delete counts
SELECT 'pre-delete: places for provider' AS tag, COUNT(*) FROM places WHERE "providerId" = (SELECT v FROM tmp_ids WHERE k='provider');
SELECT 'pre-delete: place_pricing' AS tag, COUNT(*) FROM place_pricing WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'pre-delete: place_opening_hours' AS tag, COUNT(*) FROM place_opening_hours WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'pre-delete: bookings' AS tag, COUNT(*) FROM bookings WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'pre-delete: wishlists' AS tag, COUNT(*) FROM wishlists WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'pre-delete: events for venue' AS tag, COUNT(*) FROM events WHERE "venueId" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'pre-delete: social_posts referencing provider' AS tag, COUNT(*) FROM social_posts WHERE "provider_id" = (SELECT v FROM tmp_ids WHERE k='provider');

-- Delete provider
DELETE FROM providers WHERE id = (SELECT v FROM tmp_ids WHERE k='provider');

-- Verify post-delete counts / behavior
SELECT 'post-delete: provider exists' AS tag, COUNT(*) FROM providers WHERE id = (SELECT v FROM tmp_ids WHERE k='provider');
SELECT 'post-delete: places for provider' AS tag, COUNT(*) FROM places WHERE "providerId" = (SELECT v FROM tmp_ids WHERE k='provider');
SELECT 'post-delete: place_pricing' AS tag, COUNT(*) FROM place_pricing WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'post-delete: place_opening_hours' AS tag, COUNT(*) FROM place_opening_hours WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'post-delete: bookings' AS tag, COUNT(*) FROM bookings WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'post-delete: wishlists' AS tag, COUNT(*) FROM wishlists WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'post-delete: events for venue' AS tag, COUNT(*) FROM events WHERE "venueId" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'post-delete: social_posts provider_id IS NULL?' AS tag, COUNT(*) FROM social_posts WHERE id = (SELECT v FROM tmp_ids WHERE k='post') AND provider_id IS NULL;

-- Cleanup: remove any remaining test rows
DELETE FROM social_posts WHERE id = (SELECT v FROM tmp_ids WHERE k='post');
DELETE FROM events WHERE id = (SELECT v FROM tmp_ids WHERE k='event');
DELETE FROM place_pricing WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
DELETE FROM place_opening_hours WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
DELETE FROM bookings WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');
DELETE FROM wishlists WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');
DELETE FROM places WHERE id = (SELECT v FROM tmp_ids WHERE k='place');

-- End
