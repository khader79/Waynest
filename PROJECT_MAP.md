# WAYNEST — PROJECT MAP

Last Updated: 2026-05-15

## [EXECUTION_LOG] — 2026-05-15

### ✅ Completed: P1 Lint & Quality Fixes

| Action | File |
|--------|------|
| Added missing `useTranslation()` hook call (t was used but never initialized) | `PlaceDetail.jsx` |
| Added `t` to useEffect dependency array (exhaustive-deps fix) | `PlaceDetail.jsx` |
| Typed diskStorage callbacks with Express.Request + explicit file types | `upload.controller.ts` |
| Added eslint-disable comments for multer untyped API calls | `upload.controller.ts` |
| Typed `safeUser` as `Record<string, unknown>` instead of `any` | `users.service.ts` |
| Added explicit `Promise<User \| null>` return type to `findCurrentUserRecord` | `users.service.ts` |
| Removed unused `eslint-disable` directives for no-console | `users.service.ts` |

### ✅ Verified

| Check | Result |
|-------|--------|
| `PlaceDetail.jsx` ESLint | PASS (0 errors, 0 warnings) |
| `ProviderPublicBusinessPage.jsx` ESLint | PASS (0 errors, 0 warnings) |
| `upload.controller.ts` ESLint | PASS (0 errors, 0 warnings) |
| `users.service.ts` ESLint | PASS (0 errors, 0 warnings) |

### ✅ Completed: Trip Planner High-Accuracy Overhaul

| Action | File |
|--------|------|
| Religious places zero-price enforcement | `trip-planner.service.ts` — new `isReligiousPlace()` helper; `normalizePlacePricings()` now forces price=0 for any place tagged "religious" |
| Ground-truth validation pipeline | `trip-planner.service.ts` — `validateAndFixPlan()` now called after every AI generation; recalculates all prices, names, types, opening hours from DB; forces religious places to 0 |
| Clamp negative/ludicrous costs | `trip-planner.service.ts:validateAndFixPlan()` — `Math.max(0, ...)` on all cost fields |
| Enhanced AI prompt accuracy | `ai.service.ts:buildPrompt()` — added religious-free rule, stronger anti-hallucination warning, stricter pricing instruction, variety rules, better tips guidance |
| Post-AI hallucination cleanup | `trip-planner.service.ts:generate()` — plan validated against ground truth before event injection |

### ✅ Verified

| Check | Result |
|-------|--------|
| BE TypeScript compile | PASS (0 errors) |
| FE Vite build | PASS (1.72s, Vite 8.0.0) |

## [EXECUTION_LOG] — 2026-05-13

### ✅ Completed: Contact Module Security Hardening

| Action                    | File                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Added DTO with validation | `contact-message.dto.ts` — `@IsString`, `@IsEmail`, `@IsNotEmpty`, `@MaxLength` constraints     |
| Added rate limiting       | `contact.controller.ts` — `@Throttle({ default: { limit: 5, ttl: 60_000 } })` on POST endpoint |
| Added XSS prevention      | `contact.service.ts` — `escapeHtml()` on all 4 fields before rendering HTML email body          |
| Strict validation         | `contact.controller.ts` — `forbidNonWhitelisted: true` in ValidationPipe                        |

### ✅ Completed: Calendar Share Security & Transactional Safety

| Action                              | File                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Friend validation before share      | `calendar.service.ts:332` — calls `assertAcceptedFriends()` before sharing to user    |
| Proper error code                   | `calendar.controller.ts:65` — `ForbiddenException` instead of misleading `NotFoundException` |
| Transactional share creation        | `calendar.service.ts:340` — wrapped `shareTripToUser` DB ops in `this.dataSource.transaction()` |
| Transaction-safe repository access  | `calendar.service.ts` — uses `manager.getRepository(CalendarEntry)` inside transaction |

### ✅ Completed: FE Trip Planner Calendar Toggle UX

