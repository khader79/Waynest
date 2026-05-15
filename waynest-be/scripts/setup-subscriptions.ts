import dataSource from '../src/data-source';
import { Plan } from '../src/modules/subscriptions/entities/plan.entity';

async function main() {
  console.log('Initializing data source...');
  await dataSource.initialize();
  const plansRepo = dataSource.getRepository(Plan);

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

  const results: any[] = [];
  for (const slug of Object.keys(desired)) {
    console.log('Processing plan', slug);
    const plan = await plansRepo.findOne({ where: { slug } as any });
    if (!plan) {
      console.warn('Plan not found:', slug);
      results.push({ slug, updated: false, reason: 'not found' });
      continue;
    }
    plan.features = { ...(plan.features || {}), ...desired[slug] };
    plan.monthlyCredits = desired[slug].monthlyCredits ?? plan.monthlyCredits;
    await plansRepo.save(plan);
    results.push({ slug, updated: true });
  }

  console.log('Done. Results:');
  console.log(JSON.stringify(results, null, 2));
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Error running setup-subscriptions:', err);
  process.exit(1);
});
