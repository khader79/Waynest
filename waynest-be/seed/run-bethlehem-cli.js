const { config: loadEnv } = require('dotenv');
const { existsSync } = require('fs');
const { resolve, join } = require('path');
const { DataSource } = require('typeorm');

const envCandidates = [
  resolve(__dirname, '..', '.env'),
  resolve(__dirname, '.env'),
];
for (const envFilePath of envCandidates.filter(
  (candidate, index) => envCandidates.indexOf(candidate) === index && existsSync(candidate),
).reverse()) {
  loadEnv({ path: envFilePath, override: true });
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) { console.error('DATABASE_URL is not set'); process.exit(1); }

  const dbSsl = process.env.DB_SSL === 'true';
  const ds = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: dbSsl ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
    entities: [join(resolve(__dirname, '..', 'dist', 'src'), '**', '*.entity.js')],
    synchronize: false,
  });
  await ds.initialize();
  const queryRunner = ds.createQueryRunner();

  try {
    // Delete in FK order: children referencing places/events first, then events, then places
    const deleteOrder = [
      'event_comments',
      'social_posts',
      'place_verification_requests',
      'place_comments',
      'place_opening_hours',
      'place_pricing',
      'places_tags_tags',
      'reviews',
      'bookings',
      'calendar_entries',
      'wishlists',
      'events',
    ];

    console.log('Deleting place-related data...');
    const counts = {};
    for (const table of deleteOrder) {
      const exists = await queryRunner.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [table]
      );
      if (!exists[0].exists) continue;
      const [cnt] = await queryRunner.query(`SELECT COUNT(*) AS c FROM "${table}"`);
      if (Number(cnt.c) > 0) {
        await queryRunner.query(`DELETE FROM "${table}"`);
        counts[table] = Number(cnt.c);
      }
    }

    // Delete places last
    const [placeCnt] = await queryRunner.query('SELECT COUNT(*) AS c FROM places');
    if (Number(placeCnt.c) > 0) {
      await queryRunner.query('DELETE FROM places');
      counts.places = Number(placeCnt.c);
    }

    console.log('Deleted:', JSON.stringify(counts, null, 2));
  } finally {
    await queryRunner.release();
  }

  // Run Bethlehem seed fresh
  console.log('Running Bethlehem seed...');
  const { seedBethlehem } = require(resolve(__dirname, '..', 'dist', 'seed', 'bethlehem.seed.js'));
  const result = await seedBethlehem(ds);
  console.log('Seed result:', JSON.stringify(result, null, 2));

  await ds.destroy();
  console.log('Done.');
}
run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
