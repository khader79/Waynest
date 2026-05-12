import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreditTransactionUniqueConstraint20260512000000
  implements MigrationInterface
{
  name = 'AddCreditTransactionUniqueConstraint20260512000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_credit_tx_user_ref_type"
      ON "credit_transactions" ("user_id", "reference_id", "type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_credit_tx_user_ref_type"
    `);
  }
}
