import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageDeliveryStatus20260520130000 implements MigrationInterface {
  name = 'AddMessageDeliveryStatus20260520130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."messages_delivery_status_enum" AS ENUM('pending', 'sent', 'delivered', 'seen')
    `);

    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN "delivery_status" "public"."messages_delivery_status_enum" NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_messages_delivery_status" ON "messages" ("delivery_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_messages_delivery_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN "delivery_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."messages_delivery_status_enum"`,
    );
  }
}
