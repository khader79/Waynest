import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerCancelledNotificationType20260523173000 implements MigrationInterface {
  name = 'AddOwnerCancelledNotificationType20260523173000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') THEN
          ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'OWNER_CANCELLED';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be dropped safely without rebuilding the type.
  }
}
