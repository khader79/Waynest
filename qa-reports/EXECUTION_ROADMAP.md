# WAYNEST — PRIORITIZED EXECUTION ROADMAP
**Date:** 2026-05-18
**Based on:** Comprehensive QA Audit (87 issues found)

---

## 🚨 PHASE 1: IMMEDIATE — THIS WEEK (P0)

**Goal:** Eliminate critical security vulnerabilities and show-stopping bugs.

| # | Action | Files | Est. Time | Risk if Skipped |
|---|--------|-------|-----------|-----------------|
| 1 | Rotate ALL exposed secrets | `waynest-be/.env` | 2h | Complete system compromise |
| 2 | Remove `.env` from git history | `.git/` | 1h | Secrets remain accessible |
| 3 | Generate strong JWT secret | `.env`, `auth.module.ts` | 30m | Token forgery |
| 4 | Fix `ROUTES.reviews` undefined | `api/routes.js` | 15m | Review features crash |
| 5 | Add file upload MIME validation | `upload.controller.ts` | 2h | Malware/RCE |
| 6 | Implement brute force protection | `auth.service.ts` | 3h | Credential stuffing |
| 7 | Add Stripe webhook idempotency | `stripe-billing-adapter.ts` | 2h | Double-charging |
| 8 | Add transaction handling to billing | `billing.service.ts` | 2h | Data inconsistency |

**Total Est. Time:** ~13 hours
**Team:** 1 Backend Engineer + 1 Security Engineer

---

## 🔥 PHASE 2: HIGH PRIORITY — NEXT 2 WEEKS (P1)

**Goal:** Secure authentication, fix performance bottlenecks, stabilize core features.

### Week 1: Security & Auth
| # | Action | Files | Est. Time |
|---|--------|-------|-----------|
| 9 | Migrate JWT from localStorage to httpOnly cookies | `auth.js`, `auth.controller.ts` | 4h |
| 10 | Implement token revocation (Redis blacklist) | `auth.service.ts`, `JwtStrategy.ts` | 4h |
| 11 | Fix XSS via i18n `escapeValue: true` | `i18n.js` | 1h |
| 12 | Add CSRF protection | `main.ts`, `client.js` | 3h |
| 13 | Enforce email verification on login | `auth.service.ts` | 1h |
| 14 | Strengthen password policy | `register.dto.ts`, `create-user.dto.ts` | 1h |

### Week 2: Performance & Stability
| # | Action | Files | Est. Time |
|---|--------|-------|-----------|
| 15 | Fix `fetchAllCountries` unbounded requests | `api/catalog.js` | 2h |
| 16 | Add React.memo to PostCard, Stories, AdminTable | Multiple components | 4h |
| 17 | Convert manual fetch to React Query (critical paths) | `useUserProfilePage.js`, `RightSidebar.jsx` | 6h |
| 18 | Add image lazy loading | All `<img>` tags | 2h |
| 19 | Remove `Cache-Control: no-cache` from GET | `api/client.js` | 30m |
| 20 | Add database indexes for feed/social queries | Migrations | 3h |

**Total Est. Time:** ~32 hours
**Team:** 1 Frontend Engineer + 1 Backend Engineer

---

## 📋 PHASE 3: RECOMMENDED — NEXT MONTH (P2)

**Goal:** Improve UX, fix translations, optimize architecture.

### Week 1-2: Translations & UX
| # | Action | Files | Est. Time |
|---|--------|-------|-----------|
| 21 | Fix Arabic translations (810 missing keys) | `public/locales/ar/` | 8h |
| 22 | Fix Italian divergence (975 extra keys) | `public/locales/it/` | 4h |
| 23 | Fix hardcoded strings in ProviderApplication | `ProviderApplication.jsx` | 1h |
| 24 | Fix placeholder mismatches | Multiple locale files | 2h |
| 25 | Add focus trap to mobile drawer | `MainLayout.jsx` | 2h |
| 26 | Add error boundaries to pages | Multiple pages | 3h |

### Week 3-4: Performance & Architecture
| # | Action | Files | Est. Time |
|---|--------|-------|-----------|
| 27 | Implement token refresh flow | `auth.service.ts`, `AuthContext.jsx` | 6h |
| 28 | Add virtualization to social feed | `Feed.jsx` | 4h |
| 29 | Add rate limiting per endpoint | `app.module.ts` | 3h |
| 30 | Implement Redis-based rate limiting | `rateLimiter.ts` | 3h |
| 31 | Split `useTripPlanner` into smaller hooks | `useTripPlanner.js` | 6h |
| 32 | Implement AI cost controls | `ai.service.ts` | 3h |
| 33 | Add storage quotas for uploads | `upload.controller.ts` | 3h |
| 34 | Fix prompt injection in AI | `ai.service.ts` | 2h |
| 35 | Add public endpoint caching | `main.ts`, `hot-path-cache.ts` | 3h |
| 36 | Replace KEYS with SCAN in Redis | `hot-path-cache.ts` | 1h |
| 37 | Add Vite manualChunks | `vite.config.js` | 1h |

