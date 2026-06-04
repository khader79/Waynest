import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlaceAddressColumn20260604120000 implements MigrationInterface {
  name = 'AddPlaceAddressColumn20260604120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "places"
      ADD COLUMN IF NOT EXISTS "address" varchar(512) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "places" DROP COLUMN IF EXISTS "address"`);
  }
}
