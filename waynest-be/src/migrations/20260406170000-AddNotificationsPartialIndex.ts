import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsPartialIndex20260406170000 implements MigrationInterface {
  name = 'AddNotificationsPartialIndex20260406170000';
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure pg_trgm extension exists (safe no-op if already present)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    const tableExists = async (tableName: string) => {
      const exists = await queryRunner.query(
        `SELECT to_regclass('public.${tableName}') as name`,
      );
      return !!exists?.[0]?.name;
    };

    const createIndexIfMissing = async (indexName: string, sql: string) => {
      const exists = await queryRunner.query(
        `SELECT to_regclass('public.${indexName}') as name`,
      );
      if (!exists || !exists[0] || !exists[0].name) {
        await queryRunner.query(sql);
      }
    };

    if (!(await tableExists('notifications'))) {
      return;
    }

    // Partial index for active notifications (deletedAt IS NULL)
    await createIndexIfMissing(
      'idx_notifications_recipient_read_active',
      `CREATE INDEX CONCURRENTLY idx_notifications_recipient_read_active ON notifications (recipient_id, is_read) WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT to_regclass('public.idx_notifications_recipient_read_active') as name`,
    );
    if (exists && exists[0] && exists[0].name) {
      await queryRunner.query(
        `DROP INDEX CONCURRENTLY idx_notifications_recipient_read_active`,
      );
    }
  }
}