**Total Est. Time:** ~50 hours
**Team:** 1 Frontend Engineer + 1 Backend Engineer + 1 Translator

---

## 🔮 PHASE 4: LONG-TERM — NEXT QUARTER (P3)

**Goal:** Enterprise-grade quality, scalability, and maintainability.

| # | Action | Est. Time | Impact |
|---|--------|-----------|--------|
| 38 | Add TypeScript to frontend | 40h | Type safety, fewer bugs |
| 39 | Implement comprehensive test suite | 60h | Regression prevention |
| 40 | Set up CI/CD pipeline | 16h | Automated deployment |
| 41 | Add error tracking (Sentry) | 8h | Production monitoring |
| 42 | Add performance monitoring | 8h | Performance insights |
| 43 | Consolidate duplicate API layers | 12h | Maintainability |
| 44 | Implement WebP/AVIF conversion | 16h | Bandwidth savings |
| 45 | Add comprehensive accessibility | 24h | WCAG 2.1 AA compliance |
| 46 | Set up CDN for static assets | 8h | Global performance |
| 47 | Implement comprehensive audit logging | 16h | Compliance, debugging |

**Total Est. Time:** ~208 hours
**Team:** Full team (2 FE + 2 BE + 1 QA + 1 DevOps)

---

## RESOURCE REQUIREMENTS

### Phase 1 (P0)
- **Team:** 1 Backend Engineer + 1 Security Engineer
- **Duration:** 2-3 days
- **Cost:** ~$2,000 (assuming $100/hr)

### Phase 2 (P1)
- **Team:** 1 Frontend Engineer + 1 Backend Engineer
- **Duration:** 2 weeks
- **Cost:** ~$6,400

### Phase 3 (P2)
- **Team:** 1 Frontend Engineer + 1 Backend Engineer + 1 Translator
- **Duration:** 4 weeks
- **Cost:** ~$10,000

### Phase 4 (P3)
- **Team:** Full team
- **Duration:** 8-12 weeks
- **Cost:** ~$40,000

### Total Estimated Cost: ~$58,400

---

## SUCCESS METRICS

### Phase 1 Success Criteria
- [ ] No secrets in git history
- [ ] JWT secret is 256+ bits random
- [ ] Review API calls work without errors
- [ ] File uploads reject dangerous types
- [ ] Account locks after 5 failed login attempts
- [ ] Stripe webhooks processed exactly once
- [ ] Billing operations are atomic

### Phase 2 Success Criteria
- [ ] JWT stored in httpOnly cookies
- [ ] Token revocation works on logout
- [ ] No XSS via i18n interpolation
- [ ] CSRF tokens on state-changing requests
- [ ] Unverified emails cannot login
- [ ] Password policy enforced (12+ chars, complexity)
- [ ] Catalog requests limited to 5 concurrent
- [ ] PostCard re-renders reduced by 40%+
- [ ] React Query caching active on critical paths
- [ ] Images lazy loaded
- [ ] GET requests cacheable
- [ ] Feed queries use indexes

### Phase 3 Success Criteria
- [ ] Arabic translation 95%+ complete
- [ ] Italian translation aligned with English
- [ ] No hardcoded strings in JSX
- [ ] Mobile drawer focus trap working
- [ ] Error boundaries on all pages
- [ ] Token refresh flow working
- [ ] Social feed virtualized
- [ ] Rate limiting per endpoint active
- [ ] `useTripPlanner` split into <200 line hooks
- [ ] AI cost controls active
- [ ] Upload storage quotas enforced
- [ ] Public endpoints cached

### Phase 4 Success Criteria
- [ ] TypeScript coverage 80%+
- [ ] Test coverage 70%+
- [ ] CI/CD pipeline automated
- [ ] Sentry error tracking active
- [ ] Performance monitoring dashboard
- [ ] Single API layer
- [ ] WebP/AVIF images served
- [ ] WCAG 2.1 AA compliance
- [ ] CDN serving static assets
- [ ] Audit logging on all admin actions

---

## RISK ASSESSMENT

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Secret rotation breaks services | Medium | High | Test in staging first |
| JWT cookie migration breaks auth | Medium | High | Dual-support period |
| React Query migration introduces bugs | Low | Medium | Thorough testing |
| Translation fixes break RTL | Low | Medium | Visual QA for ar/he/ur |
| TypeScript migration slow | High | Low | Incremental adoption |
| CI/CD setup delays | Low | Medium | Use proven templates |

---

## NEXT STEPS

1. **Review this roadmap** with the team
2. **Prioritize Phase 1** — start immediately
3. **Set up tracking** — Jira/Linear board with these items
4. **Assign owners** — each item needs a responsible engineer
5. **Set deadlines** — Phase 1 by end of week, Phase 2 in 2 weeks
6. **Daily standups** — track progress on critical items
7. **Weekly reviews** — assess completion and adjust priorities
