import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1775340015618 implements MigrationInterface {
    name = 'InitialMigration1775340015618'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event_comments" ADD CONSTRAINT "FK_d8a347b4d500000f8e2d4c9483e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "place_comments" ADD CONSTRAINT "FK_629c8d1ff2746d86fc2c6d7b39a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "providers" ADD CONSTRAINT "FK_1bb0cb5f05f1d799c71f4458d23" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "provider_memberships" ADD CONSTRAINT "FK_074c2e2e8fdd9bca6c19dd681d0" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_plans" ADD CONSTRAINT "FK_72b33aa65effd62c8f77f760280" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mute_relations" ADD CONSTRAINT "FK_e3619104939bd6a0232ddc12574" FOREIGN KEY ("muter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mute_relations" ADD CONSTRAINT "FK_34c52bcd9b2a3f59e3edc478182" FOREIGN KEY ("muted_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stories" ADD CONSTRAINT "FK_1e6ca6b1e366a7575873f2d1c30" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "story_views" ADD CONSTRAINT "FK_f213043b37f8aa8ea54b1b262ce" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "follow_relations" ADD CONSTRAINT "FK_838a6ff4848d336eefed6eb5ba3" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "follow_relations" ADD CONSTRAINT "FK_ae0637b5398e3c281424f07bbd8" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "social_posts" ADD CONSTRAINT "FK_30df44dde898e11065a2437328d" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "post_comments" ADD CONSTRAINT "FK_abbd11ae09b9fe33103b6c1e6ad" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "post_reports" ADD CONSTRAINT "FK_2f5dd8c4bd4db94e6da3c5833e2" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "post_reactions" ADD CONSTRAINT "FK_8268cd23ab20dcef2bfd3cbada0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "post_saves" ADD CONSTRAINT "FK_6a7514ae4838468521daef6bdf9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "block_relations" ADD CONSTRAINT "FK_c5c900e26f41a8bedb6208a8d48" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "block_relations" ADD CONSTRAINT "FK_21e11a25e89fc65de3eee0b6ae3" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "provider_applications" ADD CONSTRAINT "FK_eba05ee9702912bfa7c2a5267da" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_5332a4daa46fd3f4e6625dd275d" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_20f8b51fd9655c0b69feed5efc6" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_receipts" ADD CONSTRAINT "FK_935514fcba2f588fd9ac9fb51a1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_reactions" ADD CONSTRAINT "FK_b6d3eda2f99b64016d6a4cf112f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation_members" ADD CONSTRAINT "FK_a46c76be8f62c4b00a835cdc370" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversation_members" DROP CONSTRAINT "FK_a46c76be8f62c4b00a835cdc370"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"`);
        await queryRunner.query(`ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_b6d3eda2f99b64016d6a4cf112f"`);
        await queryRunner.query(`ALTER TABLE "message_receipts" DROP CONSTRAINT "FK_935514fcba2f588fd9ac9fb51a1"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_20f8b51fd9655c0b69feed5efc6"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_5332a4daa46fd3f4e6625dd275d"`);
        await queryRunner.query(`ALTER TABLE "provider_applications" DROP CONSTRAINT "FK_eba05ee9702912bfa7c2a5267da"`);
        await queryRunner.query(`ALTER TABLE "block_relations" DROP CONSTRAINT "FK_21e11a25e89fc65de3eee0b6ae3"`);
        await queryRunner.query(`ALTER TABLE "block_relations" DROP CONSTRAINT "FK_c5c900e26f41a8bedb6208a8d48"`);
        await queryRunner.query(`ALTER TABLE "post_saves" DROP CONSTRAINT "FK_6a7514ae4838468521daef6bdf9"`);
        await queryRunner.query(`ALTER TABLE "post_reactions" DROP CONSTRAINT "FK_8268cd23ab20dcef2bfd3cbada0"`);
        await queryRunner.query(`ALTER TABLE "post_reports" DROP CONSTRAINT "FK_2f5dd8c4bd4db94e6da3c5833e2"`);
        await queryRunner.query(`ALTER TABLE "post_comments" DROP CONSTRAINT "FK_abbd11ae09b9fe33103b6c1e6ad"`);
        await queryRunner.query(`ALTER TABLE "social_posts" DROP CONSTRAINT "FK_30df44dde898e11065a2437328d"`);
        await queryRunner.query(`ALTER TABLE "follow_relations" DROP CONSTRAINT "FK_ae0637b5398e3c281424f07bbd8"`);
        await queryRunner.query(`ALTER TABLE "follow_relations" DROP CONSTRAINT "FK_838a6ff4848d336eefed6eb5ba3"`);
        await queryRunner.query(`ALTER TABLE "story_views" DROP CONSTRAINT "FK_f213043b37f8aa8ea54b1b262ce"`);
        await queryRunner.query(`ALTER TABLE "stories" DROP CONSTRAINT "FK_1e6ca6b1e366a7575873f2d1c30"`);
        await queryRunner.query(`ALTER TABLE "mute_relations" DROP CONSTRAINT "FK_34c52bcd9b2a3f59e3edc478182"`);
        await queryRunner.query(`ALTER TABLE "mute_relations" DROP CONSTRAINT "FK_e3619104939bd6a0232ddc12574"`);
        await queryRunner.query(`ALTER TABLE "trip_plans" DROP CONSTRAINT "FK_72b33aa65effd62c8f77f760280"`);
        await queryRunner.query(`ALTER TABLE "provider_memberships" DROP CONSTRAINT "FK_074c2e2e8fdd9bca6c19dd681d0"`);
        await queryRunner.query(`ALTER TABLE "providers" DROP CONSTRAINT "FK_1bb0cb5f05f1d799c71f4458d23"`);
        await queryRunner.query(`ALTER TABLE "place_comments" DROP CONSTRAINT "FK_629c8d1ff2746d86fc2c6d7b39a"`);
        await queryRunner.query(`ALTER TABLE "event_comments" DROP CONSTRAINT "FK_d8a347b4d500000f8e2d4c9483e"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf"`);
    }

}
