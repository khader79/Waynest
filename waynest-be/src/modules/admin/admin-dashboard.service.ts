import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { BillingHistory, BillingStatus } from '../billing/entities/billing-history.entity';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';
import { Plan } from '../subscriptions/entities/plan.entity';
import { CreditTransaction, CreditTransactionType } from '../credits/entities/credit-transaction.entity';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(BillingHistory) private billingRepo: Repository<BillingHistory>,
    @InjectRepository(Subscription) private subsRepo: Repository<Subscription>,
    @InjectRepository(Plan) private plansRepo: Repository<Plan>,
    @InjectRepository(CreditTransaction) private txRepo: Repository<CreditTransaction>,
  ) {}

  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const churnPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      thisMonthUsers,
      lastMonthUsers,
      activeSubs,
      plans,
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      creditsConsumed,
      creditsGrantedThisMonth,
      recentPayments,
      revenueByDay,
      recentLogs,
      mrrResult,
      cancelledLast30,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({ where: { createdAt: MoreThanOrEqual(monthStart) } }),
      this.usersRepo.count({
        where: { createdAt: Between(lastMonthStart, monthStart) as any },
      }),
      this.subsRepo.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.plansRepo.find(),
      this.billingRepo
        .createQueryBuilder('b')
        .select('COALESCE(SUM(b.amountCents), 0)', 'total')
        .where('b.status = :status', { status: BillingStatus.SUCCEEDED })
        .getRawOne<{ total: string }>(),
      this.billingRepo
        .createQueryBuilder('b')
        .select('COALESCE(SUM(b.amountCents), 0)', 'total')
        .where('b.status = :status', { status: BillingStatus.SUCCEEDED })
        .andWhere('b.createdAt >= :start', { start: monthStart })
        .getRawOne<{ total: string }>(),
      this.billingRepo
        .createQueryBuilder('b')
        .select('COALESCE(SUM(b.amountCents), 0)', 'total')
        .where('b.status = :status', { status: BillingStatus.SUCCEEDED })
        .andWhere('b.createdAt >= :start', { start: lastMonthStart })
        .andWhere('b.createdAt < :end', { end: monthStart })
        .getRawOne<{ total: string }>(),
      this.txRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(ABS(CAST(t.amount AS BIGINT))), 0)', 'total')
        .where('t.type = :type', { type: CreditTransactionType.CONSUMPTION })
        .getRawOne<{ total: string }>(),
      this.txRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(CAST(t.amount AS BIGINT)), 0)', 'total')
        .where('t.type IN (:...types)', { types: [CreditTransactionType.GRANT, CreditTransactionType.BONUS, CreditTransactionType.REFUND] })
        .andWhere('t.createdAt >= :start', { start: monthStart })
        .getRawOne<{ total: string }>(),
      this.billingRepo.find({
        where: { status: BillingStatus.SUCCEEDED },
        order: { createdAt: 'DESC' },
        take: 10,
        relations: ['user'],
      }),
      this.billingRepo
        .createQueryBuilder('b')
        .select("DATE(b.createdAt)", 'date')
        .addSelect('COALESCE(SUM(b.amountCents), 0)', 'amount')
        .where('b.status = :status', { status: BillingStatus.SUCCEEDED })
        .andWhere('b.createdAt >= :start', { start: thirtyDaysAgo })
        .groupBy('DATE(b.createdAt)')
        .orderBy('DATE(b.createdAt)', 'ASC')
        .getRawMany<{ date: string; amount: string }>(),
      this.subsRepo.find({
        order: { createdAt: 'DESC' },
        take: 10,
        relations: ['user', 'plan'],
      }),
      this.subsRepo
        .createQueryBuilder('s')
        .select('COALESCE(SUM(p."priceCents"), 0)', 'mrr')
        .innerJoin('s.plan', 'p')
        .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
        .getRawOne<{ mrr: string }>(),
      this.subsRepo.count({
        where: {
          status: SubscriptionStatus.CANCELLED,
          updatedAt: MoreThanOrEqual(churnPeriodStart),
        },
      }),
    ]);

    const planDistribution: Record<string, number> = {};
    const subsByPlan = await this.subsRepo
      .createQueryBuilder('s')
      .select('p.name', 'planName')
      .addSelect('COUNT(s.id)', 'count')
      .innerJoin('s.plan', 'p')
      .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .groupBy('p.name')
      .getRawMany<{ planName: string; count: string }>();
    for (const row of subsByPlan) {
      planDistribution[row.planName] = parseInt(row.count);
    }

    const mrr = parseInt(mrrResult?.mrr || '0');
    const churnRate = activeSubs > 0
      ? parseFloat(((cancelledLast30 / activeSubs) * 100).toFixed(2))
      : 0;

    return {
      revenue: {
        total: parseInt(totalRevenue?.total || '0'),
        thisMonth: parseInt(thisMonthRevenue?.total || '0'),
        lastMonth: parseInt(lastMonthRevenue?.total || '0'),
      },
      users: {
        total: totalUsers,
        thisMonth: thisMonthUsers,
        lastMonth: lastMonthUsers,
      },
      subscriptions: {
        active: activeSubs,
        byPlan: planDistribution,
        totalPlans: plans.length,
        mrr,
        churnRate,
        cancelledLast30,
      },
      credits: {
        totalConsumed: parseInt(creditsConsumed?.total || '0'),
        thisMonthIssued: parseInt(creditsGrantedThisMonth?.total || '0'),
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        user: p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Unknown',
        userId: p.user?.id,
        amountCents: p.amountCents,
        provider: p.provider,
        createdAt: p.createdAt,
      })),
      revenueByDay: revenueByDay.map((r) => ({
        date: r.date,
        amount: parseInt(r.amount),
      })),
      recentSubscriptions: recentLogs.map((s) => ({
        id: s.id,
        user: s.user ? `${s.user.firstName} ${s.user.lastName}` : 'Unknown',
        userId: s.user?.id,
        plan: s.plan?.name || 'Unknown',
        status: s.status,
        createdAt: s.createdAt,
      })),
      timestamp: now.toISOString(),
    };
  }
}
