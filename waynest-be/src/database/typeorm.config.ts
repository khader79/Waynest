import { join } from 'path';
import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

/**
 * Root of compiled output (`dist`) or sources (`src`) for glob patterns.
 * This file lives in `src/database`, so one level up is the tree that contains `*.entity` and `migrations/`.
 */
function typeOrmFileRoot(): string {
  return join(__dirname, '..');
}

function migrationFileGlob(): string {
  const ext = __filename.endsWith('.ts') ? 'ts' : 'js';
  return join(typeOrmFileRoot(), 'migrations', `*.${ext}`);
}

function entityFileGlobsForCli(): string[] {
  const ext = __filename.endsWith('.ts') ? 'ts' : 'js';
  return [join(typeOrmFileRoot(), '**', `*.entity.${ext}`)];
}

function buildSslOption(config: ConfigService): boolean | { rejectUnauthorized: boolean } | undefined {
  const dbSsl = config.get<string>('DB_SSL') === 'true';
  if (!dbSsl) {
    return undefined;
  }
  const dbSslRejectUnauthorized = config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';
  return { rejectUnauthorized: dbSslRejectUnauthorized };
}

/**
 * Options for `TypeOrmModule.forRootAsync` (Nest runtime).
 * Uses `autoLoadEntities` only (no explicit `entities` glob) so Nest modules stay the single source of truth.
 */
export function buildNestTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const syncOverride = config.get<string>('DB_SYNC');
  const synchronize = syncOverride === 'true' ? true : !isProd;
  const migrationsRun = config.get<string>('TYPEORM_MIGRATIONS_RUN') === 'true';

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: Number(config.get<string>('DB_PORT')),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_NAME'),
    ssl: buildSslOption(config),
    autoLoadEntities: true,
    synchronize,
    migrationsRun,
    migrations: [migrationFileGlob()],
  };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

/**
 * Same connection settings as Nest, for CLI `DataSource` (reads `process.env` / `.env`).
 */
export function buildDataSourceOptionsFromEnv(): DataSourceOptions {
  const dbSsl = process.env.DB_SSL === 'true';
  const dbSslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
  const ssl = dbSsl ? { rejectUnauthorized: dbSslRejectUnauthorized } : undefined;

  return {
    type: 'postgres',
    host: requireEnv('DB_HOST'),
    port: Number(requireEnv('DB_PORT')),
    username: requireEnv('DB_USERNAME'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME'),
    ssl,
    entities: entityFileGlobsForCli(),
    migrations: [migrationFileGlob()],
    synchronize: false,
    logging: process.env.TYPEORM_LOGGING === 'true',
  };
}
