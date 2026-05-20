#!/usr/bin/env node
// Simple helper to run EXPLAIN (ANALYZE, BUFFERS) against DATABASE_URL
const { Client } = require('pg');

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node run_explain.js "<SQL>"');
    process.exit(2);
  }

  const sql = args.join(' ');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Please set DATABASE_URL in environment');
    process.exit(2);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const explainSQL = `EXPLAIN (ANALYZE, BUFFERS) ${sql}`;
    const res = await client.query(explainSQL);
    for (const row of res.rows) {
      console.log(row['QUERY PLAN']);
    }
  } catch (err) {
    console.error('Error running EXPLAIN:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
