import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpenseTimestampColumns20260602180000 implements MigrationInterface {
  name = 'AddExpenseTimestampColumns20260602180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trip_expenses"
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trip_expenses"
        DROP COLUMN IF EXISTS "createdAt",
        DROP COLUMN IF EXISTS "updatedAt",
        DROP COLUMN IF EXISTS "deletedAt"
    `);
  }
}
