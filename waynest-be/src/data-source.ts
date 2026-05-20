/**
 * TypeORM CLI entry (`-d src/data-source.ts`).
 *
 * Examples (from repo root, `.env` loaded):
 * - `npm run migration:run`
 * - `npm run migration:revert`
 * - `npm run migration:show`
 * - `npm run migration:generate -- src/migrations/DescribeChange` (diff vs DB → file)
 * - `npm run migration:create -- src/migrations/DescribeChange` (empty skeleton)
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptionsFromEnv } from './database/typeorm.config';

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'waynest-be', '.env'),
  resolve(__dirname, '..', '.env'),
  resolve(__dirname, '..', '..', '.env'),
];

for (const envFilePath of envCandidates
  .filter(
    (candidate, index) =>
      envCandidates.indexOf(candidate) === index && existsSync(candidate),
  )
  .reverse()) {
  loadEnv({ path: envFilePath, override: true });
}

export default new DataSource(buildDataSourceOptionsFromEnv());
