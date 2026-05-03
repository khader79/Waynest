import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripPlanViews20260510120000 implements MigrationInterface {
  name = 'AddTripPlanViews20260510120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_plan_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "trip_plan_id" uuid NOT NULL,
        "viewer_user_id" uuid,
        "visitor_key" character varying(128),
        CONSTRAINT "PK_trip_plan_views_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_plan_views_trip_plan" FOREIGN KEY ("trip_plan_id") REFERENCES "trip_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trip_plan_views_viewer_user" FOREIGN KEY ("viewer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "CHK_trip_plan_views_actor" CHECK ("viewer_user_id" IS NOT NULL OR "visitor_key" IS NOT NULL)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_trip_plan_views_plan_user"
      ON "trip_plan_views" ("trip_plan_id", "viewer_user_id")
      WHERE "viewer_user_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_trip_plan_views_plan_visitor"
      ON "trip_plan_views" ("trip_plan_id", "visitor_key")
      WHERE "visitor_key" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_trip_plan_views_plan_visitor"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_trip_plan_views_plan_user"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_plan_views"`);
  }
}
