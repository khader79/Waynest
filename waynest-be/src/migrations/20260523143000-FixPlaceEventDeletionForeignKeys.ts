import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

type ForeignKeySpec = {
  tableName: string;
  columnNames: string[];
  referencedTableName: string;
  referencedColumnNames: string[];
  onDelete: 'CASCADE' | 'SET NULL' | 'NO ACTION';
  name: string;
};

export class FixPlaceEventDeletionForeignKeys20260523143000 implements MigrationInterface {
  name = 'FixPlaceEventDeletionForeignKeys20260523143000';

  private async replaceForeignKey(
    queryRunner: QueryRunner,
    spec: ForeignKeySpec,
  ): Promise<void> {
    const table = await queryRunner.getTable(spec.tableName);
    if (!table) {
      return;
    }

    const existingForeignKeys = table.foreignKeys.filter(
      (foreignKey) =>
        foreignKey.referencedTableName === spec.referencedTableName &&
        foreignKey.columnNames.length === spec.columnNames.length &&
        foreignKey.columnNames.every(
          (columnName, index) => columnName === spec.columnNames[index],
        ),
    );

    for (const foreignKey of existingForeignKeys) {
      await queryRunner.dropForeignKey(table, foreignKey);
    }

    await queryRunner.createForeignKey(
      table,
      new TableForeignKey({
        name: spec.name,
        columnNames: spec.columnNames,
        referencedTableName: spec.referencedTableName,
        referencedColumnNames: spec.referencedColumnNames,
        onDelete: spec.onDelete,
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const specs: ForeignKeySpec[] = [
      {
        tableName: 'places',
        columnNames: ['providerId'],
        referencedTableName: 'providers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_places_provider_id',
      },
      {
        tableName: 'place_pricing',
        columnNames: ['placeId'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_place_pricing_place_id',
      },
      {
        tableName: 'place_opening_hours',
        columnNames: ['placeId'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_place_opening_hours_place_id',
      },
      {
        tableName: 'bookings',
        columnNames: ['place_id'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_bookings_place_id',
      },
      {
        tableName: 'wishlists',
        columnNames: ['place_id'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_wishlists_place_id',
      },
      {
        tableName: 'reviews',
        columnNames: ['place_id'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_reviews_place_id',
      },
      {
        tableName: 'reviews',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_reviews_event_id',
      },
      {
        tableName: 'social_posts',
        columnNames: ['provider_id'],
        referencedTableName: 'providers',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_social_posts_provider_id',
      },
      {
        tableName: 'social_posts',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_social_posts_event_id',
      },
    ];

    for (const spec of specs) {
      await this.replaceForeignKey(queryRunner, spec);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const specs: ForeignKeySpec[] = [
      {
        tableName: 'places',
        columnNames: ['providerId'],
        referencedTableName: 'providers',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'FK_places_provider_id',
      },
      {
        tableName: 'place_pricing',
        columnNames: ['placeId'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'FK_place_pricing_place_id',
      },
      {
        tableName: 'place_opening_hours',
        columnNames: ['placeId'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'FK_place_opening_hours_place_id',
      },
      {
        tableName: 'bookings',
        columnNames: ['place_id'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'FK_bookings_place_id',
      },
      {
        tableName: 'wishlists',
        columnNames: ['place_id'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'FK_wishlists_place_id',
      },
      {
        tableName: 'reviews',
        columnNames: ['place_id'],
        referencedTableName: 'places',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'FK_reviews_place_id',
      },
      {
        tableName: 'reviews',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'FK_reviews_event_id',
      },
      {
        tableName: 'social_posts',
        columnNames: ['provider_id'],
        referencedTableName: 'providers',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'FK_social_posts_provider_id',
      },
      {
        tableName: 'social_posts',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        name: 'FK_social_posts_event_id',
      },
    ];

    for (const spec of specs) {
      await this.replaceForeignKey(queryRunner, spec);
    }
  }
}
