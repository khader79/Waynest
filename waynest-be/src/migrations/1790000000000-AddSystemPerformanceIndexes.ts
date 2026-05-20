import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSystemPerformanceIndexes1790000000000 implements MigrationInterface {
  name = 'AddSystemPerformanceIndexes1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = async (tableName: string) => {
      const exists = await queryRunner.query(
        `SELECT to_regclass('public.${tableName}') as name`,
      );
      return !!exists?.[0]?.name;
    };

    const statements: Array<[string, string]> = [
      [
        'social_posts',
        `CREATE INDEX IF NOT EXISTS "idx_social_posts_author_created" ON "social_posts" ("author_id", "createdAt" DESC)`,
      ],
      [
        'social_posts',
        `CREATE INDEX IF NOT EXISTS "idx_social_posts_visibility_created" ON "social_posts" ("visibility", "createdAt" DESC)`,
      ],
      [
        'social_posts',
        `CREATE INDEX IF NOT EXISTS "idx_social_posts_provider_created" ON "social_posts" ("provider_id", "createdAt" DESC)`,
      ],
      [
        'social_posts',
        `CREATE INDEX IF NOT EXISTS "idx_social_posts_trip_plan" ON "social_posts" ("trip_plan_id")`,
      ],
      [
        'post_reactions',
        `CREATE INDEX IF NOT EXISTS "idx_post_reactions_post_user" ON "post_reactions" ("post_id", "user_id")`,
      ],
      [
        'post_comments',
        `CREATE INDEX IF NOT EXISTS "idx_post_comments_post_created" ON "post_comments" ("post_id", "createdAt" DESC)`,
      ],
      [
        'post_comments',
        `CREATE INDEX IF NOT EXISTS "idx_post_comments_parent" ON "post_comments" ("parent_id")`,
      ],
      [
        'post_saves',
        `CREATE INDEX IF NOT EXISTS "idx_post_saves_post_user" ON "post_saves" ("post_id", "user_id")`,
      ],
      [
        'post_reports',
        `CREATE INDEX IF NOT EXISTS "idx_post_reports_post_reporter" ON "post_reports" ("post_id", "reporter_id")`,
      ],
      [
        'notifications',
        `CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_created" ON "notifications" ("recipient_id", "createdAt" DESC)`,
      ],
      [
        'notifications',
        `CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_read" ON "notifications" ("recipient_id", "is_read")`,
      ],
      [
        'follow_relations',
        `CREATE INDEX IF NOT EXISTS "idx_follow_relations_follower_following" ON "follow_relations" ("follower_id", "following_id")`,
      ],
      [
        'follow_relations',
        `CREATE INDEX IF NOT EXISTS "idx_follow_relations_following_created" ON "follow_relations" ("following_id", "createdAt" DESC)`,
      ],
      [
        'block_relations',
        `CREATE INDEX IF NOT EXISTS "idx_block_relations_blocker_blocked" ON "block_relations" ("blocker_id", "blocked_id")`,
      ],
      [
        'mute_relations',
        `CREATE INDEX IF NOT EXISTS "idx_mute_relations_muter_muted" ON "mute_relations" ("muter_id", "muted_id")`,
      ],
      [
        'friendships',
        `CREATE INDEX IF NOT EXISTS "idx_friendships_pair_status" ON "friendships" ("user_low_id", "user_high_id", "status")`,
      ],
      [
        'stories',
        `CREATE INDEX IF NOT EXISTS "idx_stories_author_created" ON "stories" ("author_id", "createdAt" DESC)`,
      ],
      [
        'stories',
        `CREATE INDEX IF NOT EXISTS "idx_stories_expires" ON "stories" ("expires_at")`,
      ],
      [
        'story_views',
        `CREATE INDEX IF NOT EXISTS "idx_story_views_story_viewer" ON "story_views" ("story_id", "viewer_id")`,
      ],
      [
        'reviews',
        `CREATE INDEX IF NOT EXISTS "idx_reviews_place_status" ON "reviews" ("place_id", "status")`,
      ],
      [
        'reviews',
        `CREATE INDEX IF NOT EXISTS "idx_reviews_event_status" ON "reviews" ("event_id", "status")`,
      ],
      [
        'place_comments',
        `CREATE INDEX IF NOT EXISTS "idx_place_comments_place_created" ON "place_comments" ("place_id", "createdAt" DESC)`,
      ],
      [
        'place_comments',
        `CREATE INDEX IF NOT EXISTS "idx_place_comments_parent" ON "place_comments" ("parent_id")`,
      ],
      [
        'event_comments',
        `CREATE INDEX IF NOT EXISTS "idx_event_comments_event_created" ON "event_comments" ("event_id", "createdAt" DESC)`,
      ],
      [
        'event_comments',
        `CREATE INDEX IF NOT EXISTS "idx_event_comments_parent" ON "event_comments" ("parent_id")`,
      ],
      [
        'conversation_members',
        `CREATE INDEX IF NOT EXISTS "idx_conversation_members_user" ON "conversation_members" ("user_id")`,
      ],
      [
        'conversation_members',
        `CREATE INDEX IF NOT EXISTS "idx_conversation_members_conversation_user" ON "conversation_members" ("conversation_id", "user_id")`,
      ],
      [
        'messages',
        `CREATE INDEX IF NOT EXISTS "idx_messages_conversation_created" ON "messages" ("conversation_id", "createdAt" DESC)`,
      ],
      [
        'messages',
        `CREATE INDEX IF NOT EXISTS "idx_messages_sender_created" ON "messages" ("sender_id", "createdAt" DESC)`,
      ],
      [
        'message_receipts',
        `CREATE INDEX IF NOT EXISTS "idx_message_receipts_message_user" ON "message_receipts" ("message_id", "user_id")`,
      ],
      [
        'message_reactions',
        `CREATE INDEX IF NOT EXISTS "idx_message_reactions_message_user" ON "message_reactions" ("message_id", "user_id")`,
      ],
      [
        'message_reactions',
        `CREATE INDEX IF NOT EXISTS "idx_message_reactions_message" ON "message_reactions" ("message_id")`,
      ],
      [
        'conversations',
        `CREATE INDEX IF NOT EXISTS "idx_conversations_updated" ON "conversations" ("updatedAt" DESC)`,
      ],
    ];

    for (const [tableName, statement] of statements) {
      if (await tableExists(tableName)) {
        await queryRunner.query(statement);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const statements = [
      `DROP INDEX IF EXISTS "idx_conversations_updated"`,
      `DROP INDEX IF EXISTS "idx_message_reactions_message"`,
      `DROP INDEX IF EXISTS "idx_message_reactions_message_user"`,
      `DROP INDEX IF EXISTS "idx_message_receipts_message_user"`,
      `DROP INDEX IF EXISTS "idx_messages_sender_created"`,
      `DROP INDEX IF EXISTS "idx_messages_conversation_created"`,
      `DROP INDEX IF EXISTS "idx_conversation_members_conversation_user"`,
      `DROP INDEX IF EXISTS "idx_conversation_members_user"`,
      `DROP INDEX IF EXISTS "idx_event_comments_parent"`,
      `DROP INDEX IF EXISTS "idx_event_comments_event_created"`,
      `DROP INDEX IF EXISTS "idx_place_comments_parent"`,
      `DROP INDEX IF EXISTS "idx_place_comments_place_created"`,
      `DROP INDEX IF EXISTS "idx_reviews_event_status"`,
      `DROP INDEX IF EXISTS "idx_reviews_place_status"`,
      `DROP INDEX IF EXISTS "idx_story_views_story_viewer"`,
      `DROP INDEX IF EXISTS "idx_stories_expires"`,
      `DROP INDEX IF EXISTS "idx_stories_author_created"`,
      `DROP INDEX IF EXISTS "idx_friendships_pair_status"`,
      `DROP INDEX IF EXISTS "idx_mute_relations_muter_muted"`,
      `DROP INDEX IF EXISTS "idx_block_relations_blocker_blocked"`,
      `DROP INDEX IF EXISTS "idx_follow_relations_following_created"`,
      `DROP INDEX IF EXISTS "idx_follow_relations_follower_following"`,
      `DROP INDEX IF EXISTS "idx_notifications_recipient_read"`,
      `DROP INDEX IF EXISTS "idx_notifications_recipient_created"`,
      `DROP INDEX IF EXISTS "idx_post_reports_post_reporter"`,
      `DROP INDEX IF EXISTS "idx_post_saves_post_user"`,
      `DROP INDEX IF EXISTS "idx_post_comments_parent"`,
      `DROP INDEX IF EXISTS "idx_post_comments_post_created"`,
      `DROP INDEX IF EXISTS "idx_post_reactions_post_user"`,
      `DROP INDEX IF EXISTS "idx_social_posts_trip_plan"`,
      `DROP INDEX IF EXISTS "idx_social_posts_provider_created"`,
      `DROP INDEX IF EXISTS "idx_social_posts_visibility_created"`,
      `DROP INDEX IF EXISTS "idx_social_posts_author_created"`,
    ];

    for (const statement of statements) {
      await queryRunner.query(statement);
    }
  }
}
