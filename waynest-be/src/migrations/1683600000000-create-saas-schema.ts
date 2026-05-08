import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class createSaasSchema1683600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'plans',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            isGenerated: true,
          },
          { name: 'slug', type: 'varchar', length: '64', isUnique: true },
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'monthlyCredits', type: 'int', default: 0 },
          { name: 'priceCents', type: 'int', default: 0 },
          { name: 'features', type: 'jsonb', default: "'{}'" },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
      }),
    );

    // subscriptions
    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            isGenerated: true,
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'plan_id', type: 'uuid' },
          { name: 'status', type: 'varchar', length: '32' },
          { name: 'currentPeriodStart', type: 'timestamptz', isNullable: true },
          { name: 'currentPeriodEnd', type: 'timestamptz', isNullable: true },
          { name: 'seats', type: 'int', default: 1 },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'credit_wallets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            isGenerated: true,
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'balance', type: 'bigint', default: '0' },
          { name: 'reserved', type: 'bigint', default: '0' },
          { name: 'monthlyQuota', type: 'int', default: 0 },
          { name: 'rolloverAllowed', type: 'boolean', default: false },
          { name: 'lastResetAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'credit_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            isGenerated: true,
          },
          { name: 'wallet_id', type: 'uuid' },
          { name: 'user_id', type: 'uuid' },
          { name: 'amount', type: 'bigint' },
          { name: 'type', type: 'varchar', length: '32' },
          { name: 'referenceId', type: 'uuid', isNullable: true },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'usage_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            isGenerated: true,
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'subscription_id', type: 'uuid', isNullable: true },
          { name: 'feature', type: 'varchar', length: '128' },
          { name: 'costCredits', type: 'int', default: 0 },
          { name: 'context', type: 'jsonb', default: "'{}'" },
          { name: 'source', type: 'varchar', length: '16' },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'feature_access',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            isGenerated: true,
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'featureKey', type: 'varchar', length: '128' },
          { name: 'enabled', type: 'boolean', default: true },
          { name: 'expiresAt', type: 'timestamptz', isNullable: true },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'billing_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            isGenerated: true,
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'subscription_id', type: 'uuid', isNullable: true },
          { name: 'provider', type: 'varchar', length: '64' },
          {
            name: 'providerChargeId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'amountCents', type: 'int' },
          { name: 'status', type: 'varchar', length: '32' },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
      }),
    );

    // Indexes
    await queryRunner.createIndex(
      'plans',
      new TableIndex({ columnNames: ['slug'] }),
    );
    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({ columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'credit_wallets',
      new TableIndex({ columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'credit_transactions',
      new TableIndex({ columnNames: ['wallet_id'] }),
    );
    await queryRunner.createIndex(
      'usage_logs',
      new TableIndex({ columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'feature_access',
      new TableIndex({ columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'billing_history',
      new TableIndex({ columnNames: ['user_id'] }),
    );

    // audit logs
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            isGenerated: true,
          },
          { name: 'actor_id', type: 'uuid', isNullable: true },
          { name: 'action', type: 'varchar', length: '64' },
          { name: 'targetType', type: 'varchar', length: '64' },
          { name: 'targetId', type: 'uuid', isNullable: true },
          { name: 'diff', type: 'jsonb', default: "'{}'" },
          { name: 'reason', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({ columnNames: ['action', 'targetType'] }),
    );
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({ columnNames: ['createdAt'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs');
    await queryRunner.dropTable('billing_history');
    await queryRunner.dropTable('feature_access');
    await queryRunner.dropTable('usage_logs');
    await queryRunner.dropTable('credit_transactions');
    await queryRunner.dropTable('credit_wallets');
    await queryRunner.dropTable('subscriptions');
    await queryRunner.dropTable('plans');
  }
}
