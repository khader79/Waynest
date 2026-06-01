import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUsageLogsTimestampColumns20260601000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('usage_logs', [
      new TableColumn({
        name: 'updatedAt',
        type: 'timestamptz',
        default: 'now()',
      }),
      new TableColumn({
        name: 'deletedAt',
        type: 'timestamptz',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('usage_logs', ['updatedAt', 'deletedAt']);
  }
}
