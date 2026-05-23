-- Place cascade (hard-delete) test

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE tmp_ids(k text, v uuid) ON COMMIT DROP;

INSERT INTO tmp_ids VALUES ('place', gen_random_uuid());
INSERT INTO tmp_ids VALUES ('pricing', gen_random_uuid());
INSERT INTO tmp_ids VALUES ('opening', gen_random_uuid());
INSERT INTO tmp_ids VALUES ('wishlist', gen_random_uuid());
INSERT INTO tmp_ids VALUES ('booking', gen_random_uuid());

-- Create a place (no provider required)
INSERT INTO places (id, name, slug, description, "cityId", "createdAt", "updatedAt")
VALUES ((SELECT v FROM tmp_ids WHERE k='place'), 'delete-flow-test-place-2', ('delete-flow-place-' || substring(md5(now()::text) from 1 for 6)), 'test place', (SELECT id FROM cities LIMIT 1), now(), now());

-- Create child rows
INSERT INTO place_pricing (id, "placeId", "createdAt", "updatedAt", price)
VALUES ((SELECT v FROM tmp_ids WHERE k='pricing'), (SELECT v FROM tmp_ids WHERE k='place'), now(), now(), 50);

INSERT INTO place_opening_hours (id, "placeId", "createdAt", "updatedAt", day_of_week, open_time, close_time)
VALUES ((SELECT v FROM tmp_ids WHERE k='opening'), (SELECT v FROM tmp_ids WHERE k='place'), now(), now(), 2, '10:00', '18:00');

INSERT INTO wishlists (id, "place_id", "user_id", "createdAt", "updatedAt")
VALUES ((SELECT v FROM tmp_ids WHERE k='wishlist'), (SELECT v FROM tmp_ids WHERE k='place'), NULL, now(), now());

INSERT INTO bookings (id, "place_id", "user_id", "createdAt", "updatedAt")
VALUES ((SELECT v FROM tmp_ids WHERE k='booking'), (SELECT v FROM tmp_ids WHERE k='place'), NULL, now(), now());

-- Pre-delete counts
SELECT 'pre-delete place_pricing' AS tag, COUNT(*) FROM place_pricing WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'pre-delete place_opening_hours' AS tag, COUNT(*) FROM place_opening_hours WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'pre-delete wishlists' AS tag, COUNT(*) FROM wishlists WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'pre-delete bookings' AS tag, COUNT(*) FROM bookings WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');

-- Delete place (hard delete)
DELETE FROM places WHERE id = (SELECT v FROM tmp_ids WHERE k='place');

-- Post-delete counts
SELECT 'post-delete places' AS tag, COUNT(*) FROM places WHERE id = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'post-delete place_pricing' AS tag, COUNT(*) FROM place_pricing WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'post-delete place_opening_hours' AS tag, COUNT(*) FROM place_opening_hours WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'post-delete wishlists' AS tag, COUNT(*) FROM wishlists WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');
SELECT 'post-delete bookings' AS tag, COUNT(*) FROM bookings WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');

-- Cleanup just in case
DELETE FROM place_pricing WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
DELETE FROM place_opening_hours WHERE "placeId" = (SELECT v FROM tmp_ids WHERE k='place');
DELETE FROM wishlists WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');
DELETE FROM bookings WHERE "place_id" = (SELECT v FROM tmp_ids WHERE k='place');
DELETE FROM places WHERE id = (SELECT v FROM tmp_ids WHERE k='place');

-- End
