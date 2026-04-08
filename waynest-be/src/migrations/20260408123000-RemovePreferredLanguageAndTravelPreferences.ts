import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePreferredLanguageAndTravelPreferences20260408123000 implements MigrationInterface {
  name = 'RemovePreferredLanguageAndTravelPreferences20260408123000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "preferredLanguage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "travelPreferences"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "preferredLanguage" character varying(16) NOT NULL DEFAULT 'en'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "travelPreferences" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
  }
}