| Action                                    | File                                                             |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Moved toggle before submit button         | `TripPlannerFormPanel.jsx` — calendar checkbox now above submit  |
| Conditional render for guests             | `TripPlannerFormPanel.jsx` — toggle hidden when `!isAuthenticated` |

### ✅ Verified

| Check   | Result |
| ------- | ------ |
| FE build| PASS (2.16s, Vite 8.0.0) |
| BE build| Pre-existing env issues only (unrelated) |

---

## [EXECUTION_LOG] — 2026-05-12

### ✅ Completed: Posts inherit Trip Plan visibility (Feed filtering)

| Action                | File                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Visibility sync logic | `social-content.service.ts::createPost()` — If post is linked to a Trip Plan, inherit `tripPlan.shareVisibility` → `post.visibility`                         |
| Validation rule       | When linking to Trip Plan, enforce that `dto.visibility` must match plan's `shareVisibility` (or throw BadRequestException)                                  |
| Feed filtering        | Verified existing logic: - "for-you" tab: excludes FRIENDS visibility posts - "following" tab: includes FRIENDS from friends only (via `filterVisiblePosts`) |
| Spec documentation    | Created `social-content.service.spec.md` — documents visibility rules and feed filtering behavior                                                            |

---

## [EXECUTION_LOG] — 2026-05-08

### ✅ Completed: Remove AI Translation Infra

| Action                          | Files                                                             |
| ------------------------------- | ----------------------------------------------------------------- |
| Deleted translation scripts     | 16 scripts in `scripts/`                                          |
| Deleted translation reports     | 7 files (i18n-autogen-_, i18n-global-_, i18n-untranslated-\*)     |
| Deleted translation-to-do       | directory with 6 template files                                   |
| Removed externalText service    | `src/services/i18n/externalText.service.js`                       |
| Removed SmartRuntimeTranslator  | `src/components/i18n/SmartRuntimeTranslator.jsx`                  |
| Removed useExternalTextMap hook | `src/hooks/i18n/useExternalTextMap.js`                            |
| Cleaned LandingPage.jsx         | Removed unused import                                             |
| Cleaned Explore.jsx             | Removed all 22 resolveExternalText calls + unused variables       |
| Cleaned App.jsx                 | Removed SmartRuntimeTranslator import + usage                     |
| Cleaned package.json            | Removed node-fetch, removed 6 i18n scripts, fixed trailing comma  |
| Cleaned locale files            | Removed `autogen` block from all 5 languages (en, ar, fr, ru, tr) |
| Removed empty dirs              | `services/i18n`, `hooks/i18n`, `components/i18n`                  |

### ✅ Completed: Git Unstaged Changes

| Action           | File                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Safe JSON parser | `BillingDashboard.jsx` — wrapped API calls with safeParse                                     |
| Error handling   | `PricingPage.jsx` — added JSON validation + error messages                                    |
| Dev proxy        | `vite.config.js` — added `/api` proxy to localhost:3000                                       |
| Route fix        | `subscriptions.controller.ts` — `@Controller('plans')` → `@Controller('subscriptions/plans')` |
| Stub removal     | `billing.controller.ts` — deleted empty file (not registered)                                 |

### ✅ Completed: Fix FE↔BE API Integration

| Root Cause                                                           | Fix                                                                  |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Vite proxy target `localhost:3000` (wrong port)                      | Changed to `http://localhost:3001`                                   |
| Proxy `rewrite` was no-op (`/api`→`/api`)                            | Removed (NestJS already has `setGlobalPrefix('api')`)                |
| `.env` has `VITE_API_URL=.../api`                                    | KEPT (correct — baseURL includes `/api`)                             |
| `catalog.js` used `/api/countries` etc. (double `/api` with baseURL) | Changed to `/countries`, `/cities`, `/currencies`, `/tag` (10 paths) |
| `UpgradePlanPage.jsx` used `users/me/upgrade` (backend expects UUID) | Changed to `users/${user.id}/upgrade`                                |

### ✅ Activated Subscription/Credits System (2026-05-08)

