import { Logger } from '@nestjs/common';
import type { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';

/**
 * Simple bridge: route TypeORM log events into Nest's Logger.
 * Focuses on slow queries via `logQuerySlow` and surfaces errors/warnings.
 */
export class TypeOrmNestLogger implements TypeOrmLogger {
  private readonly logger = new Logger('TypeORM');

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    // Avoid noisy query-level logs unless explicitly enabled by TypeORM logging settings.
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {
    this.logger.error(`Query error: ${String(error)} -- ${query}`);
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {
    this.logger.warn(`Slow query (${time}ms): ${query}`);
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    this.logger.log(message);
  }

  logMigration(message: string, queryRunner?: QueryRunner) {
    this.logger.log(message);
  }

  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner) {
    if (level === 'log' || level === 'info') {
      this.logger.log(String(message));
    } else if (level === 'warn') {
      this.logger.warn(String(message));
    }
  }
}
