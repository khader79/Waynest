import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationOwner20260413190000 implements MigrationInterface {
  name = 'AddConversationOwner20260413190000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = async (tableName: string) => {
      const exists = await queryRunner.query(
        `SELECT to_regclass('public.${tableName}') as name`,
      );
      return !!exists?.[0]?.name;
    };

    if (!(await tableExists('conversations'))) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "created_by_user_id" uuid`,
    );

    if (
      (await tableExists('messages')) &&
      (await tableExists('conversation_members'))
    ) {
      await queryRunner.query(
        `UPDATE "conversations" c
         SET "created_by_user_id" = COALESCE(
           (
             SELECT m."sender_id"
             FROM "messages" m
             WHERE m."conversation_id" = c."id"
             ORDER BY m."createdAt" ASC, m."id" ASC
             LIMIT 1
           ),
           (
             SELECT cm."user_id"
             FROM "conversation_members" cm
             WHERE cm."conversation_id" = c."id"
             ORDER BY cm."createdAt" ASC, cm."id" ASC
             LIMIT 1
           )
         )
         WHERE c."created_by_user_id" IS NULL`,
      );
    }

    await queryRunner.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1
           FROM information_schema.table_constraints tc
           WHERE tc.constraint_name = 'FK_conversations_created_by_user'
             AND tc.table_name = 'conversations'
         ) THEN
           ALTER TABLE "conversations"
           ADD CONSTRAINT "FK_conversations_created_by_user"
           FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
           ON DELETE SET NULL ON UPDATE NO ACTION;
         END IF;
       END $$`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_conversations_created_by_user" ON "conversations" ("created_by_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT to_regclass('public.conversations') as name`,
    );
    if (!exists?.[0]?.name) {
      return;
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_conversations_created_by_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "FK_conversations_created_by_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN IF EXISTS "created_by_user_id"`,
    );
  }
}
