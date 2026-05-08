# WAYNEST — PROJECT MAP

Last Updated: 2026-05-08

## [EXECUTION_LOG] — 2026-05-08

### ✅ Completed: Remove AI Translation Infra
| Action | Files |
|--------|-------|
| Deleted translation scripts | 16 scripts in `scripts/` |
| Deleted translation reports | 7 files (i18n-autogen-*, i18n-global-*, i18n-untranslated-*) |
| Deleted translation-to-do | directory with 6 template files |
| Removed externalText service | `src/services/i18n/externalText.service.js` |
| Removed SmartRuntimeTranslator | `src/components/i18n/SmartRuntimeTranslator.jsx` |
| Removed useExternalTextMap hook | `src/hooks/i18n/useExternalTextMap.js` |
| Cleaned LandingPage.jsx | Removed unused import |
| Cleaned Explore.jsx | Removed all 22 resolveExternalText calls + unused variables |
| Cleaned App.jsx | Removed SmartRuntimeTranslator import + usage |
| Cleaned package.json | Removed node-fetch, removed 6 i18n scripts, fixed trailing comma |
| Cleaned locale files | Removed `autogen` block from all 5 languages (en, ar, fr, ru, tr) |
| Removed empty dirs | `services/i18n`, `hooks/i18n`, `components/i18n` |

### ✅ Completed: Git Unstaged Changes
| Action | File |
|--------|------|
| Safe JSON parser | `BillingDashboard.jsx` — wrapped API calls with safeParse |
| Error handling | `PricingPage.jsx` — added JSON validation + error messages |
| Dev proxy | `vite.config.js` — added `/api` proxy to localhost:3000 |
| Route fix | `subscriptions.controller.ts` — `@Controller('plans')` → `@Controller('subscriptions/plans')` |
| Stub removal | `billing.controller.ts` — deleted empty file (not registered) |

### ✅ Completed: Fix FE↔BE API Integration
| Root Cause | Fix |
|---|---|
| Vite proxy target `localhost:3000` (wrong port) | Changed to `http://localhost:3001` |
| Proxy `rewrite` was no-op (`/api`→`/api`) | Removed (NestJS already has `setGlobalPrefix('api')`) |
| `.env` has `VITE_API_URL=.../api` | KEPT (correct — baseURL includes `/api`) |
| `catalog.js` used `/api/countries` etc. (double `/api` with baseURL) | Changed to `/countries`, `/cities`, `/currencies`, `/tag` (10 paths) |
| `UpgradePlanPage.jsx` used `users/me/upgrade` (backend expects UUID) | Changed to `users/${user.id}/upgrade` |

### ✅ Activated Subscription/Credits System (2026-05-08)
| Action | Files |
|--------|-------|
| Auto-seed plans on startup | `plan-seed-on-startup.ts` — calls `PlanSeeder.seed()` via `OnApplicationBootstrap` |
| Free subscription after registration | `auth.service.ts` — `initializeFreeSubscription()` creates Free plan subscription + wallet with welcome credits + sets monthlyQuota |
| Register DI wiring | `auth.module.ts` — imports `SubscriptionsModule`, `CreditsModule`, and `TypeOrmModule.forFeature([Plan, Subscription, CreditWallet])` |
| Fixed CreditsWidget token key | `CreditsWidget.jsx` — `"token"` → `STORAGE_KEYS.authToken` |
| CreditsWidget in Sidebar | `Sidebar.jsx` — renders `CreditsWidget` after nav; `Sidebar.css` — `.sidebar-credits` styles (flex-shrink, margin-top: auto) |
| PricingPage/BillingDashboard error handling | Already fixed in prior session (safe JSON parse, empty-body guards) |

