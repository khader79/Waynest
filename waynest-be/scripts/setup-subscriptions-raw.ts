import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  console.log('Connecting to DB...');
  const client = await pool.connect();
  try {
    const plans: { slug: string; features: any; monthly_credits: number }[] =
      [];

    const desired: Record<string, any> = {
      free: {
        plannerMonthly: 2,
        chatbot: { baseCredits: 5 },
        monthlyCredits: 5,
      },
      standard: {
        plannerMonthly: 10,
        chatbot: { baseCredits: 20 },
        monthlyCredits: 50,
      },
      ultra: {
        plannerMonthly: -1,
        chatbot: { baseCredits: -1 },
        monthlyCredits: 0,
      },
    };

    for (const slug of Object.keys(desired)) {
      const plan = desired[slug];
      console.log('Updating plan', slug);
      const res = await client.query(
        `UPDATE plans SET features = COALESCE(features, '{}'::jsonb) || $1::jsonb, "monthlyCredits" = $2 WHERE slug = $3 RETURNING slug, features, "monthlyCredits"`,
        [JSON.stringify(plan), plan.monthlyCredits, slug],
      );
      if (res.rowCount === 0) {
        console.warn('Plan not found:', slug);
      } else {
        console.log('Updated', res.rows[0]);
      }
    }

    console.log('Granting monthly credits to active subscriptions...');
    const subsRes = await client.query(
      `SELECT s.user_id as user_id, p.slug as slug, p."monthlyCredits" as monthlyCredits FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.status = 'ACTIVE'`,
    );

    for (const r of subsRes.rows) {
      const userId = r.user_id;
      const monthly = Number(r.monthlycredits);
      console.log(
        'Granting for user',
        userId,
        'plan',
        r.slug,
        'monthly',
        monthly,
      );
      const walletRes = await client.query(
        'SELECT * FROM credit_wallets WHERE user_id = $1',
        [userId],
      );
      if (walletRes.rowCount === 0) {
        // create wallet
        const balance = monthly === -1 ? -1 : monthly;
        await client.query(
          `INSERT INTO credit_wallets (user_id, balance, reserved, "monthlyQuota", "rolloverAllowed") VALUES ($1, $2, 0, $3, false)`,
          [userId, String(balance), monthly === -1 ? -1 : monthly],
        );
      } else {
        if (monthly === -1) {
          await client.query(
            `UPDATE credit_wallets SET balance = $1, "monthlyQuota" = $2 WHERE user_id = $3`,
            [String(-1), -1, userId],
          );
        } else {
          await client.query(
            `UPDATE credit_wallets SET balance = (COALESCE(balance::bigint,0) + $1)::bigint::text, "monthlyQuota" = $2 WHERE user_id = $3`,
            [monthly, monthly, userId],
          );
        }
      }
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error running raw setup:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
