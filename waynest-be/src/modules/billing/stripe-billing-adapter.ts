import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import StripeLib from 'stripe';
import { BillingProvider } from './billing-adapter';
import {
  BillingHistory,
  BillingStatus,
} from './entities/billing-history.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import {
  Subscription as SubEntity,
  SubscriptionStatus,
} from '../subscriptions/entities/subscription.entity';
import { Plan } from '../subscriptions/entities/plan.entity';
import { User } from '../users/entities/user.entity';
import { CreditEngineService } from '../credits/credit-engine.service';

@Injectable()
export class StripeBillingAdapter implements BillingProvider {
  name = 'stripe';

  private readonly logger = new Logger(StripeBillingAdapter.name);
  private readonly stripe: any;
  private readonly webhookSecret: string;
  private readonly frontendUrl: string;

  constructor(
    config: ConfigService,
    @InjectRepository(SubEntity)
    private subsRepo: Repository<SubEntity>,
    @InjectRepository(Plan)
    private plansRepo: Repository<Plan>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(BillingHistory)
    private historyRepo: Repository<BillingHistory>,
    private creditEngine: CreditEngineService,
  ) {
    const secretKey = config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — Stripe adapter is inactive',
      );
      this.stripe = null;
    } else {
      this.stripe = new StripeLib(secretKey);
    }
    this.webhookSecret =
      config.get<string>('STRIPE_WEBHOOK_SECRET')?.trim() || '';
    this.frontendUrl =
      config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  async createCheckoutSession(
    userId: string,
    planId: string,
  ): Promise<{ sessionUrl: string; sessionId: string }> {
    if (!this.stripe) throw new Error('Stripe is not configured');

    const plan = await this.plansRepo.findOne({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');
    if (!plan.stripePriceId) throw new Error('Plan has no Stripe price ID');

    const user = { id: userId } as User;
    const sub = await this.subsRepo.findOne({
      where: { user },
      relations: ['plan'],
    });
    let customerId: string | undefined = sub?.providerCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: { userId, planId },
      success_url: `${this.frontendUrl}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/billing`,
      subscription_data: {
        metadata: { userId, planId },
      },
    });

    if (sub) {
      sub.providerCustomerId = customerId;
      await this.subsRepo.save(sub);
    }

    if (!session.url) throw new Error('Stripe session URL is null');

    return { sessionUrl: session.url, sessionId: session.id };
  }

  async handleWebhook(payload: {
    body: string;
    headers: Record<string, any>;
  }): Promise<{ success: boolean; subscription?: any }> {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured — cannot handle webhook');
      return { success: false };
    }

    const sig = payload.headers?.['stripe-signature'] as string;
    if (!sig) {
      this.logger.warn('Missing stripe-signature header');
      return { success: false };
    }

    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload.body,
        sig,
        this.webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      return { success: false };
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        await this.handleCheckoutCompleted(event.data.object);
        break;
      }
      case 'invoice.paid': {
        await this.handleInvoicePaid(event.data.object);
        break;
      }
      case 'invoice.payment_failed': {
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      }
      case 'customer.subscription.updated': {
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      }
      case 'customer.subscription.deleted': {
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      }
      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }

    return { success: true };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    if (!this.stripe) throw new Error('Stripe is not configured');
    await this.stripe.subscriptions.cancel(providerSubscriptionId);
    this.logger.log(`Cancelled Stripe subscription: ${providerSubscriptionId}`);
  }

  private async handleCheckoutCompleted(session: any) {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    if (!userId || !planId || !subscriptionId) {
      this.logger.warn('Checkout session missing metadata', {
        sessionId: session.id,
      });
      return;
    }

    const user = { id: userId } as User;
    let sub = await this.subsRepo.findOne({
      where: { user },
      relations: ['plan'],
    });
    const plan = await this.plansRepo.findOne({ where: { id: planId } });

    if (!plan) {
      this.logger.error(`Plan not found: ${planId}`);
      return;
    }

    if (sub) {
      sub.plan = plan;
      sub.status = SubscriptionStatus.ACTIVE;
      sub.providerSubscriptionId = subscriptionId;
      sub.providerCustomerId = customerId;
      sub.currentPeriodStart = new Date();
      sub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await this.subsRepo.save(sub);
    } else {
      sub = this.subsRepo.create({
        user,
        plan,
        status: SubscriptionStatus.ACTIVE,
        providerSubscriptionId: subscriptionId,
        providerCustomerId: customerId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await this.subsRepo.save(sub);
    }

    await this.recordBillingEvent(
      userId,
      sub.id,
      'stripe',
      plan.priceCents,
      'SUCCEEDED',
      session.id,
    );

    // Grant monthly credits to wallet
    try {
      const currentBalance = await this.creditEngine.getBalance(userId);
      const quota = BigInt(plan.monthlyCredits);
      if (BigInt(currentBalance || '0') < quota) {
        const topUp = Number(quota - BigInt(currentBalance || '0'));
        if (topUp > 0) {
          await this.creditEngine.grant(
            userId,
            topUp,
            { planId: plan.id, referenceId: `checkout_${session.id}` },
            `Monthly credit allocation for ${plan.name}`,
          );
          this.logger.log(
            `Granted ${topUp} credits to user ${userId} for plan ${planId}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to grant credits for user ${userId}: ${err.message}`,
      );
    }

    this.logger.log(
      `Subscription activated for user ${userId}, plan ${planId}`,
    );
  }

  private async handleInvoicePaid(stripeInvoice: any) {
    const subscriptionId = stripeInvoice.subscription as string;
    const sub = await this.subsRepo.findOne({
      where: { providerSubscriptionId: subscriptionId },
      relations: ['user'],
    });
    if (!sub) {
      this.logger.warn(
        `No local subscription for Stripe sub: ${subscriptionId}`,
      );
      return;
    }

    const existingInvoice = await this.invoiceRepo.findOne({
      where: { providerInvoiceId: stripeInvoice.id },
    });
    if (existingInvoice) {
      existingInvoice.status = InvoiceStatus.PAID;
      existingInvoice.amountPaidCents = stripeInvoice.amount_paid;
      existingInvoice.paidAt = stripeInvoice.status_transitions?.paid_at
        ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
        : new Date();
      await this.invoiceRepo.save(existingInvoice);
    } else {
      const invoice = this.invoiceRepo.create({
        user: sub.user,
        subscription: sub,
        providerInvoiceId: stripeInvoice.id,
        provider: 'stripe',
        amountCents: stripeInvoice.amount_due,
        amountPaidCents: stripeInvoice.amount_paid,
        currency: stripeInvoice.currency,
        status: InvoiceStatus.PAID,
        paidAt: stripeInvoice.status_transitions?.paid_at
          ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
          : new Date(),
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
        invoicePdfUrl: stripeInvoice.invoice_pdf,
      });
      await this.invoiceRepo.save(invoice);
    }

    if (stripeInvoice.period_start && stripeInvoice.period_end) {
      sub.currentPeriodStart = new Date(stripeInvoice.period_start * 1000);
      sub.currentPeriodEnd = new Date(stripeInvoice.period_end * 1000);
      sub.status = SubscriptionStatus.ACTIVE;
      await this.subsRepo.save(sub);
    }

    await this.recordBillingEvent(
      sub.user.id,
      sub.id,
      'stripe',
      stripeInvoice.amount_paid,
      'SUCCEEDED',
      stripeInvoice.id,
    );

    this.logger.log(`Invoice paid: ${stripeInvoice.id}`);
  }

  private async handleInvoicePaymentFailed(stripeInvoice: any) {
    const subscriptionId = stripeInvoice.subscription as string;
    const sub = await this.subsRepo.findOne({
      where: { providerSubscriptionId: subscriptionId },
      relations: ['user'],
    });
    if (!sub) return;

    sub.status = SubscriptionStatus.PAST_DUE;
    await this.subsRepo.save(sub);

    await this.recordBillingEvent(
      sub.user.id,
      sub.id,
      'stripe',
      stripeInvoice.amount_due,
      'FAILED',
      stripeInvoice.id,
    );

    this.logger.warn(`Invoice payment failed: ${stripeInvoice.id}`);
  }

  private async handleSubscriptionUpdated(stripeSub: any) {
    const sub = await this.subsRepo.findOne({
      where: { providerSubscriptionId: stripeSub.id },
      relations: ['plan', 'user'],
    });
    if (!sub) {
      this.logger.warn(`No local sub for Stripe sub: ${stripeSub.id}`);
      return;
    }

    switch (stripeSub.status) {
      case 'active':
      case 'trialing':
        sub.status =
          stripeSub.status === 'trialing'
            ? SubscriptionStatus.TRIALING
            : SubscriptionStatus.ACTIVE;
        break;
      case 'past_due':
        sub.status = SubscriptionStatus.PAST_DUE;
        break;
      case 'canceled':
        sub.status = SubscriptionStatus.CANCELLED;
        break;
      case 'paused':
        sub.status = SubscriptionStatus.PAUSED;
        break;
    }

    if (stripeSub.current_period_start) {
      sub.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
    }
    if (stripeSub.current_period_end) {
      sub.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
    }

    await this.subsRepo.save(sub);
    this.logger.log(`Subscription synced: ${stripeSub.id} -> ${sub.status}`);
  }

  private async handleSubscriptionDeleted(stripeSub: any) {
    const sub = await this.subsRepo.findOne({
      where: { providerSubscriptionId: stripeSub.id },
    });
    if (!sub) return;

    sub.status = SubscriptionStatus.CANCELLED;
    await this.subsRepo.save(sub);

    this.logger.log(`Subscription cancelled via Stripe: ${stripeSub.id}`);
  }

  private async recordBillingEvent(
    userId: string,
    subscriptionId: string | null,
    provider: string,
    amountCents: number,
    status: string,
    providerChargeId?: string,
  ) {
    const entry = this.historyRepo.create({
      user: { id: userId } as any,
      subscription: subscriptionId ? ({ id: subscriptionId } as any) : null,
      provider,
      amountCents,
      status: status as any,
      providerChargeId,
    });
    await this.historyRepo.save(entry as any);
  }
}
