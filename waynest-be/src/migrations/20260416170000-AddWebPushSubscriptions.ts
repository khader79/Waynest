import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebPushSubscriptions20260416170000
  implements MigrationInterface
{
  name = 'AddWebPushSubscriptions20260416170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "web_push_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "user_id" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "expiration_time" bigint,
        "user_agent" varchar(1024),
        CONSTRAINT "PK_web_push_subscriptions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_web_push_subscriptions_endpoint"
      ON "web_push_subscriptions" ("endpoint")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_web_push_subscriptions_user_id"
      ON "web_push_subscriptions" ("user_id")
    `);

    const fkExists = await queryRunner.query(`
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'FK_web_push_subscriptions_user_id'
    `);

    if (!Array.isArray(fkExists) || fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "web_push_subscriptions"
        ADD CONSTRAINT "FK_web_push_subscriptions_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "web_push_subscriptions"
    `);
  }
}
