require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:
      process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
  });

  await client.connect();
  await client.query(
    "ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'::text[]",
  );
  await client.end();
  // eslint-disable-next-line no-console
  console.log('image_urls column ensured');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
