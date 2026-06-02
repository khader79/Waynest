import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripExpensesTable20260603000000 implements MigrationInterface {
  name = 'AddTripExpensesTable20260603000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_expenses" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "trip_plan_id"          UUID NOT NULL REFERENCES "trip_plans"("id") ON DELETE CASCADE,
        "paid_by_id"            UUID REFERENCES "users"("id"),
        "description"           VARCHAR(255) NOT NULL,
        "totalAmount"           DECIMAL(10, 2) NOT NULL,
        "currencyCode"          VARCHAR(3) NOT NULL DEFAULT 'ILS',
        "date"                  DATE,
        "splitAmongUserIds"     JSONB NOT NULL DEFAULT '[]'::jsonb,
        "isSettled"             BOOLEAN NOT NULL DEFAULT FALSE,
        "category"              VARCHAR(50),
        "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deletedAt"             TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expenses_trip_plan_id"
      ON "trip_expenses" ("trip_plan_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_expenses"`);
  }
}
