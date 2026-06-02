import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsageLogsTimestampColumns20260601000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usage_logs"
        ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usage_logs"
        DROP COLUMN IF EXISTS "updatedAt",
        DROP COLUMN IF EXISTS "deletedAt"
    `);
  }
}