| Action                                      | Files                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Auto-seed plans on startup                  | `plan-seed-on-startup.ts` — calls `PlanSeeder.seed()` via `OnApplicationBootstrap`                                                    |
| Free subscription after registration        | `auth.service.ts` — `initializeFreeSubscription()` creates Free plan subscription + wallet with welcome credits + sets monthlyQuota   |
| Register DI wiring                          | `auth.module.ts` — imports `SubscriptionsModule`, `CreditsModule`, and `TypeOrmModule.forFeature([Plan, Subscription, CreditWallet])` |
| Fixed CreditsWidget token key               | `CreditsWidget.jsx` — `"token"` → `STORAGE_KEYS.authToken`                                                                            |
| CreditsWidget in Sidebar                    | `Sidebar.jsx` — renders `CreditsWidget` after nav; `Sidebar.css` — `.sidebar-credits` styles (flex-shrink, margin-top: auto)          |
| PricingPage/BillingDashboard error handling | Already fixed in prior session (safe JSON parse, empty-body guards)                                                                   |

### ✅ Auto-Create Calendar Entries from Trip Plans (2026-05-08)

| Action                                                | Files                                                                                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Added `tripPlanId`, `tripDay`, `tripCityName` columns | `calendar-entry.entity.ts` — nullable UUID + int + varchar                                                                              |
| Added `createTripPlanEntries()`                       | `calendar.service.ts` — creates one CalendarEntry per itinerary day with `sourceType: 'trip_plan'`                                      |
| Added `removeEntriesByTripPlan()`                     | `calendar.service.ts` — cleans up entries when trip plan is deleted                                                                     |
| DI wiring                                             | `trip-planner.module.ts` — imports `CalendarModule`                                                                                     |
| Hook into `generate()`                                | `trip-planner.service.ts:966` — calls `createTripPlanEntries` after saving plan                                                         |
| Hook into `createFromGenerated()`                     | `trip-planner.service.ts:1039` — same for imported plans                                                                                |
| Hook into `remove()`                                  | `trip-planner.service.ts:786` — calls `removeEntriesByTripPlan` before deleting plan                                                    |
| Filter FE duplicates                                  | `TripPlannerCalendarPage.jsx:189` — filters out `sourceType === 'trip_plan'` from personal entries (plans already shown via trip-stops) |

### ✅ Verified

- FE build: PASS (2.25s)
- BE build: PASS
- Zero broken imports

## [TECH_STACK]

**Date checked:** 2026-05-15 — All versions are latest stable within range. No deprecated packages found.

### Backend (`waynest-be/`)

| Layer       | Technology                       | Pinned Version  | Latest Stable | Status |
| ----------- | -------------------------------- | --------------- | ------------- | ------ |
| Runtime     | Node.js / NestJS                 | @nestjs/core ^11.0.1 | 11.1.21 | ✅ |
| Language    | TypeScript                       | ^5.7.3          | 5.7.3         | ✅ |
| ORM         | TypeORM                          | ^0.3.28         | 0.3.29        | ✅ |
| Database    | PostgreSQL (Neon)                | pg ^8.19.0      | 8.20.0        | ✅ |
| Auth        | Passport + JWT                   | passport-jwt ^4.0.1 | —           | ✅ |
| Caching     | Redis + In-memory HotPathCache   | redis ^4.7.1    | **5.12.1**    | ⚠️ v4→v5 breaking |
| Real-time   | Socket.IO                        | ^4.8.3          | 4.8.3         | ✅ |
| AI          | Google Gemini + OpenRouter       | @google/generative-ai ^0.24.1 | 0.24.1 | ✅ |
| Payments    | Stripe                           | stripe ^22.1.1  | 22.1.1        | ✅ |
| Push        | Web Push (VAPID)                 | web-push ^3.6.7 | 3.6.7         | ✅ |
| Email       | Nodemailer (Gmail SMTP)          | ^8.0.2          | 8.0.7         | ✅ |
| Docs        | Swagger                          | @nestjs/swagger ^11.2.6 | —      | ✅ |
| Testing     | Jest + Supertest                 | ^30.0.0 / ^7.0.0 | —           | ✅ |
| Lint        | ESLint ^9.18.0 + Prettier ^3.4.2 | —               | —             | ✅ |

