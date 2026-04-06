import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchTrgmIndexesConcurrently20260406160000 implements MigrationInterface {
  name = 'AddSearchTrgmIndexesConcurrently20260406160000';
  // Run without a transaction so we can create indexes CONCURRENTLY
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Helper that checks to_regclass and creates index concurrently if missing.
    const createIndexIfMissing = async (indexName: string, sql: string) => {
      const exists = await queryRunner.query(
        `SELECT to_regclass('public.${indexName}') as name`,
      );
      if (!exists || !exists[0] || !exists[0].name) {
        await queryRunner.query(sql);
      }
    };

    await createIndexIfMissing(
      'idx_users_username_trgm',
      `CREATE INDEX CONCURRENTLY idx_users_username_trgm ON users USING gin (lower("username") gin_trgm_ops)`,
    );

    await createIndexIfMissing(
      'idx_users_first_name_trgm',
      `CREATE INDEX CONCURRENTLY idx_users_first_name_trgm ON users USING gin (lower("firstName") gin_trgm_ops)`,
    );

    await createIndexIfMissing(
      'idx_users_last_name_trgm',
      `CREATE INDEX CONCURRENTLY idx_users_last_name_trgm ON users USING gin (lower("lastName") gin_trgm_ops)`,
    );

    await createIndexIfMissing(
      'idx_providers_display_name_trgm',
      `CREATE INDEX CONCURRENTLY idx_providers_display_name_trgm ON providers USING gin (lower("displayName") gin_trgm_ops)`,
    );

    await createIndexIfMissing(
      'idx_providers_slug_trgm',
      `CREATE INDEX CONCURRENTLY idx_providers_slug_trgm ON providers USING gin (lower("slug") gin_trgm_ops)`,
    );

    await createIndexIfMissing(
      'idx_places_name_trgm',
      `CREATE INDEX CONCURRENTLY idx_places_name_trgm ON places USING gin (lower("name") gin_trgm_ops)`,
    );

    await createIndexIfMissing(
      'idx_places_slug_trgm',
      `CREATE INDEX CONCURRENTLY idx_places_slug_trgm ON places USING gin (lower("slug") gin_trgm_ops)`,
    );

    await createIndexIfMissing(
      'idx_events_title_trgm',
      `CREATE INDEX CONCURRENTLY idx_events_title_trgm ON events USING gin (lower("title") gin_trgm_ops)`,
    );

    await createIndexIfMissing(
      'idx_cities_name_trgm',
      `CREATE INDEX CONCURRENTLY idx_cities_name_trgm ON cities USING gin (lower("name") gin_trgm_ops)`,
    );

    await createIndexIfMissing(
      'idx_countries_name_trgm',
      `CREATE INDEX CONCURRENTLY idx_countries_name_trgm ON countries USING gin (lower("name") gin_trgm_ops)`,
    );

    await createIndexIfMissing(
      'idx_providers_active_verified_city',
      `CREATE INDEX CONCURRENTLY idx_providers_active_verified_city ON providers ("isActive", "verificationStatus", "cityId")`,
    );

    await createIndexIfMissing(
      'idx_places_active_city_created',
      `CREATE INDEX CONCURRENTLY idx_places_active_city_created ON places ("isActive", "cityId", "createdAt" DESC)`,
    );

    await createIndexIfMissing(
      'idx_events_active_start_date',
      `CREATE INDEX CONCURRENTLY idx_events_active_start_date ON events ("isActive", "startDate" DESC)`,
    );

    await createIndexIfMissing(
      'idx_block_relations_blocker_id',
      `CREATE INDEX CONCURRENTLY idx_block_relations_blocker_id ON block_relations (blocker_id)`,
    );

    await createIndexIfMissing(
      'idx_block_relations_blocked_id',
      `CREATE INDEX CONCURRENTLY idx_block_relations_blocked_id ON block_relations (blocked_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dropIndexIfExists = async (indexName: string) => {
      const exists = await queryRunner.query(
        `SELECT to_regclass('public.${indexName}') as name`,
      );
      if (exists && exists[0] && exists[0].name) {
        await queryRunner.query(`DROP INDEX CONCURRENTLY ${indexName}`);
      }
    };

    await dropIndexIfExists('idx_block_relations_blocked_id');
    await dropIndexIfExists('idx_block_relations_blocker_id');
    await dropIndexIfExists('idx_events_active_start_date');
    await dropIndexIfExists('idx_places_active_city_created');
    await dropIndexIfExists('idx_providers_active_verified_city');

    const trigramDrops = [
      'idx_countries_name_trgm',
      'idx_cities_name_trgm',
      'idx_events_title_trgm',
      'idx_places_slug_trgm',
      'idx_places_name_trgm',
      'idx_providers_slug_trgm',
      'idx_providers_display_name_trgm',
      'idx_users_last_name_trgm',
      'idx_users_first_name_trgm',
      'idx_users_username_trgm',
    ];

    for (const name of trigramDrops) {
      await dropIndexIfExists(name);
    }
  }
}
