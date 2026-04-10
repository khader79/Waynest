import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class AddPlaceVerificationRequests20260410120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'place_verification_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'placeId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'requestedByUserId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '16',
            isNullable: false,
            default: `'PENDING'`,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'deletedAt',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'place_verification_requests',
      new TableForeignKey({
        columnNames: ['placeId'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('place_verification_requests');
    if (table) {
      const fk = table.foreignKeys.find(
        (f) => f.columnNames.indexOf('placeId') !== -1,
      );
      if (fk) {
        await queryRunner.dropForeignKey('place_verification_requests', fk);
      }
    }
    await queryRunner.dropTable('place_verification_requests');
  }
}
