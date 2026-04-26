# Waynest Full System Audit - 2026-04-26

## Scope
- Frontend runtime and build health
- Backend compile, lint, and tests
- Route-level user-flow coverage (guest, user, provider, admin)
- UI/UX navigation clarity and risk points

## Commands Executed
- FE: `npm run lint`
- FE: `npm run build`
- BE: `npm run build`
- BE: `npm run lint -- --no-fix`
- BE: `npm run test -- --runInBand`
- BE targeted test: `npm run test -- src/modules/social-graph/social-graph.service.spec.ts --runInBand`
- FE targeted lint: `npx eslint src/pages/auth/chooseAccount/ChooseAccountMode.jsx`

## Overall Status
- FE build: PASS
- BE build: PASS
- FE lint: FAIL (many errors)
- BE lint: FAIL (many errors)
- BE tests: FAIL (1 suite initially), then targeted failing suite fixed and PASS

## User Flow Coverage (from router)
Source: `waynest-FE/src/router.jsx`

### Guest flows
- Home/Landing: present (`/`)
- Explore and discovery: present (`/explore`, `/destinations`, `/search`)
- Place/event detail: present (`/places/:id`, `/events/:id`)
- Trip planning and share: present (`/plan`, `/trip/:slug`)
- Auth routes: present (`/login`, `/register`, `/verify-email`)
- Invite route: present (`/invite`)

### Signed-in traveler flows (USER + PROVIDER)
- Social feed/profile/settings: present (`/`, `/profile`, `/settings`)
- Social connections: present (`/profile/friends`, `/profile/followers`, `/profile/following`)
- Messaging: present (`/social`, `/inbox`, `/inbox/:id`)
- Notifications and activities: present (`/notifications`, `/activities`)
- Saved content and planning: present (`/wishlist`, `/saved-plans`, `/bookings`)

### Provider flows
- Provider panel base and content: present (`/account/provider`, `/account/provider/places`, `/account/provider/events`, `/account/provider/settings`)
- Public provider page and tabs: present (`/p/:slug`, `/p/:slug/places`, `/p/:slug/events`)
- Provider application flow: present (`/account/provider/apply`, `/register/provider`)

### Admin flows
- Admin dashboard and management pages: present under `/admin-panel/*`

## Critical Findings

1) FE quality gate is failing across many routes
- Numerous `no-unused-vars`, `no-unreachable`, `no-empty`, and hook-related lint violations on user-facing pages.
- High-impact example files:
  - `waynest-FE/src/pages/guest/placeDetail/PlaceDetail.jsx`
  - `waynest-FE/src/pages/provider/ProviderPublicBusinessPage.jsx`
  - `waynest-FE/src/pages/auth/chooseAccount/ChooseAccountMode.jsx` (fixed one hook issue in this audit)

2) BE lint quality gate failing with mixed categories
- Prettier line-ending issues (`Insert CR`) in several files, especially:
  - `waynest-be/src/trip-planner/ai.service.ts`
- Type-safety lint issues:
  - `waynest-be/src/modules/upload/upload.controller.ts`
  - `waynest-be/src/modules/users/users.service.ts`
- Spec parsing scope errors (tsconfig include boundaries) on multiple spec files.

3) BE test suite had a broken unit spec constructor dependency
- Failing file:
  - `waynest-be/src/modules/social-graph/social-graph.service.spec.ts`
- Root cause:
  - `SocialGraphService` constructor gained an additional dependency (`friendshipsRepo`) but test initialization still passed old argument count.
- Fixed in this audit.

## Fixes Applied During This Audit

1) Backend test fix
- Updated constructor args in:
  - `waynest-be/src/modules/social-graph/social-graph.service.spec.ts`
- Result:
  - targeted test now PASS.

2) Frontend hook-stability fix (account chooser)
- Removed direct state reset pattern inside effect and switched to source-based failed-image tracking in:
  - `waynest-FE/src/pages/auth/chooseAccount/ChooseAccountMode.jsx`
- Result:
  - file-scoped lint PASS.

3) Navigation clarity UX enhancement already present and validated
- Contextual current-view hint in panel navbar:
  - `waynest-FE/src/components/panel/Navbar.jsx`
  - `waynest-FE/src/components/panel/Navbar.css`
- Purpose:
  - reduce orientation loss for admin/provider users.

## UX Evaluation (Design / Usability)

Strengths
- Strong visual token system and consistent modern look (global variables and component theming).
- Distinct workspace layouts for guest/social/provider/admin reduce role confusion.
- Sticky navbar + sidebar patterns improve orientation.

Risks
- Lint-level dead code and unreachable blocks can produce inconsistent behavior across critical pages.
- Provider public pages currently include compiler/lint concerns around memoization/effect patterns.
- High route count increases regression risk without flow-based automated checks.

## Priority Action Plan (Execution-Ready)

P0 (Immediate)
- Stabilize FE lint in top user flows first:
  - `waynest-FE/src/pages/guest/placeDetail/PlaceDetail.jsx`
  - `waynest-FE/src/pages/provider/ProviderPublicBusinessPage.jsx`
  - `waynest-FE/src/pages/guest/explore/Explore.jsx`
- Standardize BE line endings + prettier formatting in targeted files with highest noise.

P1 (Short-term)
- Fix BE unsafe-any hotspots in:
  - `waynest-be/src/modules/upload/upload.controller.ts`
  - `waynest-be/src/modules/users/users.service.ts`
- Ensure lint parser includes all spec files in tsconfig-aware project service.

P2 (Reliability)
- Add route-flow smoke checks for key journeys:
  - Guest discovery journey
  - User login -> profile -> wishlist -> bookings
  - Provider dashboard -> places/events -> public page
  - Admin dashboard -> core CRUD pages

## Final Verdict
System architecture and route coverage are strong, and both FE/BE builds pass. However, quality gates are not yet production-clean due to broad lint failures and a subset of test/lint configuration issues. Core reliability improved during this audit by fixing one broken backend test and one frontend hook issue, but a focused lint-hardening pass is still required for full readiness.
