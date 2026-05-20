import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarEntryCollaborators20260503193000 implements MigrationInterface {
  name = 'AddCalendarEntryCollaborators20260503193000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "calendar_entries"
      ADD COLUMN IF NOT EXISTS "shared_with_user_ids" uuid[] NOT NULL DEFAULT '{}'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_calendar_entries_shared_users"
      ON "calendar_entries" USING gin ("shared_with_user_ids")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_calendar_entries_shared_users"`,
    );
    await queryRunner.query(`
      ALTER TABLE "calendar_entries"
      DROP COLUMN IF EXISTS "shared_with_user_ids"
    `);
  }
}
