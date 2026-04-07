import dataSource from '../src/data-source';

/**
 * Delete or nullify orphaned child rows that reference missing users.
 * Run with: `node -r ts-node/register scripts/clean-orphan-users.ts`
 */

async function main() {
  try {
    await dataSource.initialize();

    const actions: Array<{
      table: string;
      cols: string[];
      mode: 'delete' | 'nullify';
    }> = [
      // Child tables first (so deleting parents won't violate other FKs)
      { table: 'post_reactions', cols: ['user_id'], mode: 'delete' },
      { table: 'post_comments', cols: ['author_id'], mode: 'delete' },
      { table: 'post_saves', cols: ['user_id'], mode: 'delete' },
      { table: 'post_reports', cols: ['reporter_id'], mode: 'delete' },
      { table: 'social_posts', cols: ['author_id'], mode: 'delete' },

      { table: 'reviews', cols: ['user_id'], mode: 'delete' },
      { table: 'event_comments', cols: ['user_id'], mode: 'delete' },
      { table: 'place_comments', cols: ['user_id'], mode: 'delete' },
      { table: 'provider_memberships', cols: ['userId'], mode: 'delete' },
      { table: 'trip_plans', cols: ['user_id'], mode: 'delete' },
      {
        table: 'mute_relations',
        cols: ['muter_id', 'muted_id'],
        mode: 'delete',
      },
      { table: 'stories', cols: ['author_id'], mode: 'delete' },
      { table: 'story_views', cols: ['viewer_id'], mode: 'delete' },
      {
        table: 'follow_relations',
        cols: ['follower_id', 'following_id'],
        mode: 'delete',
      },
      { table: 'post_comments', cols: ['author_id'], mode: 'delete' },
      {
        table: 'block_relations',
        cols: ['blocker_id', 'blocked_id'],
        mode: 'delete',
      },
      { table: 'provider_applications', cols: ['user_id'], mode: 'delete' },
      {
        table: 'notifications',
        cols: ['recipient_id', 'actor_id'],
        mode: 'delete',
      },
      { table: 'message_receipts', cols: ['user_id'], mode: 'delete' },
      { table: 'message_reactions', cols: ['user_id'], mode: 'delete' },
      { table: 'messages', cols: ['sender_id'], mode: 'delete' },
      { table: 'conversation_members', cols: ['user_id'], mode: 'delete' },
      // Providers should nullify owner references rather than deleting provider rows
      { table: 'providers', cols: ['owner_user_id'], mode: 'nullify' },
    ];

    for (const a of actions) {
      try {
        const whereClauses = a.cols
          .map(
            (c) =>
              `("${c}" IS NOT NULL AND "${c}" NOT IN (SELECT id FROM users))`,
          )
          .join(' OR ');

        if (a.mode === 'nullify') {
          const col = a.cols[0];
          const selectSql = `SELECT COUNT(*) as cnt FROM "${a.table}" WHERE ${whereClauses}`;
          const sel = await dataSource.query(selectSql);
          const cnt =
            sel && sel[0] ? Number(sel[0].cnt || sel[0].count || 0) : 0;
            `${a.table}: ${cnt} rows will be nullified in column ${col}`,
          );
          if (cnt > 0) {
            const updateSql = `UPDATE "${a.table}" SET "${col}" = NULL WHERE ${whereClauses} RETURNING id`;
            const res = await dataSource.query(updateSql);
              `${a.table}: nullified ${Array.isArray(res) ? res.length : 0} rows`,
            );
          }
        } else {
          const selectSql = `SELECT COUNT(*) as cnt FROM "${a.table}" WHERE ${whereClauses}`;
          const sel = await dataSource.query(selectSql);
          const cnt =
            sel && sel[0] ? Number(sel[0].cnt || sel[0].count || 0) : 0;
          if (cnt > 0) {
            const delSql = `DELETE FROM "${a.table}" WHERE ${whereClauses} RETURNING id`;
            const res = await dataSource.query(delSql);
              `${a.table}: deleted ${Array.isArray(res) ? res.length : 0} rows`,
            );
          }
        }
      } catch (err) {
        console.error(`Error handling table ${a.table}:`, err.message || err);
      }
    }

    // Special handling: if social_posts still has orphaned authors, remove dependent rows first.
    try {
      const orphanPosts = await dataSource.query(
        `SELECT id FROM "social_posts" WHERE "author_id" IS NOT NULL AND "author_id" NOT IN (SELECT id FROM users)`,
      );
      const ids = Array.isArray(orphanPosts)
        ? orphanPosts.map((r: any) => r.id)
        : [];
      if (ids.length > 0) {
          `Found ${ids.length} orphan social_posts, removing dependent rows first`,
        );
        const inList = ids.map((id) => `'${id}'`).join(',');
        const delReacts = `DELETE FROM "post_reactions" WHERE "post_id" IN (${inList}) RETURNING id`;
        const dr = await dataSource.query(delReacts);
          `post_reactions: deleted ${Array.isArray(dr) ? dr.length : 0} rows`,
        );

        const delPComments = `DELETE FROM "post_comments" WHERE "post_id" IN (${inList}) RETURNING id`;
        const dpc = await dataSource.query(delPComments);
          `post_comments: deleted ${Array.isArray(dpc) ? dpc.length : 0} rows`,
        );

        const delPSaves = `DELETE FROM "post_saves" WHERE "post_id" IN (${inList}) RETURNING id`;
        const dps = await dataSource.query(delPSaves);
          `post_saves: deleted ${Array.isArray(dps) ? dps.length : 0} rows`,
        );

        const delPosts = `DELETE FROM "social_posts" WHERE id IN (${inList}) RETURNING id`;
        const dp = await dataSource.query(delPosts);
          `social_posts: deleted ${Array.isArray(dp) ? dp.length : 0} rows`,
        );
      }
    } catch (err) {
      console.error(
        'Error cleaning dependent social_posts data:',
        err.message || err,
      );
    }

    await dataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    try {
      await dataSource.destroy();
    } catch (_) {}
    process.exit(1);
  }
}

void main();
