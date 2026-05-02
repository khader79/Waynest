import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add the is_search_visible column to the users table.
 * This column allows users to control their visibility in search results.
 */
export class AddUserSearchVisibility20260510000000 implements MigrationInterface {
  name = 'AddUserSearchVisibility20260510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "is_search_visible" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "is_search_visible"
    `);
  }
}
