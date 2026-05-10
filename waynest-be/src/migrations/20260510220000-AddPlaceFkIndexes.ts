import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlaceFkIndexes20260510220000 implements MigrationInterface {
  name = 'AddPlaceFkIndexes20260510220000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_place_pricing_place_id" ON "place_pricing" ("placeId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_place_opening_hours_place_id" ON "place_opening_hours" ("placeId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_place_pricing_place_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_place_opening_hours_place_id"`,
    );
  }
}