### Frontend (`waynest-FE/`)

| Layer              | Technology                   | Pinned Version  | Latest Stable | Status |
| ------------------ | ---------------------------- | --------------- | ------------- | ------ |
| Framework          | React                        | ^18.3.1         | **19.2.6**    | ⚠️ v18→v19 breaking |
| Build              | Vite                         | ^8.0.0-beta.13  | 8.0.13        | ✅ (out of beta) |
| UI Library         | Ant Design (antd)            | ^6.3.1          | 6.4.2         | ✅ |
| Routing            | React Router DOM             | ^6.30.3         | **7.15.1**    | ⚠️ v6→v7 breaking |
| HTTP               | Axios                        | ^1.14.0         | —             | ✅ |
| State (Server)     | @tanstack/react-query        | ^5.96.2         | 5.100.10      | ✅ |
| i18n               | i18next + react-i18next      | ^25.10.10 / ^16.6.6 | **26.2.0** | ⚠️ v25→v26 breaking |
| Real-time          | socket.io-client             | ^4.8.1          | 4.8.3         | ✅ |
| Notifications      | React Toastify               | ^11.0.5         | —             | ✅ |
| Device Fingerprint | @fingerprintjs/fingerprintjs | ^5.1.0          | —             | ✅ |
| Lint               | ESLint ^9.39.1               | —               | —             | ✅ |

### Languages

| Language | Locale Code | RTL | Translation Status |
| -------- | ----------- | --- | ------------------ |
| English  | en          | No  | ✅ Complete |
| Arabic   | ar          | Yes | ✅ Complete |
| French   | fr          | No  | ✅ Complete |
| Russian  | ru          | No  | ✅ Complete |
| Turkish  | tr          | No  | ✅ Complete |
| Spanish  | es          | No  | ✅ Complete |
| German   | de          | No  | ✅ Complete |
| Chinese  | zh          | No  | ✅ Complete |
| Portuguese | pt        | No  | ✅ Complete |
| Hebrew   | he          | Yes | 🟡 Available |
| Hindi    | hi          | No  | 🟡 Available |
| Italian  | it          | No  | 🟡 Available |
| Japanese | ja          | No  | 🟡 Available |
| Korean   | ko          | No  | 🟡 Available |
| Urdu     | ur          | Yes | 🟡 Available |

---

## [SYSTEM_FLOW]

### User Journey Map (Verified Routes)

```
GUEST FLOW
  / → LandingPage (guest) | SocialFeed (auth)
  /explore → Explore page
  /destinations → Destinations
  /plan → TripPlanner
  /trip/:slug → PublicTripPage
  /places/:id → PlaceDetail
  /events/:id → EventDetail
  /search → GlobalSearch
  /login → Login
  /register → Register
  /invite → Invite activation
  /about, /contact → Static pages

USER FLOW (traveler)
  / → SocialFeed
  /u/:username → UserSocialProfile
  /social, /inbox → MessengerHub / Inbox
  /profile → Profile
  /settings → Settings
  /bookings → Bookings
  /wishlist → Wishlist
  /saved-plans → SavedPlans
  /notifications → Notifications
  /pricing / /billing → Subscription management

PROVIDER FLOW
  /account/provider → Provider dashboard
  /account/provider/places → Manage places
  /account/provider/events → Manage events
  /account/provider/bookings → Provider bookings
  /account/provider/apply → Apply for provider
  /p/:slug → Public provider page

ADMIN FLOW
  /admin-panel → Admin dashboard
  /admin-panel/{users,providers,places,events,reviews,…} → CRUD management
  /admin-panel/billing → Admin billing
```

### Data Flow

