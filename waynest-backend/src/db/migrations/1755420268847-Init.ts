import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1755420268847 implements MigrationInterface {
    name = 'Init1755420268847'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "test" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "test"`);
    }

}
