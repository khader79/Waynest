import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripPlannerShareVisibility20260503180000 implements MigrationInterface {
  name = 'AddTripPlannerShareVisibility20260503180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trip_plans"
      ADD COLUMN IF NOT EXISTS "share_visibility" varchar(16) NOT NULL DEFAULT 'PUBLIC'
    `);
    await queryRunner.query(`
      UPDATE "trip_plans"
      SET "share_visibility" = CASE WHEN "is_public" = true THEN 'PUBLIC' ELSE 'FRIENDS' END
      WHERE "share_visibility" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trip_plans" DROP COLUMN IF EXISTS "share_visibility"
    `);
  }
}
