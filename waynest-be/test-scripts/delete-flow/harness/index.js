#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const scripts = [
  '../provider_cascade.sql',
  '../place_cascade.sql',
  '../review_set_null.sql',
];

function runPsql(script) {
  const PGHOST = process.env.PGHOST || 'localhost';
  const PGPORT = process.env.PGPORT || '5432';
  const PGUSER = process.env.PGUSER || process.env.USER || process.env.USERNAME;
  const PGDATABASE = process.env.PGDATABASE;
  if (!PGDATABASE) {
    console.log('PGDATABASE not set — skipping SQL tests');
    return;
  }
  if (!fs.existsSync(script)) {
    console.warn('Script not found:', script);
    return;
  }
  const cmd = `psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -f ${script}`;
  console.log('\n==== Running:', script, '====');
  try {
    const out = execSync(cmd, { stdio: 'inherit', env: process.env });
    return out;
  } catch (err) {
    console.error('psql failed:', err.message || err);
    process.exit(1);
  }
}

function runSqlString(sql) {
  const tmp = path.join(os.tmpdir(), `df_${Date.now()}.sql`);
  fs.writeFileSync(tmp, sql, 'utf8');
  try {
    runPsql(tmp);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch (e) {}
  }
}

async function runServiceChecks() {
  const base = process.env.BASE_URL;
  const token = process.env.ADMIN_TOKEN;
  if (!base || !token) {
    console.log(
      'BASE_URL or ADMIN_TOKEN not set — skipping service-level checks',
    );
    return;
  }
  console.log('Service-level checks: calling', base);
  // Example: GET /health (adjust to your API)
  try {
    const res = await fetch(new URL('/health', base), {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('/health status', res.status);
  } catch (err) {
    console.error('Service check failed:', err.message || err);
  }
}

async function apiRequest(method, path) {
  const base = process.env.BASE_URL;
  const token = process.env.ADMIN_TOKEN;
  if (!base || !token) throw new Error('BASE_URL or ADMIN_TOKEN not set');
  const url = new URL(path, base).toString();
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return res;
}

async function runDeleteChecks() {
  const testUser = process.env.ADMIN_TEST_USER_ID;
  const testProvider = process.env.ADMIN_TEST_PROVIDER_ID;
  if (!testUser && !testProvider) {
    console.log(
      'No ADMIN_TEST_USER_ID or ADMIN_TEST_PROVIDER_ID set — skipping delete checks',
    );
    return;
  }

  if (testProvider) {
    console.log('\nService delete check: provider', testProvider);
    try {
      let r = await apiRequest('DELETE', `/providers/${testProvider}`);
      console.log('DELETE /providers/:id ->', r.status);
      r = await apiRequest('GET', `/providers/${testProvider}`);
      console.log('GET /providers/:id ->', r.status);
    } catch (err) {
      console.error('Provider delete check failed:', err.message || err);
    }
  }

  if (testUser) {
    console.log('\nService delete check: user', testUser);
    try {
      let r = await apiRequest('DELETE', `/users/${testUser}`);
      console.log('DELETE /users/:id ->', r.status);
      r = await apiRequest('GET', `/users/${testUser}`);
      console.log('GET /users/:id ->', r.status);
    } catch (err) {
      console.error('User delete check failed:', err.message || err);
    }
  }
}

async function createAndTestProviderFlow() {
  const doCreate = process.env.AUTO_CREATE === 'true';
  const PGDATABASE = process.env.PGDATABASE;
  if (!doCreate || !PGDATABASE) {
    console.log(
      'AUTO_CREATE not enabled or PGDATABASE unset — skipping auto-create flow',
    );
    return;
  }

  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    console.log(
      'ADMIN_TOKEN not set — cannot perform API delete step for created provider',
    );
    return;
  }

  const providerId = crypto.randomUUID();
  const ownerUserId = crypto.randomUUID();
  const placeId = crypto.randomUUID();
  const eventId = crypto.randomUUID();

  const sql = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    INSERT INTO users (id, email, role, "createdAt", "updatedAt") VALUES ('${ownerUserId}', 'df-owner-${Date.now()}@example.com', 'PROVIDER', now(), now());
    INSERT INTO providers (id, name, "owner_user_id", "createdAt", "updatedAt") VALUES ('${providerId}', 'df-provider-${Date.now()}', '${ownerUserId}', now(), now());
    INSERT INTO places (id, name, slug, description, "cityId", "providerId", "createdAt", "updatedAt") VALUES ('${placeId}', 'df-place', 'df-slug-${Date.now()}', 'desc', (SELECT id FROM cities LIMIT 1), '${providerId}', now(), now());
    INSERT INTO events (id, title, slug, "createdAt", "updatedAt", "venueId", "providerId") VALUES ('${eventId}', 'df-event', 'df-event-${Date.now()}', now(), now(), '${placeId}', '${providerId}');
    -- create dependent rows: place_pricing, place_opening_hours, reviews, social_posts
    INSERT INTO place_pricing (id, "placeId", "createdAt", "updatedAt", price) VALUES (gen_random_uuid(), '${placeId}', now(), now(), 10);
    INSERT INTO place_opening_hours (id, "placeId", "createdAt", "updatedAt", day_of_week, open_time, close_time) VALUES (gen_random_uuid(), '${placeId}', now(), now(), 2, '10:00', '18:00');
    INSERT INTO reviews (id, "place_id", "event_id", "user_id", rating, comment, "createdAt", "updatedAt") VALUES (gen_random_uuid(), '${placeId}', '${eventId}', '${ownerUserId}', 5, 'test', now(), now());
    INSERT INTO social_posts (id, author_id, provider_id, event_id, content, "createdAt", "updatedAt") VALUES (gen_random_uuid(), '${ownerUserId}', '${providerId}', '${eventId}', 'test post', now(), now());
  `;

  console.log('Creating test provider and dependent data via SQL');
  runSqlString(sql);

  // Call DELETE via API (admin)
  try {
    // First delete the owner user and verify provider becomes ownerless
    const resUser = await apiRequest('DELETE', `/users/${ownerUserId}`);
    console.log('DELETE created user ->', resUser.status);

    // Now call delete on provider (admin) to exercise provider delete path too
    const res = await apiRequest('DELETE', `/providers/${providerId}`);
    console.log('DELETE created provider ->', res.status);
  } catch (err) {
    console.error(
      'API delete failed for created provider:',
      err.message || err,
    );
  }

  // Verify with SQL queries
  const verifySql = `
    SELECT 'places' as tag, COUNT(*) FROM places WHERE id='${placeId}';
    SELECT 'place_pricing' as tag, COUNT(*) FROM place_pricing WHERE "placeId"='${placeId}';
    SELECT 'place_opening_hours' as tag, COUNT(*) FROM place_opening_hours WHERE "placeId"='${placeId}';
    SELECT 'reviews' as tag, COUNT(*) FROM reviews WHERE "place_id"='${placeId}' OR "event_id"='${eventId}';
    SELECT 'social_posts' as tag, COUNT(*) FROM social_posts WHERE provider_id='${providerId}' OR event_id='${eventId}';
    SELECT 'user_provider_role_count' as tag, COUNT(*) FROM users WHERE id='${ownerUserId}' AND role='PROVIDER';
    SELECT 'provider_owner_null' as tag, COUNT(*) FROM providers WHERE id='${providerId}' AND owner_user_id IS NULL;
  `;
  console.log('Running verification SQL');
  runSqlString(verifySql);

  // Cleanup any leftovers (best effort)
  const cleanupSql = `
    DELETE FROM social_posts WHERE provider_id='${providerId}' OR event_id='${eventId}';
    DELETE FROM reviews WHERE "place_id"='${placeId}' OR "event_id"='${eventId}';
    DELETE FROM place_pricing WHERE "placeId"='${placeId}';
    DELETE FROM place_opening_hours WHERE "placeId"='${placeId}';
    DELETE FROM events WHERE id='${eventId}';
    DELETE FROM places WHERE id='${placeId}';
    DELETE FROM providers WHERE id='${providerId}';
    DELETE FROM users WHERE id='${ownerUserId}';
  `;
  runSqlString(cleanupSql);
}

(async function main() {
  console.log('Delete-flow integration harness');
  for (const s of scripts) runPsql(s);
  await runServiceChecks();
  await runDeleteChecks();
  await createAndTestProviderFlow();
  console.log('\nDone.');
})();
