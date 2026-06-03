# Waynest — Complete Feature Documentation

> A full-stack travel platform combining trip planning, social networking, provider management, and a credit-based billing system.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Backend Features](#backend-features)
- [Frontend Features](#frontend-features)
- [Authentication & Security](#authentication--security)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Real-Time Features](#real-time-features)
- [AI Features](#ai-features)
- [Payment & Billing](#payment--billing)
- [Internationalization](#internationalization)
- [PWA & Offline](#pwa--offline)
- [Deployment](#deployment)

---

## Tech Stack

### Backend (`waynest-be/`)

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js, NestJS v11 (TypeScript) |
| **Database** | PostgreSQL (Neon) |
| **ORM** | TypeORM v0.28 |
| **Auth** | Passport + JWT (httpOnly cookies + Bearer) |
| **Real-Time** | Socket.IO v4 (Redis adapter) |
| **AI** | Google Gemini (`@google/generative-ai`) |
| **Payments** | Stripe v22 |
| **Push** | Web Push API + VAPID |
| **Email** | Nodemailer v8 (Gmail SMTP) |
| **Caching** | Redis + In-memory HotPathCache |
| **Queue** | BullMQ + Redis |
| **Rate Limiting** | `@nestjs/throttler` |
| **API Docs** | Swagger (`@nestjs/swagger`) |
| **Validation** | `class-validator` + `class-transformer` |
| **Security** | Helmet, Compression, CSRF (origin/referer) |
| **Testing** | Jest + Supertest |
| **Deploy** | Vercel (serverless) |

### Frontend (`waynest-FE/`)

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 (JSX) |
| **Build** | Vite v8 |
| **Routing** | React Router DOM v6 (lazy-loaded) |
| **State** | `@tanstack/react-query` |
| **UI** | Ant Design v6 + Custom Design System |
| **Icons** | react-icons (Feather, Heroicons, Ant Design) |
| **HTTP** | Axios v1 |
| **Real-Time** | socket.io-client v4 |
| **i18n** | i18next v25 + react-i18next v16 |
| **Charts** | Recharts |
| **Toasts** | React Toastify v11 |
| **Dates** | dayjs v1 |
| **Fingerprint** | `@fingerprintjs/fingerprintjs` v5 |
| **PWA** | vite-plugin-pwa + custom SW |
| **Offline** | idb (IndexedDB) |
| **Linting** | ESLint v9 |

---

## Backend Features

### 1. Authentication (`auth`)

- **JWT-based login/register** with httpOnly cookies (secure, sameSite lax)
- **Bearer token header** support for API clients
- **Invite system** — admin creates invite tokens; users activate them
- **Role-based access** — `USER`, `PROVIDER`, `ADMIN`
- **Auto free subscription** on registration
- **Email verification** — code-based email confirmation with resend
- **Device tracking** — fingerprint-based allowed devices management
- **Account lockout** — failed login attempt tracking with lock duration
- **Guest tokens** — anonymous trip planning via `x-trip-guest-token`

### 2. Users (`users`)

- Profile CRUD (firstName, lastName, username, avatar, phone, etc.)
- Allowed devices management (list/remove by fingerprint)
- Notification preferences — channel (email, push, in-app) + per-type toggles
- Search visibility toggle (appear in public directory or not)
- Public profile page by ID or username

### 3. Providers (`providers`)

- Business account CRUD — displayName, description, categories, slug, contact info
- **Verification workflow**: `PENDING` → `UNDER_REVIEW` → `VERIFIED / REJECTED / SUSPENDED`
- Public business page (by unique slug)
- Provider dashboard stats (places, events, bookings counts)
- Places and events management under provider scope
- Cover photo + logo upload

### 4. Provider Applications (`provider-applications`)

- Apply-to-be-provider flow with JSONB payload snapshot
- Admin approval/rejection with admin notes
- Status tracking (PENDING / APPROVED / REJECTED)

### 5. Provider Membership (`provider-membership`)

- Team-based provider accounts with roles: `OWNER`, `MANAGER`, `ADMIN`, `STAFF`, `EDITOR`
- Multi-user access to a single provider account

### 6. Places (`place`)

- Full CRUD with 8 types: `HOTEL`, `RESTAURANT`, `ACTIVITY`, `TOUR`, `LANDMARK`, `CAFE`, `PARK`, `SHOP`
- Geo-spatial nearest search (PostGIS `Point`, `ST_Distance`)
- Rating aggregation (average + count)
- Tag classification (M2M with tags)
- City association
- Active/inactive toggle + verified badge
- Image URL + slug-based URL

### 7. Place Pricing (`placepricing`)

- Price per place with currency code
- Person count support (e.g., price per person)

### 8. Place Opening Hours (`place-opening-hours`)

- Weekly schedule per place (dayOfWeek, openTime, closeTime, isClosed)

### 9. Events (`event`)

- Full CRUD with venue (place association)
- Date range (startDate, endDate)
- Ticket availability and pricing
- Active/inactive toggle

### 10. Reviews (`review`)

- Place reviews + event reviews (rating 1–5, comment)
- Comments on reviews (place comments, event comments)
- **Admin moderation**: `PENDING` → `APPROVED / REJECTED`
- Flagging system for inappropriate content
- Unique constraint: one review per user per place/event

### 11. Bookings (`bookings`)

- Create/manage bookings for places
- Status workflow: `PENDING` → `CONFIRMED` → `CANCELLED` → `COMPLETED`
- Person count, total cost, currency, notes
- Provider-side booking management (view all, update status)
- User-side "my bookings" list

### 12. Trip Planner (`trip-planner`)

- **AI-powered itinerary generation** using Google Gemini
- Ground-truth validation pipeline — validates AI output against real DB data
- Cost clamping (ensures realistic pricing)
- Religious places zero-price enforcement
- Anti-hallucination prompt engineering
- **Async job queue** (BullMQ) for non-blocking generation
- Trip plans with: days, budget, persons, city
- **Guest trip planning** — no auth required (guest tokens)
- **Public trip browsing** — browse community trips
- **Trip sharing** — share via unique slug
- **Trip copying** — copy other users' plans
- Calendar auto-creation from trip plans
- AI health check endpoint

### 13. Trip Expenses (`expense`)

- Per-trip expense tracking
- Categories (food, transport, accommodation, activities, etc.)
- Multi-user split (splitWith array)
- Settlement tracking
- Currency support

### 14. Calendar (`calendar`)

- Personal calendar entries (manual: title, date, time, notes)
- **Trip-plan auto-sync** (sourceType: `trip_plan`)
- Share entries with friends
- Friend validation before sharing
- Place association

### 15. Chat / Messaging (`chat`)

- Conversations: 1:1 and group
- Messages with **delivery status**: `pending` → `sent` → `delivered` → `seen`
- **Read receipts** via MessageReceipt entity
- **Message reactions** (emoji)
- Reply-to messages
- Message editing
- Conversation management: pin, mute, archive, leave
- Member roles: `MEMBER`, `ADMIN`
- **WebSocket gateway** (Socket.IO + Redis adapter)
- Typing indicators
- **AI conversation replies** (Gemini-powered bot)

### 16. Social Graph (`social-graph`)

- **Friend system**: send, accept, decline requests
- **Follow/unfollow** users
- **Block/unblock** users
- **Mute/unmute** users
- Relationship state queries
- Connection counts (friends, followers, following)
- Follower/following lists
- Friends list (accepted)

### 17. Social Content (`social-content`)

- **Posts** with visibility: `PUBLIC`, `FOLLOWERS`, `FRIENDS`, `PRIVATE`
- Post-likes (toggle on/off)
- Post saves (bookmark)
- Comments on posts
- Post reports (with reason, moderation status)
- **Feed**: "For You" + "Following" tabs
- Place recommendations
- Provider posts (by slug)
- User posts (by username)
- Trip-plan snapshot embedding in posts

### 18. Stories (`stories`)

- Ephemeral content with image + caption
- Configurable expiry time (TTL)
- Story views tracking
- Story feed

### 19. Notifications (`notifications`)

- **14 notification types**:
  - `FOLLOW`, `LIKE`, `COMMENT`, `REPLY`, `MESSAGE`
  - `PLAN_COPIED`, `FRIEND_REQUEST`, `FRIEND_ACCEPTED`
  - `BOOKING_NEW`, `BOOKING_STATUS`, `REVIEW_NEW`
  - `CALENDAR_SHARED`, `OWNER_CANCELLED`
- In-app notification center with read/unread
- **Web Push notifications** (VAPID keys)
- Push subscription management (subscribe/unsubscribe)
- Notification preferences per type + channel
- **WebSocket gateway** for real-time push

### 20. Search (`search`)

- Global search across: places, events, users, providers
- City filter
- Type filter
- Limit/offset pagination
- Public directory — user profile search

### 21. Subscriptions (`subscriptions`)

- Plan management: Free + paid tiers (via Stripe)
- Plan lifecycle: `ACTIVE`, `PAST_DUE`, `CANCELLED`, `TRIALING`, `PAUSED`
- Features stored as JSONB per plan
- Auto-seed default plans on startup
- Stripe product/price sync

### 22. Credits (`credits`)

- Virtual wallet system (CreditWallet — 1:1 with User)
- Credit transactions: `CONSUMPTION`, `GRANT`, `REFUND`, `ADJUSTMENT`, `BONUS`
- Monthly quota reset via cron job
- Rollover support
- Credit engine for granting/spending
- Unique constraint on duplicate transactions (idempotency)

### 23. Features (`features`)

- Feature access control per user
- Time-bound feature grants
- Toggleable feature flags
- SubscriptionFeatureGuard for protected endpoints

### 24. Usage (`usage`)

- Usage logging per feature
- Credit cost tracking per action
- Source tracking: `API`, `WEB`, `SYSTEM`
- Subscription association

### 25. Billing (`billing`)

- Stripe checkout session creation
- Upgrade / downgrade / cancel / reactivate flows
- Billing history (provider charges)
- Invoice management
- Webhook handling

### 26. Admin (`admin`)

- Dashboard with aggregate stats
- User management (CRUD, suspend, role change)
- Provider management (CRUD, verification)
- Place management (CRUD, verification requests)
- Event management (CRUD)
- Country / City / Currency / Tag CRUD
- Review moderation (approve/reject)
- Provider application review (approve/reject)
- Place verification requests
- Billing management (seed plans, grant credits, history)
- Audit log viewer

### 27. Upload (`upload`)

- Image upload via multer (disk storage)
- File upload
- Static file serving with long cache headers
- Missing upload SVG fallback

### 28. Reference Data

- **Countries** — seeded from `world-countries` package, full CRUD
- **Cities** — seeded per country, full CRUD
- **Currencies** — full CRUD
- **Tags** — categorized tags (nature, culture, food, etc.), full CRUD

### 29. Wishlist (`wishlist`)

- Save places to personal wishlist
- List / add / remove

### 30. Email Verification (`email-verification`)

- Verification code generation
- Code validation
- Resend functionality

### 31. Contact (`contact`)

- Contact form submission
- Rate-limited: 5 requests per minute
- XSS prevention (HTML escaping)
- Full DTO validation

### 32. Jobs / Scheduling (`jobs`)

- **Monthly credit quota reset** cron job
- **Async itinerary generation** via BullMQ queue + processor
- Job status polling endpoints

---

## Frontend Features

### 1. Guest (Public)

| Page | Description |
|------|-------------|
| **Landing** | Hero section, featured destinations, CTA |
| **Explore** | Browse places, events, and trips |
| **Destinations** | City-based browsing with filters |
| **Trip Planner** | AI trip planning wizard |
| **Public Trip Page** | View shared trip plans by slug |
| **Place Detail** | Full place info, reviews, location, opening hours |
| **Event Detail** | Event info, date, venue, tickets |
| **Search** | Global search with filters |
| **About** | About the platform |
| **Contact** | Contact form |

### 2. Auth

| Page | Description |
|------|-------------|
| **Login** | Email/username + password login |
| **Register** | New user registration |
| **Verify Email** | Email verification code entry |
| **Invite Activation** | Activate invite token |
| **Choose Account Mode** | Switch between traveler / provider modes |

### 3. Social

| Page / Feature | Description |
|----------------|-------------|
| **Social Feed** | "For You" + "Following" tabs, infinite scroll |
| **Messenger Hub** | Conversation list with previews |
| **Inbox** | Inbox view of all conversations |
| **Conversation** | 1:1 or group chat with reactions, receipts |
| **Post Detail** | Full post view with comments |
| **User Social Profile** | Public social profile with posts, followers |
| **Notifications** | Notification center with read/unread |
| **Activities** | Activity log |

### 4. User / Traveler

| Page | Description |
|------|-------------|
| **Profile** | Edit personal info, avatar, preferences |
| **Settings** | Notification prefs, devices, privacy |
| **My Bookings** | List/manage bookings |
| **Wishlist** | Saved places |
| **Saved Plans** | Saved trip plans |
| **Saved Posts** | Bookmarked social posts |
| **Geo Tables** | Geolocation reference tables |

### 5. Billing & Subscription

| Page | Description |
|------|-------------|
| **Pricing Page** | Plan comparison (Free + tiers) |
| **Billing Dashboard** | Current plan, usage, invoices |
| **Upgrade Plan** | Select and pay via Stripe |
| **Subscription Management** | Cancel, downgrade, reactivate |

### 6. Provider

| Page | Description |
|------|-------------|
| **Business Feed** | Provider's content feed |
| **Create Post** | Create social post as provider |
| **Places Management** | CRUD places for provider |
| **Events Management** | CRUD events for provider |
| **Bookings Management** | View/manage customer bookings |
| **Profile / Settings** | Edit business info |
| **Apply Page** | Submit provider application |
| **Reviews** | View reviews for provider's places |

### 7. Admin

| Page | Description |
|------|-------------|
| **Dashboard** | Global stats, charts |
| **Users** | Manage all users |
| **Providers** | Manage all providers |
| **Places** | Manage all places |
| **Countries** | Reference data management |
| **Cities** | Reference data management |
| **Currencies** | Reference data management |
| **Tags** | Tag management |
| **Events** | Manage all events |
| **Reviews** | Moderate reviews |
| **Place Pricing** | Manage pricing |
| **Opening Hours** | Manage schedules |
| **Provider Memberships** | Manage team roles |
| **Applications** | Review provider applications |
| **Verification Requests** | Approve place/provider verification |
| **Billing** | Seed plans, grant credits, history |
| **Audit Logs** | View audit trail |

### 8. Shared

| Page / Feature | Description |
|----------------|-------------|
| **Trip Planner** | AI-powered wizard with step-by-step form |
| **Trip Calendar** | Calendar view synced with trip plans |
| **Saved Trip Page** | View/edit saved trip plans |

### 9. Design System

| Component | Variants |
|-----------|----------|
| **Badge** | Context-tinted (nature, culture, ocean, neutral) |
| **Button** | Pill, gold, outline, default |
| **Card** | 15px radius, hover effects |
| **Tag** | Color-coded by category |
| **Logo** | Wordmark + logomark variants |
| **CrudPageLayout** | Reusable admin CRUD layout |
| **LoadingOverlay** | Skeleton + spinner states |
| **ErrorBoundary** | Error fallback UI |

### 10. UI / UX

- Dark mode support with brand design tokens
- 6-color brand palette: forest, emerald, sand, ivory, horizon, night
- Custom Ant Design theme override
- Responsive layouts (GuestLayout, AuthLayout, PanelLayout, SocialLayout, AdminLayout, ProviderLayout)
- Toast notifications (React Toastify)
- Route-level loading states
- Lazy-loaded routes (code splitting)

### 11. System

- 404 Not Found page
- Unauthorized page
- Global error boundary

---

## Authentication & Security

### Flow

1. User logs in → server sets httpOnly cookie (`access_token`)
2. All subsequent API calls include cookie automatically
3. Passport JWT strategy validates token on each request
4. Optional JWT guard for public-but-personalized endpoints
5. Logout clears cookie

### Guards

| Guard | Purpose |
|-------|---------|
| `JwtAuthGuard` | Requires valid JWT |
| `OptionalJwtAuthGuard` | Attaches user if JWT present |
| `RolesGuard` | Restricts by role (USER/PROVIDER/ADMIN) |
| `SubscriptionFeatureGuard` | Checks subscription feature access |
| `CreditGuard` | Protects credit-costing endpoints |
| `ThrottlerGuard` | Rate limiting (global + per-route) |

### Security Middleware

- **CORS** — specific allowed origins, preflight handling
- **CSRF** — Origin/Referer validation on state-changing methods
- **Helmet** — CSP (production), COOP, CORP, XSS, etc.
- **Compression** — response compression (skipped for uploads)
- **Cache-Control** — `no-store` for API, long cache for uploads
- **ValidationPipe** — whitelist, forbidNonWhitelisted, transform

---

## Database Schema

### 52 Entities — all extend `BaseEntity`

**BaseEntity fields**: `id` (UUID PK), `createdAt`, `updatedAt`, `deletedAt` (soft delete)

| Entity | Table | Key Fields |
|--------|-------|-----------|
| User | `users` | email (unique), username, passwordHash, role, status, avatar, allowedDevices[], notificationChannels, lastLogin, failedLoginAttempts |
| Provider | `providers` | displayName, slug (unique), description, categories[], taxNumber, verificationStatus, isActive, logoUrl, coverPhotoUrl |
| ProviderMembership | `provider_memberships` | providerRole (OWNER/MANAGER/ADMIN/STAFF/EDITOR) |
| ProviderApplication | `provider_applications` | status, payload (jsonb), adminNote |
| Place | `places` | name, slug (unique), type, lat, lng, location (Point), ratingAverage, isActive, isVerified |
| PlacePricing | `place_pricings` | price, currencyCode, personCount |
| PlaceOpeningHour | `place_opening_hours` | dayOfWeek, openTime, closeTime, isClosed |
| Event | `events` | title, slug, startDate, endDate, availableTickets, ticketPrice |
| Booking | `bookings` | bookingDate, persons, totalCost, status (PENDING/CONFIRMED/CANCELLED/COMPLETED) |
| TripPlan | `trip_plans` | days, budget, persons, generatedPlan (jsonb), shareSlug (unique), isPublic, viewCount |
| Expense | `trip_expenses` | category, amount, currencyCode, paidBy, splitWith[], notes |
| TripPlanView | `trip_plan_views` | viewerDeviceId, viewedAt |
| Review | `reviews` | rating, comment, status (PENDING/APPROVED/REJECTED), isFlagged |
| PlaceComment | `place_comments` | content |
| EventComment | `event_comments` | content |
| SocialPost | `social_posts` | title, body, imageUrls[], snapshot (jsonb), visibility (PUBLIC/FRIENDS/FOLLOWERS/PRIVATE) |
| PostComment | `post_comments` | content |
| PostReaction | `post_reactions` | type |
| PostSave | `post_saves` | — |
| PostReport | `post_reports` | reason, status |
| Friendship | `friendships` | userLowId, userHighId, requesterId, status (PENDING/ACCEPTED/DECLINED) |
| FollowRelation | `follow_relations` | followerId, followingId |
| BlockRelation | `block_relations` | blockerId, blockedId |
| MuteRelation | `mute_relations` | muterId, mutedId |
| Conversation | `conversations` | title, isGroup, createdByUserId |
| ConversationMember | `conversation_members` | conversationRole, lastReadAt, pinnedAt, mutedAt |
| Message | `messages` | content, replyToMessageId, deliveryStatus |
| MessageReceipt | `message_receipts` | status, receivedAt |
| MessageReaction | `message_reactions` | emoji |
| Notification | `notifications` | type (14 types), message, meta (jsonb), isRead |
| WebPushSubscription | `web_push_subscriptions` | endpoint, p256dh, auth, userAgent |
| CalendarEntry | `calendar_entries` | calendarDate, startTime, title, sourceType, sharedWithUserIds[] |
| Story | `stories` | imageUrl, caption, expiresAt |
| StoryView | `story_views` | — |
| Plan | `plans` | slug (unique), name, monthlyCredits, priceCents, stripePriceId, features (jsonb) |
| Subscription | `subscriptions` | status, currentPeriodStart/End, seats, providerSubscriptionId |
| CreditWallet | `credit_wallets` | balance, reserved, monthlyQuota, lastResetAt |
| CreditTransaction | `credit_transactions` | amount, type (CONSUMPTION/GRANT/REFUND/ADJUSTMENT/BONUS) |
| BillingHistory | `billing_history` | provider, providerChargeId, amountCents, status |
| Invoice | `invoices` | billing-related fields |
| FeatureAccess | `feature_access` | featureKey, enabled, expiresAt |
| UsageLog | `usage_logs` | feature, costCredits, context (jsonb), source |
| InviteToken | `invite_tokens` | token, isUsed, usedByFingerprint |
| EmailVerificationToken | `email_verification_tokens` | token, expiresAt |
| Country | `countries` | name, code, phoneCode |
| City | `cities` | name, slug |
| Currency | `currencies` | code, name, symbol |
| Tag | `tags` | name, slug, type |
| PlaceVerificationRequest | `place_verification_requests` | — |
| AuditLog | `audit_logs` | action, entity, entityId, changes (jsonb) |

---

## API Endpoints

All endpoints prefixed with `/api`.

### Auth
```
POST   /auth/login
POST   /auth/register
POST   /auth/logout
GET    /auth/me
PATCH  /auth/me
GET    /auth/me/summary
GET    /auth/getPayload
POST   /auth/invite
POST   /auth/invite/activate
```

### Users
```
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
GET    /users/profile/:id
GET    /users/allowed-devices
DELETE /users/allowed-devices/:fp
```

### Places
```
GET    /place
GET    /place/:id
POST   /place
PATCH  /place/:id
DELETE /place/:id
GET    /place/nearest?lat=&lng=&limit=
```

### Events
```
GET    /events
GET    /events/:id
POST   /events
PATCH  /events/:id
DELETE /events/:id
```

### Trip Planner
```
POST   /trip-planner                             (5 credits)
POST   /trip-planner/import
GET    /trip-planner/my-plans
GET    /trip-planner/:id
DELETE /trip-planner/:id
GET    /trip-planner/jobs/:jobId
POST   /trip-planner/:id/share
POST   /trip-planner/:id/copy
POST   /trip-planner/:id/toggle-public
GET    /trip-planner/public/:slug
GET    /trip-planner/public/browse
GET    /trip-planner/ai/health
GET    /trip-planner/:id/expenses
POST   /trip-planner/:id/expenses
DELETE /trip-planner/expenses/:id
POST   /trip-planner/expenses/:id/settle
```

### Bookings
```
GET    /bookings/my
POST   /bookings
GET    /bookings/:id
PATCH  /bookings/:id/cancel
GET    /bookings/provider/mine
PATCH  /bookings/:id/status
```

### Social Graph
```
GET    /social-graph/friends
GET    /social-graph/friends/incoming
POST   /social-graph/friends/request
POST   /social-graph/friends/:id/accept
POST   /social-graph/friends/:id/decline
DELETE /social-graph/friends/:id
POST   /social-graph/users/:id/follow
POST   /social-graph/users/:id/unfollow
POST   /social-graph/users/:id/block
POST   /social-graph/users/:id/unblock
POST   /social-graph/users/:id/mute
POST   /social-graph/users/:id/unmute
GET    /social-graph/users/:id/state
GET    /social-graph/friends/state-by-username/:username
GET    /social-graph/me/connection-counts
GET    /social-graph/me/followers
GET    /social-graph/me/following
```

### Social Content
```
GET    /social-content/feed
GET    /social-content/recommendations/places
POST   /social-content/posts
GET    /social-content/posts/:id
POST   /social-content/posts/:id/like
POST   /social-content/posts/:id/save
GET    /social-content/posts/:id/comments
POST   /social-content/posts/:id/report
GET    /social-content/users/:username/posts
GET    /social-content/providers/slug/:slug/posts
```

### Messaging
```
GET    /messaging/inbox
GET    /messaging/conversations
PATCH  /messaging/conversations/:id
POST   /messaging/conversations/:id/members
DELETE /messaging/conversations/:id/members/:userId
PUT    /messaging/conversations/:id/members/:userId/role
POST   /messaging/conversations/:id/leave
GET    /messaging/conversations/:id/messages
POST   /messaging/conversations/:id/read
POST   /messaging/conversations/:id/pin
POST   /messaging/conversations/:id/unpin
POST   /messaging/conversations/:id/mute
POST   /messaging/conversations/:id/unmute
POST   /messaging/conversations/:id/archive
POST   /messaging/conversations/:id/unarchive
DELETE /messaging/messages/:id
POST   /messaging/messages/:id/reactions
POST   /messaging/ai/conversation
POST   /messaging/conversations/:id/ai/reply
```

### Notifications
```
GET    /notifications
GET    /notifications/unread-count
GET    /notifications/preferences
POST   /notifications/:id/read
POST   /notifications/read-all
GET    /notifications/push/public-key
POST   /notifications/push/subscribe
POST   /notifications/push/unsubscribe
```

### Calendar
```
GET    /calendar
POST   /calendar
PATCH  /calendar/:id
DELETE /calendar/:id
POST   /calendar/share-trip/:tripPlanId
```

### Reviews
```
GET    /review/places/:id
GET    /review/events/:id
POST   /review
GET    /review/places/:id/comments
GET    /review/events/:id/comments
DELETE /review/comments/:id
POST   /review/:id/flag
```

### Providers
```
GET    /providers/my
GET    /providers/my/places
GET    /providers/my/events
GET    /providers/my/stats
GET    /providers/slug/:slug
```

### Provider Applications
```
POST   /provider-applications
GET    /provider-applications
GET    /provider-applications/:id
PATCH  /provider-applications/:id/review
```

### Subscriptions
```
GET    /subscriptions/plans
GET    /subscriptions/plans/me
```

### Credits
```
GET    /credits
GET    /credits/transactions
```

### Billing
```
POST   /billing/upgrade
POST   /billing/downgrade
POST   /billing/cancel
POST   /billing/reactivate
GET    /billing/history
POST   /billing/create-checkout-session
```

### Admin
```
GET    /admin/dashboard
GET    /admin/billing/seed-plans
GET    /admin/billing/plans
...    (all CRUD for users, providers, places, events, etc.)
```

### Other
```
GET    /search?q=&cityId=&limit=&types=
GET    /wishlist
POST   /wishlist
DELETE /wishlist/:id
POST   /upload/image
POST   /upload/file
POST   /contact
POST   /email-verification/verify
POST   /email-verification/resend
GET    /countries   (full CRUD)
GET    /cities      (full CRUD)
GET    /currencies  (full CRUD)
GET    /tag         (full CRUD)
GET    /stories     (full CRUD)
GET    /public/users/:param
GET    /public/users/:param/followers|following|friends
```

---

## Real-Time Features

### Socket.IO (WebSocket)

- **Chat messages** — real-time send/receive, delivery status updates
- **Typing indicators** — live typing status per conversation
- **Notifications** — instant push of new notifications
- **Redis adapter** — horizontal scaling support

### Web Push

- VAPID-based push notifications
- Subscribe/unsubscribe management
- Delivered via browser service worker

---

## AI Features

### Google Gemini Integration

- **Trip itinerary generation** from natural language inputs (city, days, budget, interests)
- **Ground-truth validation** — cross-references AI suggestions with actual DB places/pricing
- **Cost clamping** — ensures budget estimates are realistic
- **Anti-hallucination prompts** — engineered to prevent made-up places
- **Async generation** — long-running trips queued via BullMQ
- **AI conversation** — Gemini-powered chat bot in messenger
- **Health check** — `/trip-planner/ai/health`

---

## Payment & Billing

### Stripe Integration

- **Products & Prices** — synced with Plan entities
- **Checkout Sessions** — hosted Stripe payment page
- **Webhooks** — handle success/failure events
- **Billing lifecycle**: upgrade → downgrade → cancel → reactivate
- **Billing history** — all Stripe charges logged

### Credit System

- **Virtual wallet** per user (1:1 with User)
- **Monthly quota** — free credits every month (cron reset)
- **Credit cost** — AI trip generation costs 5 credits
- **Transaction types**: CONSUMPTION, GRANT, REFUND, ADJUSTMENT, BONUS
- **Idempotency** — duplicate prevention on transactions

---

## Internationalization

### Frontend (i18next)

| Status | Languages |
|--------|-----------|
| **Complete (9)** | English, Arabic, French, Russian, Turkish, Spanish, German, Chinese, Portuguese |
| **Beta (6)** | Hebrew, Hindi, Italian, Japanese, Korean, Urdu |

- **RTL support** for Arabic, Hebrew, Urdu
- Language detector (browser preference)
- HTTP backend for loading translation files
- Namespace-based organization

### Backend

- **TranslationService** — i18n for API error messages
- Multi-language error responses

---

## PWA & Offline

- **Service Worker** — custom `sw.js` with caching strategies
- **vite-plugin-pwa** — PWA manifest, install prompt
- **IndexedDB** (idb) — offline data persistence
- **Offline detection hooks** — graceful degradation

---

## Deployment

### Backend (Vercel)

- **Serverless entry**: `api/index.ts`
- Environment variables for DB, Redis, Stripe, Gemini, JWT, etc.
- TypeORM migration support
- Static file serving from `uploads/`

### Frontend (Vercel)

- **Vite build** → static assets
- `vercel.json` — SPA rewrites, headers
- Proxy in dev: `/api` → `localhost:3001`

### Docker / Local

```bash
# Backend
cd waynest-be
npm install
npm run start:dev

# Frontend
cd waynest-FE
npm install
npm run dev
```

---

## Project Structure

```
Waynest/
├── waynest-be/              # NestJS backend (TypeScript)
│   ├── src/
│   │   ├── main.ts          # Bootstrap (CORS, Swagger, Helmet, etc.)
│   │   ├── app.module.ts    # Root module (35+ sub-modules)
│   │   ├── database/        # TypeORM config
│   │   ├── common/          # Entities, guards, filters, decorators,
│   │   │                     # middleware, redis, logging, translations
│   │   ├── modules/         # 32 feature modules
│   │   ├── trip-planner/    # AI trip planning (service, AI, Gemini, sharing, etc.)
│   │   ├── jobs/            # BullMQ queue + cron jobs
│   │   └── migrations/      # 36 SQL migration files
│   ├── seed/                # Seed data (Bethlehem, countries)
│   ├── test/                # E2E tests
│   └── api/                 # Vercel serverless entry
│
├── waynest-FE/              # React frontend (Vite)
│   ├── src/
│   │   ├── main.jsx         # Entry point
│   │   ├── App.jsx          # Providers (QueryClient, Antd, Auth, etc.)
│   │   ├── router.jsx       # All routes (lazy-loaded)
│   │   ├── i18n.js          # i18next config
│   │   ├── api/             # 18 API modules (client, routes, auth, etc.)
│   │   ├── components/      # 18 component categories
│   │   ├── context/         # 7 React contexts
│   │   ├── design-system/   # 8 custom components
│   │   ├── hooks/           # 12+ custom hooks
│   │   ├── layouts/         # 6 layouts
│   │   ├── locales/         # Translation JSON files (15 languages)
│   │   ├── pages/           # 55+ pages (admin, auth, billing, guest, etc.)
│   │   ├── services/        # Service layer
│   │   ├── styles/          # CSS (app, global, brand, premium)
│   │   └── utils/           # 21 utility modules
│   └── public/              # Static assets
│
├── scripts/                 # Utility scripts (QA, i18n, cleanup)
├── qa-reports/              # QA reports
├── reports/                 # Reports
├── uploads/                 # User uploaded files
└── .github/                 # GitHub config
```
