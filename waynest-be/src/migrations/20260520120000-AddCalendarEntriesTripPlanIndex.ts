import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarEntriesTripPlanIndex20260520120000 implements MigrationInterface {
  // Disable wrapping this migration in a transaction because
  // `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block.
  public transaction = false;
  name = 'AddCalendarEntriesTripPlanIndex20260520120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Prefer CONCURRENTLY for production to avoid blocking writes. If the
      // migration runner executes inside a transaction, CONCURRENTLY will fail,
      // so fall back to a non-concurrent CREATE INDEX when necessary.
      await queryRunner.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_calendar_entries_trip_plan_id" ON "calendar_entries" ("trip_plan_id")`,
      );
    } catch (err) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_calendar_entries_trip_plan_id" ON "calendar_entries" ("trip_plan_id")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_calendar_entries_trip_plan_id"`,
    );
  }
}
