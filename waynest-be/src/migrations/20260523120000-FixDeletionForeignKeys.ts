import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixDeletionForeignKeys20260523120000 implements MigrationInterface {
  name = 'FixDeletionForeignKeys20260523120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const constraints: Array<[string, string]> = [
      [
        'ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_728447781a30bc3fcfe5c2f1cdf"',
        'ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "event_comments" DROP CONSTRAINT IF EXISTS "FK_d8a347b4d500000f8e2d4c9483e"',
        'ALTER TABLE "event_comments" ADD CONSTRAINT "FK_d8a347b4d500000f8e2d4c9483e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "place_comments" DROP CONSTRAINT IF EXISTS "FK_629c8d1ff2746d86fc2c6d7b39a"',
        'ALTER TABLE "place_comments" ADD CONSTRAINT "FK_629c8d1ff2746d86fc2c6d7b39a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "trip_plans" DROP CONSTRAINT IF EXISTS "FK_72b33aa65effd62c8f77f760280"',
        'ALTER TABLE "trip_plans" ADD CONSTRAINT "FK_72b33aa65effd62c8f77f760280" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "mute_relations" DROP CONSTRAINT IF EXISTS "FK_e3619104939bd6a0232ddc12574"',
        'ALTER TABLE "mute_relations" ADD CONSTRAINT "FK_e3619104939bd6a0232ddc12574" FOREIGN KEY ("muter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "mute_relations" DROP CONSTRAINT IF EXISTS "FK_34c52bcd9b2a3f59e3edc478182"',
        'ALTER TABLE "mute_relations" ADD CONSTRAINT "FK_34c52bcd9b2a3f59e3edc478182" FOREIGN KEY ("muted_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "stories" DROP CONSTRAINT IF EXISTS "FK_1e6ca6b1e366a7575873f2d1c30"',
        'ALTER TABLE "stories" ADD CONSTRAINT "FK_1e6ca6b1e366a7575873f2d1c30" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "story_views" DROP CONSTRAINT IF EXISTS "FK_f213043b37f8aa8ea54b1b262ce"',
        'ALTER TABLE "story_views" ADD CONSTRAINT "FK_f213043b37f8aa8ea54b1b262ce" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "follow_relations" DROP CONSTRAINT IF EXISTS "FK_838a6ff4848d336eefed6eb5ba3"',
        'ALTER TABLE "follow_relations" ADD CONSTRAINT "FK_838a6ff4848d336eefed6eb5ba3" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "follow_relations" DROP CONSTRAINT IF EXISTS "FK_ae0637b5398e3c281424f07bbd8"',
        'ALTER TABLE "follow_relations" ADD CONSTRAINT "FK_ae0637b5398e3c281424f07bbd8" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "social_posts" DROP CONSTRAINT IF EXISTS "FK_30df44dde898e11065a2437328d"',
        'ALTER TABLE "social_posts" ADD CONSTRAINT "FK_30df44dde898e11065a2437328d" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "post_comments" DROP CONSTRAINT IF EXISTS "FK_abbd11ae09b9fe33103b6c1e6ad"',
        'ALTER TABLE "post_comments" ADD CONSTRAINT "FK_abbd11ae09b9fe33103b6c1e6ad" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "post_reports" DROP CONSTRAINT IF EXISTS "FK_2f5dd8c4bd4db94e6da3c5833e2"',
        'ALTER TABLE "post_reports" ADD CONSTRAINT "FK_2f5dd8c4bd4db94e6da3c5833e2" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "post_reactions" DROP CONSTRAINT IF EXISTS "FK_8268cd23ab20dcef2bfd3cbada0"',
        'ALTER TABLE "post_reactions" ADD CONSTRAINT "FK_8268cd23ab20dcef2bfd3cbada0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "post_saves" DROP CONSTRAINT IF EXISTS "FK_6a7514ae4838468521daef6bdf9"',
        'ALTER TABLE "post_saves" ADD CONSTRAINT "FK_6a7514ae4838468521daef6bdf9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "block_relations" DROP CONSTRAINT IF EXISTS "FK_c5c900e26f41a8bedb6208a8d48"',
        'ALTER TABLE "block_relations" ADD CONSTRAINT "FK_c5c900e26f41a8bedb6208a8d48" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "block_relations" DROP CONSTRAINT IF EXISTS "FK_21e11a25e89fc65de3eee0b6ae3"',
        'ALTER TABLE "block_relations" ADD CONSTRAINT "FK_21e11a25e89fc65de3eee0b6ae3" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_5332a4daa46fd3f4e6625dd275d"',
        'ALTER TABLE "notifications" ADD CONSTRAINT "FK_5332a4daa46fd3f4e6625dd275d" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_20f8b51fd9655c0b69feed5efc6"',
        'ALTER TABLE "notifications" ADD CONSTRAINT "FK_20f8b51fd9655c0b69feed5efc6" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_22133395bd13b970ccd0c34ab22"',
        'ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "conversation_members" DROP CONSTRAINT IF EXISTS "FK_a46c76be8f62c4b00a835cdc370"',
        'ALTER TABLE "conversation_members" ADD CONSTRAINT "FK_a46c76be8f62c4b00a835cdc370" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_user"',
        'ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_subscription"',
        'ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
      ],
    ];

    for (const [dropSql, addSql] of constraints) {
      await queryRunner.query(dropSql);
      await queryRunner.query(addSql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const constraints: Array<[string, string]> = [
      [
        'ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_subscription"',
        'ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_user"',
        'ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "conversation_members" DROP CONSTRAINT IF EXISTS "FK_a46c76be8f62c4b00a835cdc370"',
        'ALTER TABLE "conversation_members" ADD CONSTRAINT "FK_a46c76be8f62c4b00a835cdc370" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_22133395bd13b970ccd0c34ab22"',
        'ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_20f8b51fd9655c0b69feed5efc6"',
        'ALTER TABLE "notifications" ADD CONSTRAINT "FK_20f8b51fd9655c0b69feed5efc6" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_5332a4daa46fd3f4e6625dd275d"',
        'ALTER TABLE "notifications" ADD CONSTRAINT "FK_5332a4daa46fd3f4e6625dd275d" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "block_relations" DROP CONSTRAINT IF EXISTS "FK_21e11a25e89fc65de3eee0b6ae3"',
        'ALTER TABLE "block_relations" ADD CONSTRAINT "FK_21e11a25e89fc65de3eee0b6ae3" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "block_relations" DROP CONSTRAINT IF EXISTS "FK_c5c900e26f41a8bedb6208a8d48"',
        'ALTER TABLE "block_relations" ADD CONSTRAINT "FK_c5c900e26f41a8bedb6208a8d48" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "post_saves" DROP CONSTRAINT IF EXISTS "FK_6a7514ae4838468521daef6bdf9"',
        'ALTER TABLE "post_saves" ADD CONSTRAINT "FK_6a7514ae4838468521daef6bdf9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "post_reactions" DROP CONSTRAINT IF EXISTS "FK_8268cd23ab20dcef2bfd3cbada0"',
        'ALTER TABLE "post_reactions" ADD CONSTRAINT "FK_8268cd23ab20dcef2bfd3cbada0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "post_reports" DROP CONSTRAINT IF EXISTS "FK_2f5dd8c4bd4db94e6da3c5833e2"',
        'ALTER TABLE "post_reports" ADD CONSTRAINT "FK_2f5dd8c4bd4db94e6da3c5833e2" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "post_comments" DROP CONSTRAINT IF EXISTS "FK_abbd11ae09b9fe33103b6c1e6ad"',
        'ALTER TABLE "post_comments" ADD CONSTRAINT "FK_abbd11ae09b9fe33103b6c1e6ad" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "social_posts" DROP CONSTRAINT IF EXISTS "FK_30df44dde898e11065a2437328d"',
        'ALTER TABLE "social_posts" ADD CONSTRAINT "FK_30df44dde898e11065a2437328d" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "follow_relations" DROP CONSTRAINT IF EXISTS "FK_ae0637b5398e3c281424f07bbd8"',
        'ALTER TABLE "follow_relations" ADD CONSTRAINT "FK_ae0637b5398e3c281424f07bbd8" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "follow_relations" DROP CONSTRAINT IF EXISTS "FK_838a6ff4848d336eefed6eb5ba3"',
        'ALTER TABLE "follow_relations" ADD CONSTRAINT "FK_838a6ff4848d336eefed6eb5ba3" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "story_views" DROP CONSTRAINT IF EXISTS "FK_f213043b37f8aa8ea54b1b262ce"',
        'ALTER TABLE "story_views" ADD CONSTRAINT "FK_f213043b37f8aa8ea54b1b262ce" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "stories" DROP CONSTRAINT IF EXISTS "FK_1e6ca6b1e366a7575873f2d1c30"',
        'ALTER TABLE "stories" ADD CONSTRAINT "FK_1e6ca6b1e366a7575873f2d1c30" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "mute_relations" DROP CONSTRAINT IF EXISTS "FK_34c52bcd9b2a3f59e3edc478182"',
        'ALTER TABLE "mute_relations" ADD CONSTRAINT "FK_34c52bcd9b2a3f59e3edc478182" FOREIGN KEY ("muted_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "mute_relations" DROP CONSTRAINT IF EXISTS "FK_e3619104939bd6a0232ddc12574"',
        'ALTER TABLE "mute_relations" ADD CONSTRAINT "FK_e3619104939bd6a0232ddc12574" FOREIGN KEY ("muter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "trip_plans" DROP CONSTRAINT IF EXISTS "FK_72b33aa65effd62c8f77f760280"',
        'ALTER TABLE "trip_plans" ADD CONSTRAINT "FK_72b33aa65effd62c8f77f760280" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "place_comments" DROP CONSTRAINT IF EXISTS "FK_629c8d1ff2746d86fc2c6d7b39a"',
        'ALTER TABLE "place_comments" ADD CONSTRAINT "FK_629c8d1ff2746d86fc2c6d7b39a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "event_comments" DROP CONSTRAINT IF EXISTS "FK_d8a347b4d500000f8e2d4c9483e"',
        'ALTER TABLE "event_comments" ADD CONSTRAINT "FK_d8a347b4d500000f8e2d4c9483e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
      [
        'ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_728447781a30bc3fcfe5c2f1cdf"',
        'ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      ],
    ];

    for (const [dropSql, addSql] of constraints) {
      await queryRunner.query(dropSql);
      await queryRunner.query(addSql);
    }
  }
}
