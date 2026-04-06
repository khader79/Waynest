import { join } from 'path';
import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import { TypeOrmNestLogger } from '../common/logging/typeorm-nest-logger';

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

function buildSslOption(
  config: ConfigService,
): boolean | { rejectUnauthorized: boolean } | undefined {
  const dbSsl = config.get<string>('DB_SSL') === 'true';
  if (!dbSsl) {
    return undefined;
  }
  const dbSslRejectUnauthorized =
    config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';
  return { rejectUnauthorized: dbSslRejectUnauthorized };
}

function envInt(config: ConfigService, key: string, fallback: number): number {
  const raw = config.get<string>(key);
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Options for `TypeOrmModule.forRootAsync` (Nest runtime).
 * Uses `autoLoadEntities` only (no explicit `entities` glob) so Nest modules stay the single source of truth.
 */
export function buildNestTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const syncOverride = config.get<string>('DB_SYNC');
  const synchronize = syncOverride === 'true' ? true : !isProd;
  const migrationsRun = config.get<string>('TYPEORM_MIGRATIONS_RUN') === 'true';
  const poolMax = envInt(config, 'DB_POOL_MAX', 20);
  const poolMin = envInt(config, 'DB_POOL_MIN', 2);
  const idleTimeoutMillis = envInt(config, 'DB_IDLE_TIMEOUT_MS', 30000);
  const connectionTimeoutMillis = envInt(
    config,
    'DB_CONNECT_TIMEOUT_MS',
    10000,
  );
  const queryTimeout = envInt(config, 'DB_QUERY_TIMEOUT_MS', 15000);
  const slowQueryMs = envInt(config, 'DB_SLOW_QUERY_MS', 200);
  const migrationsTransactionMode =
    (config.get<string>('TYPEORM_MIGRATIONS_TRANSACTION_MODE') as
      | 'all'
      | 'none'
      | 'each') ?? 'each';

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
    extra: {
      max: Math.max(poolMin, poolMax),
      min: poolMin,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      query_timeout: queryTimeout,
    },
    // Instruct TypeORM to log queries slower than this value (ms) when logging enabled
    maxQueryExecutionTime: slowQueryMs,
    logging: config.get<string>('TYPEORM_LOGGING') === 'true',
    logger: new TypeOrmNestLogger(),
    migrationsTransactionMode,
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
  const dbSslRejectUnauthorized =
    process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
  const ssl = dbSsl
    ? { rejectUnauthorized: dbSslRejectUnauthorized }
    : undefined;

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
    migrationsTransactionMode:
      (process.env.TYPEORM_MIGRATIONS_TRANSACTION_MODE as
        | 'all'
        | 'none'
        | 'each') || 'each',
  };
}