```
Browser → Axios Client → JWT Auth → API Gateway (api/) → NestJS Controllers
  → Services (business logic) → TypeORM Entities → PostgreSQL (Neon)
  → Redis Cache (hot path) ← HotPathCache (in-memory)
  → Response ← DTO Validation (class-validator)

Real-time: Socket.IO (client) ↔ Socket.IO Gateway ← Redis Adapter
Push: Web Push API ← web-push service
AI: Trip Planner → OpenRouter / Gemini API
```

---

## [ARCHITECTURE]

### Backend Modules (36)

```
src/
├── app.module.ts           → Root (35 sub-modules)
├── main.ts                 → Bootstrap (CORS, ValidationPipe, Swagger)
├── common/                 → Shared: Redis, Logging, Cache, Filters, Decorators
├── database/               → TypeORM config
├── modules/
│   ├── auth/               → Login, Register, JWT, Guards, Invite
│   ├── users/              → User CRUD, allowed-devices
│   ├── providers/          → Provider CRUD, verification-requests
│   ├── place/              → Place CRUD, nearest, filters
│   ├── placepricing/       → Pricing per place
│   ├── place-opening-hours/ → Opening hours per place
│   ├── event/              → Event CRUD
│   ├── review/             → Reviews, comments, flagging
│   ├── tag/                → Tags CRUD
│   ├── countries/          → Countries CRUD
│   ├── cities/             → Cities CRUD
│   ├── currencies/         → Currencies CRUD
│   ├── provider-membership/ → Provider member roles
│   ├── provider-applications/ → Provider applications
│   ├── wishlist/           → Wishlist CRUD
│   ├── email-verification/ → Email verification
│   ├── bookings/           → Booking CRUD
│   ├── calendar/           → Calendar entries + sharing
│   ├── chat/               → Conversations, Messages, Receipts, Reactions
│   ├── social-graph/       → Friends, Follow, Block, Mute
│   ├── social-content/     → Posts, Comments, Reactions, Reports
│   ├── notifications/      → Notifications, Push subscriptions
│   ├── stories/            → Stories, Story views
│   ├── search/             → Global search, Public directory
│   ├── upload/             → File uploads (images, files)
│   ├── subscriptions/      → Plans, Subscriptions, Guards
│   ├── credits/            → Wallets, Transactions, Engine
│   ├── features/           → Feature access control
│   ├── usage/              → Usage logging
│   ├── billing/            → Billing history
│   └── admin/              → Admin billing, Audit logs
├── trip-planner/           → AI trip plans, Sharing, Views
└── jobs/                   → Cron jobs (monthly reset)

seed/                       → Seed data (Bethlehem, countries)
db/migrations/              → SQL migrations (10 files)
api/index.ts                → Vercel serverless entry
```

### Frontend Structure (~215 source files)

```
src/
├── api/           → Axios client + 17 domain API modules
├── components/    → Reusable UI (admin, billing, common, panel, provider, public, shared, social, trips)
├── context/       → 6 contexts (Auth, Currency, Notifications, Provider, ProviderWorkspace, Share)
├── hooks/         → 25+ custom hooks (admin, provider, public, trips, user)
├── layouts/       → 6 layouts (Admin, Auth, Guest, Panel, Provider, Social)
├── modules/       → Landing module (LeftSidebar, MainLayout, LandingPage)
├── pages/         → 55+ pages across admin, auth, billing, guest, provider, shared, social, user, system
├── services/      → Service layer (catalog, http, i18n, social, models, providerService)
├── styles/        → Global CSS (app.css, global.css)
└── utils/         → Storage, formatting, validation, webPush, etc.
```

---

## [ORPHANS & PENDING]

### ~~P0 — TODO: Remove AI Translation~~ ✅ COMPLETED (2026-05-08)

- Deleted: scripts/, externalText.service.js, SmartRuntimeTranslator.jsx, useExternalTextMap.js, translation-to-do/, i18n report files
- Cleaned: LandingPage.jsx, Explore.jsx, App.jsx, package.json, all locale translation.json files (autogen blocks)
- Removed: node-fetch dependency, i18n automation scripts from package.json
- All empty i18n directories cleaned up

