# Subscription & Credit System - Implementation Guide

## Overview

Complete, production-ready SaaS monetization system for Waynest including subscription plans, credit-based AI usage tracking, and feature access control.

## Architecture

### Core Components

1. **Plans Module** (`subscriptions/`)
   - Defines pricing tiers: Free, Pro, Ultra
   - Feature gating via `features` jsonb
   - One-to-many relationship with subscriptions

2. **Subscriptions Module** (`subscriptions/`)
   - Manages user subscription lifecycle
   - Statuses: ACTIVE, PAST_DUE, CANCELLED, TRIALING, PAUSED
   - Period tracking for billing cycles
   - Multi-seat support (teams)

3. **Credits Module** (`credits/`)
   - `CreditEngineService`: atomic, transactional credit operations
   - `CreditWallet`: user's balance (including reserved credits)
   - `CreditTransaction`: immutable transaction history
   - Features:
     - Pessimistic locking to prevent race conditions
     - Reservation/commit pattern for long-running operations
     - Refund support

4. **Features Module** (`features/`)
   - Dynamic feature access control
   - Plan-level defaults + user-level overrides
   - Decorator-based guards for route protection

5. **Usage Module** (`usage/`)
   - `UsageLog`: immutable consumption records
   - Analytics queries (by feature, by day)
   - Audit trail for compliance

6. **Billing Module** (`billing/`)
   - `BillingService`: subscription lifecycle
   - `BillingAdapter`: provider-agnostic interface (Stripe, PayPal)
   - `BillingHistory`: payment records

7. **Admin Module** (`admin/`)
   - Plan seeding
   - User subscription management
   - Manual credit grants with audit trails
   - Billing & audit log queries

8. **Jobs** (`jobs/`)
   - `MonthlyResetJob`: cron-based monthly credit reset
   - Scheduled via `@nestjs/schedule`

### Data Flow

#### User Signup

1. New user created in `users` table
2. Free plan subscription created (ACTIVE, 30-day period)
3. `CreditWallet` created with `balance = plan.monthlyCredits` and `monthlyQuota = plan.monthlyCredits`
4. Monthly cron (1st at 00:05 UTC) resets balance to `monthlyQuota`

#### AI Operation (e.g., chat)

1. Request hits endpoint with `@RequiresCredits(10)` guard
2. `CreditGuard` checks balance >= 10
3. API endpoint logic:
   - Logs usage: `UsageService.logUsage({ feature: 'ai_chat', costCredits: 10 })`
   - Charges credits: `CreditEngineService.charge(userId, 10, { feature: 'ai_chat' })`
4. Transaction created, balance updated atomically

#### Plan Upgrade

1. Admin/user initiates upgrade
2. `BillingService.upgradeUserPlan(userId, newPlanId)`
3. Subscription record updated
4. Credits top-up: wallet balance set to max(current, plan.monthlyCredits)
5. Audit log records action

#### Monthly Reset (1st of month, 00:05 UTC)

1. Cron fires: `MonthlyResetJob.handle()`
2. Iterate all wallets:
   - Set `balance = plan.monthlyCredits`
   - Create GRANT transaction
   - Update `lastResetAt`
3. At scale: use job queue (BullMQ) for parallelism

### Database Schema

#### `plans`

```
id (uuid PK)
slug (varchar, unique) ← index
name (varchar)
monthlyCredits (int)
priceCents (int)
features (jsonb)
createdAt, updatedAt, deletedAt (soft delete)
```

#### `subscriptions`

```
id (uuid PK)
user_id (uuid FK) ← index
plan_id (uuid FK)
status (enum: ACTIVE|PAST_DUE|CANCELLED|TRIALING|PAUSED)
currentPeriodStart, currentPeriodEnd (timestamptz)
seats (int, for teams)
metadata (jsonb)
createdAt, updatedAt, deletedAt
```

#### `credit_wallets`

```
id (uuid PK)
user_id (uuid FK, unique) ← index
balance (bigint) ← use for high precision
reserved (bigint) ← for pending operations
monthlyQuota (int) ← cached from plan
rolloverAllowed (boolean)
lastResetAt (timestamptz)
createdAt, updatedAt, deletedAt
```

#### `credit_transactions`

```
id (uuid PK)
wallet_id (uuid FK) ← index
user_id (uuid FK) ← index
amount (bigint, signed)
type (enum: CONSUMPTION|GRANT|REFUND|ADJUSTMENT|BONUS)
referenceId (uuid nullable) ← link to usage/charge
metadata (jsonb)
createdAt, updatedAt, deletedAt
```

#### `usage_logs`

```
id (uuid PK)
user_id (uuid FK) ← index
subscription_id (uuid FK nullable)
feature (varchar) ← index
costCredits (int)
context (jsonb)
source (enum: API|WEB|SYSTEM)
createdAt (timestamptz) ← index
```

#### `feature_access`

```
id (uuid PK)
user_id (uuid FK) ← index
featureKey (varchar)
enabled (boolean)
expiresAt (timestamptz nullable)
metadata (jsonb)
createdAt, updatedAt, deletedAt
```

#### `billing_history`

```
id (uuid PK)
user_id (uuid FK) ← index
subscription_id (uuid FK nullable)
provider (varchar) ← 'stripe', 'paypal'
providerChargeId (varchar nullable)
amountCents (int)
status (enum: SUCCEEDED|FAILED|PENDING)
metadata (jsonb)
createdAt, updatedAt, deletedAt
```

