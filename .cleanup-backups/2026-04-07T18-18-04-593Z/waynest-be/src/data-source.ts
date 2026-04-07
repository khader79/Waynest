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
import { DataSource } from 'typeorm';
import { buildDataSourceOptionsFromEnv } from './database/typeorm.config';

loadEnv();

export default new DataSource(buildDataSourceOptionsFromEnv());
