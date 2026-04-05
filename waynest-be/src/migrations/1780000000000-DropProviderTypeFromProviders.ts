import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropProviderTypeFromProviders1780000000000
  implements MigrationInterface
{
  name = 'DropProviderTypeFromProviders1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "providers" DROP COLUMN IF EXISTS "providerType"',
    );
    await queryRunner.query(
      'DROP TYPE IF EXISTS "public"."providers_providerType_enum"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally left blank. This migration removes a legacy column that is
    // no longer part of the provider model or application flow.
  }
}
