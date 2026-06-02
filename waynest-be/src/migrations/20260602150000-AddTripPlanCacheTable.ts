import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripPlanCacheTable20260602150000 implements MigrationInterface {
  name = 'AddTripPlanCacheTable20260602150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trip_plan_cache (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prompt_hash     VARCHAR(64) NOT NULL UNIQUE,
        embedding       vector(768),
        prompt_text     TEXT NOT NULL,
        result_json     JSONB NOT NULL,
        destination_name VARCHAR(255),
        days            INTEGER,
        budget          DECIMAL(10, 2),
        persons         INTEGER,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        hit_count       INTEGER DEFAULT 1,
        last_accessed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_trip_cache_hash
      ON trip_plan_cache (prompt_hash)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_trip_cache_embedding
      ON trip_plan_cache
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS trip_plan_cache`);
  }
}
