# Subscription & Credit System - API Documentation

## Authentication

All endpoints require JWT authentication (except GET `/api/plans`).

## Plans & Subscriptions

### List Plans

```
GET /api/plans
```

Response:

```json
[
  {
    "id": "uuid",
    "slug": "free",
    "name": "Free",
    "monthlyCredits": 50,
    "priceCents": 0,
    "features": {
      "trip_plans_per_month": 2,
      "ai_chat": true,
      "unlimited_trip_plans": false,
      "unlimited_ai_chat": false
    }
  }
]
```

### Get Current User Subscription

```
GET /api/plans/me
Authorization: Bearer <jwt_token>
```

## Credits

### Get Current Balance

```
GET /api/credits
Authorization: Bearer <jwt_token>
```

Response:

```json
{
  "id": "uuid",
  "balance": "1000",
  "reserved": "0",
  "monthlyQuota": 2000,
  "lastResetAt": "2026-04-01T00:05:00Z"
}
```

### Get Available Balance (balance - reserved)

```
GET /api/credits/available
Authorization: Bearer <jwt_token>
```

### List Credit Transactions

```
GET /api/credits/transactions
Authorization: Bearer <jwt_token>
```

Response:

```json
[
  {
    "id": "uuid",
    "amount": "-10",
    "type": "CONSUMPTION",
    "metadata": {
      "feature": "ai_chat",
      "context": {}
    },
    "createdAt": "2026-05-08T10:00:00Z"
  }
]
```

### Charge Credits

```
POST /api/credits/charge
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 10,
  "feature": "ai_chat"
}
```

Response (success):

```json
{
  "id": "tx-uuid",
  "amount": "-10",
  "type": "CONSUMPTION"
}
```

Response (failure):

```json
{
  "statusCode": 400,
  "message": "Insufficient credits"
}
```

## Admin Endpoints

### Seed Plans

```
POST /api/admin/billing/seed-plans
Authorization: Bearer <admin_jwt>
```

### Upgrade User Plan

```
POST /api/admin/billing/users/{userId}/upgrade
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "planId": "plan-uuid"
}
```

### Cancel Subscription

```
POST /api/admin/billing/users/{userId}/cancel-subscription
Authorization: Bearer <admin_jwt>
```

### Grant Credits to User

```
POST /api/admin/billing/users/{userId}/grant-credits
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "amount": 500,
  "reason": "Promo bonus"
}
```

### Get User Balance

```
GET /api/admin/billing/users/{userId}/balance
Authorization: Bearer <admin_jwt>
```

Response:

```json
{
  "balance": "1000",
  "available": "950"
}
```

### Get User Billing History

```
GET /api/admin/billing/users/{userId}/billing-history?limit=50
Authorization: Bearer <admin_jwt>
```

### Get Audit Logs

```
GET /api/admin/billing/audit-logs?targetType=SUBSCRIPTION&action=UPGRADE_PLAN&limit=100
Authorization: Bearer <admin_jwt>
```

## Usage Analytics

### Get User Usage

```
GET /api/usage?daysBack=30
Authorization: Bearer <jwt_token>
```

### Get Usage by Feature

```
GET /api/usage/by-feature?daysBack=30
Authorization: Bearer <jwt_token>
```

Response:

```json
{
  "ai_chat": {
    "count": 50,
    "totalCredits": 500
  },
  "ai_generation": {
    "count": 10,
    "totalCredits": 200
  }
}
```

### Get Daily Usage Stats

```
GET /api/usage/daily?daysBack=30
Authorization: Bearer <jwt_token>
```

Response:

```json
{
  "2026-05-08": {
    "count": 20,
    "totalCredits": 150
  },
  "2026-05-07": {
    "count": 15,
    "totalCredits": 100
  }
}
```

## Guards & Decorators

### SubscriptionGuard

Ensures user has active subscription.

```typescript
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Get('feature')
premium() { ... }
```

### FeatureGuard + @RequiresFeature

Checks if feature is enabled for user.

```typescript
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequiresFeature('ai_chat')
@Get('ai-chat')
aiChat() { ... }
```

### CreditGuard + @RequiresCredits

Pre-checks if user has sufficient credits.

```typescript
@UseGuards(JwtAuthGuard, CreditGuard)
@RequiresCredits(10)
@Post('ai-chat')
aiChat(@Body() body: ChatRequest) { ... }
```

## Credit Pricing (Example)

| Operation        | Cost |
| ---------------- | ---- |
| Chat message     | 1    |
| AI trip plan gen | 10   |
| Image analysis   | 20   |
| API call         | 5    |
| Export trip      | 15   |

## Monthly Reset

- Runs automatically at 00:05 UTC on the 1st of each month
- Resets balance to `plan.monthlyCredits`
- If `rolloverAllowed`, excess credits from previous month carry over

## Stripe Integration (Future)

When Stripe is integrated:

1. POST `/api/billing/checkout` → creates Stripe session
2. `POST /api/billing/webhooks/stripe` → webhook handler
3. Subscription status updated via webhook
4. Auto-charge on renewal

## Error Codes

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| 400  | Insufficient credits, invalid plan            |
| 401  | Missing/invalid JWT                           |
| 403  | Insufficient permissions, feature not allowed |
| 404  | Resource not found                            |
| 409  | Conflict (e.g., already has subscription)     |
| 500  | Server error                                  |
