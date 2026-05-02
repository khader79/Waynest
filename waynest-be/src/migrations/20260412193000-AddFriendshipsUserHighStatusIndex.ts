import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFriendshipsUserHighStatusIndex20260412193000 implements MigrationInterface {
  name = 'AddFriendshipsUserHighStatusIndex20260412193000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = async (tableName: string) => {
      const exists = await queryRunner.query(
        `SELECT to_regclass('public.${tableName}') as name`,
      );
      return !!exists?.[0]?.name;
    };

    const statements: Array<[string, string]> = [
      [
        'friendships',
        `CREATE INDEX IF NOT EXISTS "idx_friendships_low_status" ON "friendships" ("user_low_id", "status")`,
      ],
      [
        'friendships',
        `CREATE INDEX IF NOT EXISTS "idx_friendships_high_status" ON "friendships" ("user_high_id", "status")`,
      ],
      [
        'provider_memberships',
        `CREATE INDEX IF NOT EXISTS "idx_provider_memberships_user_provider" ON "provider_memberships" ("userId", "providerId")`,
      ],
      [
        'block_relations',
        `CREATE INDEX IF NOT EXISTS "idx_block_relations_blocked_blocker" ON "block_relations" ("blocked_id", "blocker_id")`,
      ],
      [
        'social_posts',
        `CREATE INDEX IF NOT EXISTS "idx_social_posts_created_at" ON "social_posts" ("createdAt" DESC) WHERE "deletedAt" IS NULL`,
      ],
    ];

    for (const [tableName, statement] of statements) {
      if (await tableExists(tableName)) {
        await queryRunner.query(statement);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_social_posts_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_block_relations_blocked_blocker"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_provider_memberships_user_provider"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_friendships_low_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_friendships_high_status"`,
    );
  }
}
