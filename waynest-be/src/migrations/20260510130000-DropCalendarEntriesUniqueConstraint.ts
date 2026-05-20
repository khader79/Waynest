import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCalendarEntriesUniqueConstraint20260510130000 implements MigrationInterface {
  name = 'DropCalendarEntriesUniqueConstraint20260510130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_calendar_entries_user_place_date"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_calendar_entries_user_place_date"
      ON "calendar_entries" ("user_id", "place_id", "calendar_date")
    `);
  }
}
