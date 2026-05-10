import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStripeBillingFields1778428550930 implements MigrationInterface {
  name = 'AddStripeBillingFields1778428550930';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add Stripe fields to plans table
    await queryRunner.query(
      `ALTER TABLE "plans" ADD COLUMN "stripePriceId" character varying(255)`,
    );

    // Add Stripe fields to subscriptions table
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD COLUMN "providerSubscriptionId" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD COLUMN "providerCustomerId" character varying(255)`,
    );

    // Create invoices table
    await queryRunner.query(
      `CREATE TYPE "public"."invoices_status_enum" AS ENUM('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "providerInvoiceId" character varying(255) NOT NULL,
        "provider" character varying(64) NOT NULL,
        "amountCents" integer NOT NULL,
        "amountPaidCents" integer NOT NULL DEFAULT '0',
        "currency" character varying(3) NOT NULL DEFAULT 'usd',
        "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'DRAFT',
        "paidAt" TIMESTAMP WITH TIME ZONE,
        "hostedInvoiceUrl" character varying(255),
        "invoicePdfUrl" character varying(255),
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "user_id" uuid NOT NULL,
        "subscription_id" uuid,
        CONSTRAINT "UQ_invoices_provider_invoice_id" UNIQUE ("providerInvoiceId"),
        CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_subscription"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_user"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."invoices_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "providerCustomerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "providerSubscriptionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" DROP COLUMN IF EXISTS "stripePriceId"`,
    );
  }
}
