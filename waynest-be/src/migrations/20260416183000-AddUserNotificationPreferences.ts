import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNotificationPreferences20260416183000 implements MigrationInterface {
  name = 'AddUserNotificationPreferences20260416183000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "notification_channels" jsonb
      NOT NULL DEFAULT '{"inApp":true,"push":true,"email":false}'::jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "notification_type_preferences" jsonb
      NOT NULL DEFAULT '{}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "notification_type_preferences"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "notification_channels"
    `);
  }
}