#### `audit_logs`

```
id (uuid PK)
actor_id (uuid FK nullable) ← admin user
action (varchar) ← 'UPGRADE_PLAN', 'GRANT_CREDITS', etc.
targetType (varchar) ← 'SUBSCRIPTION', 'USER', 'WALLET'
targetId (uuid nullable)
diff (jsonb) ← before/after
reason (varchar nullable)
createdAt, updatedAt, deletedAt
```

## Integration Points

### 1. Reuse Existing Auth

```typescript
@UseGuards(JwtAuthGuard)  // ← from modules/auth/guards
@Controller('api/credits')
export class CreditsController { ... }
```

### 2. Hook into AI/Chat Operations

```typescript
// In your chat controller:
@UseGuards(JwtAuthGuard, CreditGuard)
@RequiresCredits(1)
@Post('messages')
async createMessage(@Req() req: any, @Body() body: MessageDto) {
  // Pre-deduction: guard checked balance
  await this.creditEngine.charge(req.user.id, 1, { feature: 'chat_message' });
  const msg = await this.chatService.create(body);
  await this.usage.logUsage({
    user: req.user,
    feature: 'chat_message',
    costCredits: 1
  });
  return msg;
}
```

### 3. Optional: Pause Features by Plan

```typescript
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequiresFeature('ai_chat')
@Post('ai-chat')
async aiChat(@Body() body: ChatDto) {
  // Only available if plan has ai_chat=true
  // OR user has feature override enabled
}
```

### 4. Future: Stripe Integration

Replace `StubBillingAdapter` with `StripeAdapter`:

```typescript
const checkoutSession = await stripeAdapter.createCheckoutSession(
  userId,
  planId,
);
// Webhook → BillingService.recordBillingEvent() → update subscription status
```

## Setup & Running

### 1. Install Dependencies

```bash
npm install @nestjs/schedule
```

### 2. Register Modules in `app.module.ts`

```typescript
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { CreditsModule } from './modules/credits/credits.module';
import { FeaturesModule } from './modules/features/features.module';
import { UsageModule } from './modules/usage/usage.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    // ... existing
    SubscriptionsModule,
    CreditsModule,
    FeaturesModule,
    UsageModule,
    BillingModule,
    AdminModule,
    JobsModule,
  ],
})
export class AppModule {}
```

### 3. Run Migration

```bash
npm run migration:run
# or auto-generate: npm run migration:generate -- -n add_subscription_entities
```

### 4. Seed Plans (Auto on Startup)

Plans are auto-seeded via `PlanSeedOnStartup` (calls `PlanSeeder.seed()` on `OnApplicationBootstrap`). 
To re-seed manually:

```bash
POST /api/admin/billing/seed-plans
```

### 5. Test Locally

```bash
npm run test
npm run test:e2e
npm run build
```

## Usage Examples

### Grant Welcome Bonus (Admin)

```bash
POST /api/admin/billing/users/{userId}/grant-credits
{
  "amount": 50,
  "reason": "Welcome bonus"
}
```

### Check Balance

```bash
GET /api/credits
# Response: { balance: "1000", available: "950", monthlyQuota: 2000 }
```

### Charge for Operation

```bash
POST /api/credits/charge
{
  "amount": 10,
  "feature": "ai_generation"
}
```

### Upgrade User

```bash
POST /api/admin/billing/users/{userId}/upgrade
{
  "planId": "<pro-plan-uuid>"
}
```

## Production Checklist

- [ ] DB backup before first migration
- [ ] Test monthly reset job on staging
- [ ] Implement rate limiting on credit endpoints
- [ ] Add monitoring/alerting for failed charges
- [ ] Set up audit log archival (older than 90 days)
- [ ] Prepare Stripe keys in `.env` (future)
- [ ] Configure BullMQ for large-scale monthly resets
- [ ] Add email notifications (upgrade reminders, low credits)
- [ ] Implement refund/chargeback handling
- [ ] Test concurrent charge scenarios (load test)
- [ ] Document credit pricing model (external)

## Future Enhancements

1. **Stripe/PayPal Integration**
   - Implement `StripeAdapter`, `PayPalAdapter`
   - Webhook handlers for payment events
   - Automatic renewal reminders

2. **Team Subscriptions**
   - Multiple users per subscription
   - Seat allocation & overage charging
   - Team credit pooling

3. **Usage-Based Pricing**
   - Custom per-feature pricing by plan
   - Overage charges beyond quota
   - Cost tracking per team/project

4. **Coupons & Referrals**
   - Promo code system
   - Referral bonuses
   - Volume discounts

5. **API Access & Rate Limiting**
   - Separate API tier
   - Per-endpoint rate limits
   - Usage-based billing

6. **Analytics Dashboard**
   - Revenue reports
   - Churn analysis
   - LTV by plan
   - Feature adoption

## Notes

- All balance operations use `bigint` (not `int`) for high precision
- Timestamps use `timestamptz` for UTC
- Soft deletes enabled via `@DeleteDateColumn()`
- Pessimistic locking (`SELECT FOR UPDATE`) ensures no race conditions
- Transactions are atomic; if any step fails, entire operation rolls back
- Admin endpoints require `ADMIN` role (via existing `RoleGuard`)
