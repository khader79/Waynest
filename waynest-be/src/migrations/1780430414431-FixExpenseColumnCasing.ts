import { MigrationInterface, QueryRunner } from "typeorm";

export class FixExpenseColumnCasing1780430414431 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'totalamount')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'totalAmount') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "totalamount" TO "totalAmount";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'currencycode')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'currencyCode') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "currencycode" TO "currencyCode";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'splitamonguserids')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'splitAmongUserIds') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "splitamonguserids" TO "splitAmongUserIds";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'issettled')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'isSettled') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "issettled" TO "isSettled";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'createdat')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'createdAt') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "createdat" TO "createdAt";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'updatedat')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'updatedAt') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "updatedat" TO "updatedAt";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'deletedat')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'deletedAt') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "deletedat" TO "deletedAt";
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'totalAmount')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'totalamount') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "totalAmount" TO "totalamount";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'currencyCode')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'currencycode') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "currencyCode" TO "currencycode";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'splitAmongUserIds')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'splitamonguserids') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "splitAmongUserIds" TO "splitamonguserids";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'isSettled')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'issettled') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "isSettled" TO "issettled";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'createdAt')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'createdat') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "createdAt" TO "createdat";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'updatedAt')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'updatedat') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "updatedAt" TO "updatedat";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'deletedAt')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_expenses' AND column_name = 'deletedat') THEN
                    ALTER TABLE "trip_expenses" RENAME COLUMN "deletedAt" TO "deletedat";
                END IF;
            END $$;
        `);
    }

}
