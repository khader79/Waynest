import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarEntries20260503120000 implements MigrationInterface {
  name = 'AddCalendarEntries20260503120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "calendar_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "user_id" uuid NOT NULL,
        "place_id" uuid,
        "event_id" uuid,
        "calendar_date" date NOT NULL,
        "start_time" character varying(8),
        "end_time" character varying(8),
        "title" character varying(200) NOT NULL,
        "notes" text,
        "source_type" character varying(32) NOT NULL DEFAULT 'manual',
        "source_label" character varying(200),
        CONSTRAINT "PK_calendar_entries_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_calendar_entries_user_date"
      ON "calendar_entries" ("user_id", "calendar_date")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_calendar_entries_user_place_date"
      ON "calendar_entries" ("user_id", "place_id", "calendar_date")
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_entries"
      ADD CONSTRAINT "FK_calendar_entries_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar_entries"
      ADD CONSTRAINT "FK_calendar_entries_place"
      FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calendar_entries" DROP CONSTRAINT IF EXISTS "FK_calendar_entries_place"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_entries" DROP CONSTRAINT IF EXISTS "FK_calendar_entries_user"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_calendar_entries_user_place_date"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_calendar_entries_user_date"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "calendar_entries"`);
  }
}
