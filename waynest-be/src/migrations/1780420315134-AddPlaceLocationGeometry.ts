import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlaceLocationGeometry1780420315134 implements MigrationInterface {
  name = 'AddPlaceLocationGeometry1780420315134';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'places' AND column_name = 'location'
        ) THEN
          ALTER TABLE "places"
            ADD COLUMN "location" geometry(Point, 4326);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_places_location"
        ON "places"
        USING GIST ("location");
    `);

    await queryRunner.query(`
      UPDATE "places"
        SET "location" = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
        WHERE "location" IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_places_location"`);
    await queryRunner.query(`ALTER TABLE "places" DROP COLUMN IF EXISTS "location"`);
  }
}