### P0 — Git Unstaged Changes ✅ RESOLVED (2026-05-08)

- ✅ `waynest-FE/src/pages/billing/BillingDashboard.jsx` — safe JSON parsing wrapper added
- ✅ `waynest-FE/src/pages/billing/PricingPage.jsx` — safe JSON parsing + error handling
- ✅ `waynest-FE/vite.config.js` — dev proxy configured (localhost:3000)
- ✅ `waynest-be/src/modules/subscriptions/subscriptions.controller.ts` — route fixed to `subscriptions/plans`
- ✅ `waynest-be/src/modules/billing/billing.controller.ts` — removed (empty stub, unused)

### ~~P1 — FE Lint Issues~~ ✅ RESOLVED (2026-05-15)

- ✅ `PlaceDetail.jsx` — Added missing `useTranslation()` hook call + exhaustive-deps fix
- ✅ `ProviderPublicBusinessPage.jsx` — No lint issues found on re-check

### ~~P1 — BE Quality Issues~~ ✅ RESOLVED (2026-05-15)

- ✅ `upload.controller.ts` — Typed callbacks (`Express.Request`, inline file types), disabled eslint for multer's untyped `diskStorage` API
- ✅ `users.service.ts` — Changed `safeUser` from `any` to `Record<string, unknown>`, added return type to `findCurrentUserRecord`, removed unused eslint-disable directives

### P2 — Empty/Incomplete Directories — @audit: noted

- `src/design-system/`, `src/pages/calendar/`, `src/pages/user/dashboard/`, `src/pages/provider/dashboard/`
- `src/components/subscriptions/`, `src/services/subscription/`, `src/utils/localization/`
- These are planned extensions, not regressions.

### ✅ Activated Subscription/Credits System (2026-05-08)

- ✅ Plans auto-seeded on startup via `PlanSeedOnStartup` (calls `PlanSeeder.seed()` on `OnApplicationBootstrap`)
- ✅ Free subscription + wallet auto-created on user registration in `auth.service.ts::initializeFreeSubscription()`
- ✅ `CreditsWidget.jsx` fixed: `"token"` → `STORAGE_KEYS.authToken`
- ✅ `CreditsWidget` rendered in `Sidebar.jsx` for all authenticated panel users
- ✅ PricingPage/BillingDashboard handle missing wallet/subscription gracefully (safe JSON parse + empty-body guards per prior session)

### P0 — Current Working Changes (2026-05-15) — 🟡 Uncommitted

| Module | Changes | Status |
|--------|---------|--------|
| Trip Planner Accuracy | Religious places FREE (price=0 enforcement), post-AI ground-truth validation pipeline, enhanced AI prompt with anti-hallucination rules, cost clamping | 🟡 Uncommitted |
| Contact | DTO validation, rate limiting, XSS escaping | 🟡 Uncommitted |
| Calendar | Friend check before share, transaction safety, ForbiddenException | 🟡 Uncommitted |
| Trip Planner FE | Calendar toggle moved before submit, conditional on auth | 🟡 Uncommitted |
| i18n Full Translation | All 9 languages (en, ar, fr, ru, tr, es, de, zh, pt) fully populated across common, errors, tripPlanner namespaces — 27 locale JSON files | 🟡 Uncommitted |
| P1 Lint Fixes | FE: PlaceDetail.jsx (missing useTranslation) + BE: upload.controller.ts, users.service.ts (unsafe-any) — all lint-clean | 🟡 Uncommitted |
| PROJECT_MAP.md | Updated TECH_STACK with latest version audit, marked P1 items resolved | 🟡 Uncommitted |

### P2 — Missing Test Infrastructure — @audit: known

- No unit tests for FE 🟡 Planned
- No E2E tests 🟡 Planned
- No route-flow smoke checks 🟡 Planned