### ✅ Auto-Create Calendar Entries from Trip Plans (2026-05-08)
| Action | Files |
|--------|-------|
| Added `tripPlanId`, `tripDay`, `tripCityName` columns | `calendar-entry.entity.ts` — nullable UUID + int + varchar |
| Added `createTripPlanEntries()` | `calendar.service.ts` — creates one CalendarEntry per itinerary day with `sourceType: 'trip_plan'` |
| Added `removeEntriesByTripPlan()` | `calendar.service.ts` — cleans up entries when trip plan is deleted |
| DI wiring | `trip-planner.module.ts` — imports `CalendarModule` |
| Hook into `generate()` | `trip-planner.service.ts:966` — calls `createTripPlanEntries` after saving plan |
| Hook into `createFromGenerated()` | `trip-planner.service.ts:1039` — same for imported plans |
| Hook into `remove()` | `trip-planner.service.ts:786` — calls `removeEntriesByTripPlan` before deleting plan |
| Filter FE duplicates | `TripPlannerCalendarPage.jsx:189` — filters out `sourceType === 'trip_plan'` from personal entries (plans already shown via trip-stops) |

### ✅ Verified
- FE build: PASS (2.25s)
- BE build: PASS
- Zero broken imports

## [TECH_STACK]

### Backend (`waynest-be/`)
| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js / NestJS | @nestjs/core ^11.0.1 |
| Language | TypeScript | ^5.7.3 |
| ORM | TypeORM | ^0.3.28 |
| Database | PostgreSQL (Neon) | pg ^8.19.0 |
| Auth | Passport + JWT | passport-jwt ^4.0.1 |
| Caching | Redis + In-memory HotPathCache | redis ^4.7.1 |
| Real-time | Socket.IO | ^4.8.3 |
| AI | Google Gemini + OpenRouter | @google/generative-ai ^0.24.1 |
| Payments | Stripe | — |
| Push | Web Push (VAPID) | web-push ^3.6.7 |
| Email | Nodemailer (Gmail SMTP) | ^8.0.2 |
| Docs | Swagger | @nestjs/swagger ^11.2.6 |
| Testing | Jest + Supertest | ^30.0.0 / ^7.0.0 |
| Lint | ESLint ^9.18.0 + Prettier ^3.4.2 | — |

### Frontend (`waynest-FE/`)
| Layer | Technology | Version |
|---|---|---|
| Framework | React | ^18.3.1 |
| Build | Vite | ^8.0.0-beta.13 |
| UI Library | Ant Design (antd) | ^6.3.1 |
| Routing | React Router DOM | ^6.30.3 |
| HTTP | Axios | ^1.14.0 |
| State (Server) | @tanstack/react-query | ^5.96.2 |
| i18n | i18next + react-i18next | ^25.10.10 / ^16.6.6 |
| Real-time | socket.io-client | ^4.8.1 |
| Notifications | React Toastify | ^11.0.5 |
| Device Fingerprint | @fingerprintjs/fingerprintjs | ^5.1.0 |
| Lint | ESLint ^9.39.1 | — |

### Languages
| Language | Locale Code | RTL |
|---|---|---|
| English | en | No |
| Arabic | ar | Yes |
| French | fr | No |
| Russian | ru | No |
| Turkish | tr | No |

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
├── api/           → Axios client + 15 domain API modules
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

### P1 — FE Lint Issues (from System Audit) — @audit: known
- `waynest-FE/src/pages/guest/placeDetail/PlaceDetail.jsx` — lint errors (pre-existing, not in current scope)
- `waynest-FE/src/pages/provider/ProviderPublicBusinessPage.jsx` — lint errors (pre-existing)
- General FE lint hardening pass (pre-existing, not in current scope)

### P1 — BE Quality Issues — @audit: known
- BE prettier line-ending inconsistencies (CRLF vs LF) (pre-existing)
- BE unsafe-any hotspots in upload.controller.ts, users.service.ts (pre-existing)
- BE spec file tsconfig include boundaries (pre-existing)

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

### P2 — Missing Test Infrastructure — @audit: known
- No unit tests for FE; No E2E tests; No route-flow smoke checks
