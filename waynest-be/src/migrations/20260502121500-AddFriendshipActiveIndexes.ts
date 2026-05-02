import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFriendshipActiveIndexes20260502121500 implements MigrationInterface {
  name = 'AddFriendshipActiveIndexes20260502121500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(
      `SELECT to_regclass('public.friendships') as name`,
    );
    if (!tableExists?.[0]?.name) {
      return;
    }

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_friendships_low_status_active" ON "friendships" ("user_low_id", "status") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_friendships_high_status_active" ON "friendships" ("user_high_id", "status") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_friendships_high_status_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_friendships_low_status_active"`,
    );
  }
}
