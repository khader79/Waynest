import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarSharedNotificationType20260503200000 implements MigrationInterface {
  name = 'AddCalendarSharedNotificationType20260503200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') THEN
          ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'CALENDAR_SHARED';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be dropped safely without rebuilding the type.
  }
}
