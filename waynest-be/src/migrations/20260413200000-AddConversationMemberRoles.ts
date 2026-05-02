import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationMemberRoles20260413200000 implements MigrationInterface {
  name = 'AddConversationMemberRoles20260413200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = async (tableName: string) => {
      const exists = await queryRunner.query(
        `SELECT to_regclass('public.${tableName}') as name`,
      );
      return !!exists?.[0]?.name;
    };

    if (!(await tableExists('conversation_members'))) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD COLUMN IF NOT EXISTS "conversation_role" varchar(16) NOT NULL DEFAULT 'MEMBER'`,
    );

    if (await tableExists('conversations')) {
      await queryRunner.query(
        `UPDATE "conversation_members" cm
         SET "conversation_role" = 'ADMIN'
         FROM "conversations" c
         WHERE c."id" = cm."conversation_id"
           AND c."created_by_user_id" = cm."user_id"`,
      );
    }

    await queryRunner.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1
           FROM information_schema.table_constraints tc
           WHERE tc.constraint_name = 'CHK_conversation_members_role'
             AND tc.table_name = 'conversation_members'
         ) THEN
           ALTER TABLE "conversation_members"
           ADD CONSTRAINT "CHK_conversation_members_role"
           CHECK ("conversation_role" IN ('MEMBER', 'ADMIN'));
         END IF;
       END $$`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_conversation_members_role" ON "conversation_members" ("conversation_role")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT to_regclass('public.conversation_members') as name`,
    );
    if (!exists?.[0]?.name) {
      return;
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_conversation_members_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP CONSTRAINT IF EXISTS "CHK_conversation_members_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP COLUMN IF EXISTS "conversation_role"`,
    );
  }
}
