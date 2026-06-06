# Waynest — توثيق شامل للمشروع

> آخر تحديث: 2026-06-06

---

## جدول المحتويات

1. [نظرة عامة](#1-نظرة-عامة)
2. [هيكل المجلدات](#2-هيكل-المجلدات)
3. [Backend — NestJS](#3-backend--nestjs)
   - 3.1 [نقطة البداية main.ts](#31-نقطة-البداية-maints)
   - 3.2 [AppModule — الجذر](#32-appmodule--الجذر)
   - 3.3 [قائمة الـ Modules (34 وحدة)](#33-قائمة-الـ-modules-34-وحدة)
   - 3.4 [المكتبات والحزم](#34-المكتبات-والحزم)
   - 3.5 [Common — الأدوات المشتركة](#35-common--الأدوات-المشتركة)
   - 3.6 [قاعدة البيانات](#36-قاعدة-البيانات)
   - 3.7 [نظام الـ Auth](#37-نظام-الـ-auth)
   - 3.8 [Trip Planner Module (AI)](#38-trip-planner-module-ai)
   - 3.9 [Background Jobs — BullMQ](#39-background-jobs--bullmq)
4. [Frontend — React/Vite](#4-frontend--reactvite)
   - 4.1 [نقطة البداية](#41-نقطة-البداية)
   - 4.2 [App.jsx — مكدس الـ Providers](#42-appjsx--مكدس-الـ-providers)
   - 4.3 [نظام الـ Routing](#43-نظام-الـ-routing)
   - 4.4 [المكتبات والحزم](#44-المكتبات-والحزم)
   - 4.5 [التصميم — Ant Design](#45-التصميم--ant-design)
   - 4.6 [الـ Hooks المخصصة](#46-الـ-hooks-المخصصة)
   - 4.7 [نظام الـ i18n (14 لغة)](#47-نظام-الـ-i18n-14-لغة)
5. [قاعدة البيانات والـ ORM](#5-قاعدة-البيانات-والـ-orm)
6. [نظام الـ AI — منظومة الذكاء الاصطناعي](#6-نظام-الـ-ai--منظومة-الذكاء-الاصطناعي)
7. [الـ Real-Time — Socket.IO](#7-الـ-real-time--socketio)
8. [المدفوعات — Stripe](#8-المدفوعات--stripe)
9. [متغيرات البيئة (.env)](#9-متغيرات-البيئة-env)
10. [الـ Deployment — Vercel](#10-الـ-deployment--vercel)
11. [TypeScript Config](#11-typescript-config)
12. [خريطة الـ API Endpoints](#12-خريطة-الـ-api-endpoints)

---

## 1. نظرة عامة

**Waynest** منصة سفر ذكية متكاملة تجمع بين:
- تخطيط رحلات بالذكاء الاصطناعي
- شبكة اجتماعية للمسافرين
- نظام حجوزات وفواتير
- لوحة إدارة كاملة
- دعم للمزودين/الأعمال (Providers)

```
Waynest/
├── waynest-be/    ← Backend: NestJS + TypeORM + PostgreSQL
└── waynest-FE/    ← Frontend: React 18 + Vite + Ant Design
```

**الاستضافة:** Vercel (Backend كـ Serverless Functions، Frontend كـ Static Site)
**قاعدة البيانات:** PostgreSQL على Neon Cloud
**الكاش:** Redis (اختياري، يعمل بدونه)

---

## 2. هيكل المجلدات

### Backend

```
waynest-be/
├── api/                        ← Vercel serverless entry
│   ├── index.js
│   └── index.ts
├── db/migrations/              ← SQL migration files
├── seed/                       ← بيانات أولية
├── uploads/                    ← رفع الملفات
├── src/
│   ├── main.ts                 ← نقطة البداية
│   ├── app.module.ts           ← الجذر (يجمع كل الـ modules)
│   ├── app.controller.ts       ← endpoint رئيسي بسيط
│   ├── app.service.ts
│   ├── data-source.ts          ← TypeORM CLI config
│   ├── common/                 ← أدوات مشتركة (guards, filters...)
│   ├── database/               ← إعداد TypeORM
│   ├── jobs/                   ← BullMQ jobs
│   ├── migrations/             ← TypeORM migration classes
│   ├── modules/                ← كل الـ feature modules (33 وحدة)
│   └── trip-planner/           ← وحدة AI Trip Planner
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── vercel.json
```

### Frontend

```
waynest-FE/
├── public/
│   ├── images/
│   └── locales/                ← ملفات الترجمة (14 لغة)
│       ├── ar/, en/, fr/, de/, es/
│       ├── he/, hi/, it/, ja/, ko/
│       ├── pt/, ru/, tr/, ur/, zh/
├── src/
│   ├── main.jsx                ← نقطة البداية
│   ├── App.jsx                 ← Root component + Providers
│   ├── router.jsx              ← كل الـ routes (~700 سطر)
│   ├── api/                    ← axios clients
│   ├── components/             ← مكونات قابلة للإعادة
│   ├── context/                ← React Contexts
│   ├── design-system/          ← Tokens & theme
│   ├── hooks/                  ← Custom hooks
│   ├── layouts/                ← Page layouts
│   ├── pages/                  ← صفحات كاملة
│   ├── services/               ← Business logic
│   ├── styles/                 ← Global CSS
│   ├── utils/                  ← Helper functions
│   └── i18n.js                 ← إعداد i18next
├── tests/                      ← E2E + unit tests
├── tsconfig.json
├── vite.config.js
└── vercel.json
```

---

## 3. Backend — NestJS

### 3.1 نقطة البداية main.ts

ملف `waynest-be/src/main.ts` يقوم بـ:

| الخطوة | ماذا يفعل |
|--------|-----------|
| CORS | يسمح فقط للـ origins المعرّفة في `FRONTEND_URL` |
| Static Files | يقدّم مجلد `uploads/` على prefix `/uploads` |
| Redis Adapter | يربط Socket.IO بـ Redis للـ scaling (fallback لـ default adapter) |
| Helmet | يضبط HTTP security headers مع CSP مخصص |
| Cookie Parser | يفكك cookies (مهم لـ JWT httpOnly) |
| CSRF Protection | يتحقق من Origin/Referer لطلبات POST/PUT/DELETE |
| Compression | يضغط responses > 2048 byte |
| Cache Control | `no-store` للـ API، `immutable` للملفات |
| Slow Request Middleware | يسجّل الطلبات البطيئة |
| Validation Pipe | `whitelist: true` + `transform: true` تلقائياً |
| Swagger | متاح في `/api/docs` (إلا في production) |
| Port | يستمع على `PORT` (افتراضي 3001) |

---

### 3.2 AppModule — الجذر

ملف `waynest-be/src/app.module.ts` يجمع **كل الـ modules**:

```
ConfigModule (global)     ← يقرأ ملفات .env
TypeOrmModule             ← الاتصال بـ PostgreSQL
ThrottlerModule           ← rate limiting: 100 req / 60s
BullModule                ← job queues على Redis
RedisModule               ← Redis client مشترك
TranslationsModule        ← رسائل الخطأ متعددة اللغات
+ 34 feature module       ← (انظر القسم 3.3)
```

**الـ Global Providers:**
- `ThrottlerGuard` — يُطبَّق على كل الـ routes تلقائياً
- `HttpExceptionFilter` — يُوحِّد شكل الـ error responses

---

### 3.3 قائمة الـ Modules (34 وحدة)

| # | Module | الوصف |
|---|--------|-------|
| 1 | `auth` | تسجيل الدخول، JWT، invites |
| 2 | `users` | ملفات المستخدمين، الإعدادات |
| 3 | `providers` | حسابات الأعمال/المزودين |
| 4 | `provider-applications` | طلبات الانضمام كمزود |
| 5 | `provider-membership` | عضويات المزودين |
| 6 | `place` | الأماكن والمواقع السياحية |
| 7 | `place-images` | صور الأماكن |
| 8 | `place-opening-hours` | أوقات العمل |
| 9 | `placepricing` | قواعد التسعير |
| 10 | `cities` | إدارة المدن |
| 11 | `countries` | إدارة الدول |
| 12 | `currencies` | العملات وأسعار الصرف |
| 13 | `event` | الفعاليات والأحداث |
| 14 | `bookings` | الحجوزات |
| 15 | `calendar` | التقويم الشخصي للرحلات |
| 16 | `trip-planner` | **مخطط الرحلات بالـ AI** |
| 17 | `review` | التقييمات والتعليقات |
| 18 | `tag` | الوسوم (tags) |
| 19 | `social-graph` | متابعة، صداقة، حظر |
| 20 | `social-content` | المنشورات الاجتماعية |
| 21 | `stories` | القصص (Stories) |
| 22 | `chat` | المحادثات الفردية |
| 23 | `notifications` | الإشعارات (WebSocket + Web Push) |
| 24 | `wishlist` | المفضلة / Saved Places |
| 25 | `search` | البحث الشامل |
| 26 | `upload` | رفع الملفات |
| 27 | `subscriptions` | خطط الاشتراك |
| 28 | `billing` | الفواتير والمدفوعات |
| 29 | `credits` | نظام النقاط والائتمانات |
| 30 | `features` | Feature flags |
| 31 | `usage` | تتبع الاستخدام والتحليلات |
| 32 | `email-verification` | التحقق من البريد |
| 33 | `contact` | نموذج التواصل |
| 34 | `admin` | لوحة الإدارة الكاملة |

> **ملاحظة:** `jobs` (BullMQ) و `redis` و `translations` modules مشتركة ومدمجة في الـ common infrastructure.

---

### 3.4 المكتبات والحزم

#### NestJS Core

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `@nestjs/common` | ^11.1.17 | الأدوات الأساسية (decorators, pipes...) |
| `@nestjs/core` | ^11.0.1 | محرك NestJS |
| `@nestjs/platform-express` | ^11.1.17 | Express adapter |
| `@nestjs/config` | ^4.0.3 | إدارة متغيرات البيئة |
| `@nestjs/jwt` | ^11.0.2 | JWT tokens |
| `@nestjs/passport` | ^11.0.5 | Authentication middleware |
| `@nestjs/typeorm` | ^11.0.0 | TypeORM integration |
| `@nestjs/websockets` | ^11.1.17 | WebSocket support |
| `@nestjs/platform-socket.io` | ^11.1.17 | Socket.IO adapter |
| `@nestjs/bullmq` | ^11.0.4 | Job queue |
| `@nestjs/schedule` | ^5.0.0 | Cron jobs |
| `@nestjs/swagger` | ^11.2.6 | API docs توثيق |
| `@nestjs/throttler` | ^6.5.0 | Rate limiting |
| `@nestjs/mapped-types` | ^2.1.1 | PartialType, PickType للـ DTOs |

#### Database & Caching

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `typeorm` | ^0.3.28 | ORM — التعامل مع قاعدة البيانات |
| `pg` | ^8.19.0 | PostgreSQL driver |
| `redis` | ^4.7.1 | Redis client |
| `@socket.io/redis-adapter` | ^8.3.0 | Socket.IO على Redis |
| `bullmq` | ^5.78.0 | Job/Queue system |

#### Auth & Security

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `passport` | ^0.7.0 | Authentication framework |
| `passport-jwt` | ^4.0.1 | JWT strategy |
| `bcrypt` | ^6.0.0 | تشفير كلمات المرور |
| `helmet` | ^8.1.0 | HTTP security headers |
| `cookie-parser` | ^1.4.7 | قراءة cookies |

#### Validation & Transformation

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `class-validator` | ^0.14.0 | validation decorators للـ DTOs |
| `class-transformer` | ^0.5.1 | تحويل البيانات (plainToClass...) |

#### AI & External APIs

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `@google/generative-ai` | ^0.24.1 | Gemini AI SDK |
| `axios` | ^1.13.6 | HTTP client (OpenRouter, Groq, Weather...) |

#### Payments & Notifications

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `stripe` | ^22.1.1 | معالجة المدفوعات |
| `web-push` | ^3.6.7 | Web Push notifications |
| `nodemailer` | ^8.0.2 | إرسال البريد الإلكتروني |

#### Utilities

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `compression` | ^1.8.1 | ضغط HTTP responses |
| `lodash` | ^4.18.1 | أدوات JavaScript |
| `slugify` | ^1.6.6 | توليد URL slugs |
| `rxjs` | ^7.8.1 | Reactive programming |
| `reflect-metadata` | ^0.2.2 | مطلوب لـ decorators |
| `dotenv` | ^17.4.2 | تحميل .env |
| `world-countries` | ^5.1.0 | بيانات الدول |
| `aws-serverless-express` | ^3.4.0 | AWS Lambda adapter |

#### DevDependencies

| الحزمة | الوظيفة |
|--------|---------|
| `typescript` ^5.7.3 | TypeScript compiler |
| `ts-node` ^10.9.2 | تشغيل TypeScript مباشرة |
| `ts-jest` ^29.2.5 | Jest مع TypeScript |
| `jest` ^30.0.0 | Testing framework |
| `supertest` ^7.0.0 | HTTP testing |
| `@nestjs/testing` ^11.1.19 | NestJS testing utilities |
| `prettier` ^3.4.2 | Code formatting |
| `eslint` ^9.18.0 | Code linting |
| `tsc-alias` ^1.8.16 | Path aliases في compiled output |

---

### 3.5 Common — الأدوات المشتركة

**مجلد:** `waynest-be/src/common/`

```
common/
├── adapters/
│   └── redis-io.adapter.ts        ← يربط Socket.IO بـ Redis
├── config-defaults.ts             ← قيم افتراضية للـ config
├── decorators/
│   ├── requires-credits.decorator.ts  ← @RequiresCredits(n)
│   └── requires-feature.decorator.ts  ← @RequiresFeature('flag')
├── entities/
│   ├── base.entity.ts             ← id, createdAt, updatedAt (مشترك)
│   └── audit-log.entity.ts        ← سجل التغييرات
├── filters/
│   └── http-exception.filter.ts   ← توحيد شكل الـ errors
├── guards/
│   └── subscription-feature.guard.ts ← حماية بالاشتراك
├── logging/
│   └── typeorm-nest-logger.ts     ← TypeORM logger مخصص
├── middleware/
│   └── slow-request.middleware.ts ← يسجّل الطلبات > SLOW_REQUEST_MS
├── redis/
│   └── redis.module.ts            ← Redis provider مشترك
├── services/
│   └── audit-log.service.ts       ← تسجيل العمليات
├── translations/
│   ├── api-error.catalog.ts       ← قاموس رسائل الخطأ
│   ├── translation.service.ts     ← خدمة الترجمة
│   └── translations.module.ts
└── utils/
    ├── contentModeration.ts       ← فلترة المحتوى
    ├── cursor-pagination.ts       ← Cursor-based pagination
    ├── hot-path-cache.ts          ← Cache للمسارات الساخنة
    ├── id.util.ts                 ← توليد IDs
    ├── rateLimiter.ts             ← Rate limiter مخصص
    └── redis-client.ts            ← Redis client factory
```

---

### 3.6 قاعدة البيانات

**النوع:** PostgreSQL على **Neon Cloud** (serverless PostgreSQL)

**الاتصال:** `waynest-be/src/database/typeorm.config.ts`

```
DATABASE_URL              ← Connection string (pooler)
DB_HOST, DB_PORT          ← 5432
DB_USERNAME, DB_PASSWORD
DB_NAME
DB_SSL=true               ← إلزامي مع Neon
DB_POOL_MAX=30
DB_POOL_MIN=5
DB_CONNECT_TIMEOUT_MS=8000
DB_QUERY_TIMEOUT_MS=30000
DB_SYNC=false             ← لا تعدّل الجداول تلقائياً في production
```

**Migrations:**
```bash
npm run migration:generate  ← ينشئ migration من الـ entities
npm run migration:run       ← يطبّق التغييرات
npm run migration:revert    ← يرجع آخر migration
npm run migration:show      ← يعرض حالة كل migration
```

**Base Entity** (`common/entities/base.entity.ts`):
كل entity ترث منها وتحصل تلقائياً على:
- `id` — UUID
- `createdAt` — timestamp
- `updatedAt` — timestamp

---

### 3.7 نظام الـ Auth

**مجلد:** `waynest-be/src/modules/auth/`

**الآلية:** JWT tokens مخزّنة في `httpOnly cookies` (أأمن من localStorage)

**Flow التسجيل/الدخول:**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/verify-email
POST /api/auth/invite          ← إنشاء دعوة
POST /api/auth/invite/activate ← تفعيل دعوة
```

**الـ Guards:**
| Guard | الاستخدام |
|-------|-----------|
| `JwtAuthGuard` | `@UseGuards(JwtAuthGuard)` — يتطلب token صالح |
| `OptionalJwtAuthGuard` | يكمل الطلب سواء كان مسجّلاً أم لا |
| `RolesGuard` | `@Roles('ADMIN')` — يتطلب role معين |
| `SubscriptionFeatureGuard` | `@RequiresFeature('X')` — يتطلب ميزة في الاشتراك |

**أدوار المستخدمين:**
- `USER` — مستخدم عادي
- `PROVIDER` — صاحب عمل/مزود
- `ADMIN` — مدير النظام

**JWT Strategy** (`JwtStrategy.ts`):
- يقرأ token من cookie أو Authorization header
- يستخرج `userId` و `role`
- يضيفهم لـ `req.user`

---

### 3.8 Trip Planner Module (AI)

**مجلد:** `waynest-be/src/trip-planner/`

#### ملفات الوحدة

```
trip-planner/
├── trip-planner.module.ts
├── trip-planner.controller.ts     ← REST endpoints
├── trip-planner.service.ts        ← Business logic رئيسية
├── ai.service.ts                  ← AI orchestration (Groq→OpenRouter→Gemini→HF)
├── gemini.service.ts              ← Gemini API مباشرة
├── geo-routing.service.ts         ← تحسين المسار الجغرافي
├── image-fetcher.service.ts       ← جلب صور الأماكن
├── media-enrichment.service.ts    ← إثراء البيانات
├── trip-cache.service.ts          ← Caching layer
├── expense.service.ts             ← تتبع المصاريف
├── expense.controller.ts
├── sharing.service.ts             ← مشاركة الخطط
├── backfill-trip-calendar-entries.ts
├── dto/
│   ├── create-trip-planner.dto.ts ← city, days, budget, persons, travelerType...
│   ├── update-trip-planner.dto.ts
│   ├── replan-day.dto.ts          ← NEW: إعادة تخطيط يوم واحد
│   ├── save-generated-plan.dto.ts
│   ├── trip-advanced.dto.ts
│   ├── trip-sharing.dto.ts
│   ├── create-expense.dto.ts
│   └── expense-query.dto.ts
└── entities/
    ├── trip-planner.entity.ts     ← الـ entity الرئيسية
    ├── expense.entity.ts
    └── trip-plan-view.entity.ts
```

#### API Endpoints

```
POST   /api/trip-planner                ← إنشاء رحلة جديدة (يخصم 5 credits)
GET    /api/trip-planner                ← قائمة رحلاتي
GET    /api/trip-planner/:id            ← تفاصيل رحلة
PATCH  /api/trip-planner/:id            ← تعديل
DELETE /api/trip-planner/:id            ← حذف
POST   /api/trip-planner/:id/replan-day ← NEW: إعادة تخطيط يوم
GET    /api/trip-planner/shared/:slug   ← عرض رحلة مشاركة

POST   /api/trip-planner/:id/expenses   ← إضافة مصروف
GET    /api/trip-planner/:id/expenses   ← قائمة المصاريف
```

#### متغيرات البيئة الخاصة بـ Trip Planner

```env
TRIP_PLANNER_USE_AI=true               ← تفعيل AI (افتراضي: false)
TRIP_PLANNER_AI_TIMEOUT_MS=50000       ← timeout للـ AI
TRIP_PLANNER_AI_PRICE_ESTIMATE=false   ← تقدير الأسعار بالـ AI
TRIP_EXTERNAL_SIGNAL_TIMEOUT_MS=1800   ← timeout للـ APIs الخارجية
OPENWEATHER_API_KEY                    ← للطقس 5 أيام
```

#### خوارزمية توليد الرحلة

```
1. استقبال: city, days, budget, persons, travelerType, mobilityLevel, ageGroups
2. جلب الأماكن من DB للمدينة
3. جلب توقعات الطقس 5 أيام (OpenWeather)
4. تسجيل النقاط لكل مكان (Destination Scoring Engine):
   - Rating:   35 نقطة
   - Interests: 30 نقطة (تطابق نوع المسافر)
   - Weather:  20 نقطة (توافق مع الطقس)
   - Budget:   15 نقطة
5. إذا TRIP_PLANNER_USE_AI=true:
   ← ترسل الأماكن المُرتّبة + ملف المسافر + توقعات الطقس + الميزانية للـ AI
   ← Chain: Groq → OpenRouter → Gemini → HuggingFace
6. إذا AI مُعطّل:
   ← تُبنى خطة قواعدية بناءً على type المكان
7. حقن الفعاليات (Events) في الخطة
8. تحسين المسار الجغرافي (geo-routing)
9. إضافة التواريخ على كل يوم
10. حفظ الخطة + خصم 5 credits + إنشاء calendar entries
```

#### ملفات المسافر (8 أنواع)

| النوع | الأولوية |
|-------|---------|
| `ADVENTURE` | أماكن خارجية، مشي، طبيعة |
| `LUXURY` | أعلى تقييم، راحة، مطاعم فاخرة |
| `BACKPACKER` | مجاني/رخيص، كفاءة قصوى |
| `FAMILY` | مناسب للأطفال، وتيرة هادئة |
| `SOLO` | كافيهات اجتماعية، استكشاف حر |
| `COUPLE` | رومانسي، مناظر، مساء مميز |
| `STUDENT` | ثقافي، اقتصادي، حياة محلية |
| `BUSINESS` | مدمج، سريع، مطاعم مميزة |

#### نظام الطقس

- جلب توقعات 5 أيام من OpenWeather API
- أيام ممطرة ← أفضلية للأماكن الداخلية
- أيام حارة ← صباح وليل للأماكن الخارجية
- كل يوم في الخطة يحتوي على بيانات الطقس

#### توزيع الميزانية

حسب نوع المسافر، توزيع تلقائي:
```
طعام / جذب سياحي / مواصلات / تسوق / طوارئ
```

---

### 3.9 Background Jobs — BullMQ

**مجلد:** `waynest-be/src/jobs/`

يُستخدم BullMQ (على Redis) للعمليات الثقيلة في الخلفية مثل:
- إرسال البريد الإلكتروني
- معالجة الصور
- إشعارات Web Push
- مزامنة البيانات

```env
REDIS_URL=redis://...    ← أو REDIS_HOST + REDIS_PORT
```

> إذا كان Redis غير متاح، يعمل النظام بدون jobs (graceful fallback).

---

## 4. Frontend — React/Vite

### 4.1 نقطة البداية

```
waynest-FE/src/main.jsx
```

يُنشئ root React app ويُركّب `<App />` في `#root`.

---

### 4.2 App.jsx — مكدس الـ Providers

الـ providers مُرتّبة من الخارج للداخل:

```
QueryClientProvider          ← TanStack Query (staleTime: 30s)
  └─ ErrorBoundary
      └─ AntdApp
          └─ ConfigProvider (Ant Design theme)
              └─ AuthProvider        ← من هو المستخدم؟
                  └─ NotificationsProvider
                      └─ LoadingProvider
                          └─ CurrencyProvider
                              └─ AppShell
                                  └─ Router + Routes
```

**AppShell يفعل:**
- Device fingerprinting
- اكتشاف اللغة وضبط RTL
- مراقبة Offline/Online
- Toast Container (RTL-aware)

---

### 4.3 نظام الـ Routing

**ملف:** `waynest-FE/src/router.jsx`

#### الـ Layouts

| Layout | يُستخدم لـ |
|--------|-----------|
| `GuestLayout` | الصفحات العامة |
| `AuthLayout` | Login, Register... |
| `SocialLayout` | الشبكة الاجتماعية |
| `AdminLayout` | لوحة الإدارة |
| `ProviderLayout` | حسابات الأعمال |

#### أهم المسارات

**عامة:**
```
/           ← الرئيسية
/explore    ← استكشاف الوجهات
/plan       ← مخطط الرحلات (Trip Planner)
/places/:id ← تفاصيل مكان
/events/:id ← تفاصيل فعالية
/search     ← البحث
```

**مصادق عليه:**
```
/calendar           ← التقويم
/saved-plans        ← رحلاتي المحفوظة
/saved-plans/:id    ← تفاصيل رحلة
/bookings           ← حجوزاتي
/wishlist           ← مفضلتي
/profile            ← ملفي الشخصي
/billing            ← الفواتير
/notifications      ← الإشعارات
```

**المزود:**
```
/account/provider           ← لوحة تحكم المزود
/account/provider/places    ← أماكني
/account/provider/events    ← فعالياتي
/account/provider/bookings  ← حجوزاتي
```

**الإدارة:**
```
/admin-panel          ← Dashboard
/admin-panel/users    ← إدارة المستخدمين
/admin-panel/places   ← إدارة الأماكن
... (16 صفحة إدارية)
```

#### حماية الـ Routes

```jsx
<RequireAuth />          ← يحتاج JWT
<RequireGuest />         ← لا يُسمح لمن سجّل دخوله
<RequireUserRole />      ← USER أو PROVIDER فقط
<TravelerOrRedirect />   ← USER/PROVIDER (ADMIN يُحوَّل لـ admin panel)
```

---

### 4.4 المكتبات والحزم

#### React Ecosystem

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `react` | ^18.3.1 | UI framework |
| `react-dom` | ^18.3.1 | DOM rendering |
| `react-router-dom` | ^6.30.3 | Client-side routing |
| `@tanstack/react-query` | ^5.96.2 | Server state management |
| `react-toastify` | ^11.0.5 | Toast notifications |

#### UI & Design

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `antd` | ^6.3.1 | UI component library |
| `@ant-design/icons` | ^6.1.0 | Icon pack |
| `react-icons` | ^5.6.0 | Additional icon packs |
| `leaflet` | ^1.9.4 | خرائط تفاعلية |
| `recharts` | ^2.15.3 | رسوم بيانية |

#### HTTP & Networking

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `axios` | ^1.14.0 | HTTP requests |
| `socket.io-client` | ^4.8.1 | Real-time WebSocket |

#### Internationalization

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `i18next` | ^25.10.10 | i18n core |
| `react-i18next` | ^16.6.6 | React integration |
| `i18next-browser-languagedetector` | ^8.2.1 | اكتشاف اللغة |
| `i18next-http-backend` | ^3.0.2 | تحميل ملفات الترجمة |

#### Utilities

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `dayjs` | ^1.11.19 | معالجة التواريخ |
| `react-cookie` | ^8.0.1 | إدارة cookies |
| `idb` | ^8.0.3 | IndexedDB (offline) |
| `@fingerprintjs/fingerprintjs` | ^5.1.0 | Device fingerprinting |
| `@heyputer/puter.js` | ^2.3.2 | Puter OS integration |

#### Build Tools

| الحزمة | الإصدار | الوظيفة |
|--------|---------|---------|
| `vite` | ^8.0.0-beta | Build tool + Dev server |
| `@vitejs/plugin-react` | ^5.1.1 | React plugin |
| `vite-plugin-pwa` | ^1.3.0 | PWA support |
| `rolldown` | ^1.0.0 | Bundler |

---

### 4.5 التصميم — Ant Design

**Theme مخصص في App.jsx:**

```
ألوان مخصصة (CSS variables):
--color-forest   ← الأخضر الغابي (primary)
--color-emerald  ← زمردي
--color-sand     ← رملي
--color-horizon  ← أفقي
--color-ivory    ← عاجي
--color-night    ← ليلي

Border Radius: 14px (lg: 16px, sm: 10px)
Font: CSS variable-based
```

**RTL:** دعم كامل عبر `direction: rtl` في ConfigProvider

---

### 4.6 الـ Hooks المخصصة

**مجلد:** `waynest-FE/src/hooks/`

```
hooks/
├── admin/          ← إدارة بيانات لوحة الإدارة
├── offline/        ← حالة الاتصال، offline data
├── provider/       ← إدارة حساب المزود
├── public/         ← بيانات عامة (places, events...)
├── trips/
│   ├── useTripForm.js      ← حالة نموذج إنشاء الرحلة
│   ├── useTripPlanner.js   ← منطق Trip Planner الكامل
│   └── ...
└── user/           ← بيانات المستخدم الشخصية
```

**نمط Hooks:**
كل hook يستخدم TanStack Query للتواصل مع الـ API:
```js
const { data, isLoading, error } = useQuery({...})
const mutation = useMutation({...})
```

---

### 4.7 نظام الـ i18n (14 لغة)

**الملفات:** `waynest-FE/public/locales/{lang}/translation.json`

**اللغات المدعومة:**

| الكود | اللغة |
|-------|-------|
| `ar` | العربية (RTL) |
| `en` | الإنجليزية |
| `fr` | الفرنسية |
| `de` | الألمانية |
| `es` | الإسبانية |
| `he` | العبرية (RTL) |
| `hi` | الهندية |
| `it` | الإيطالية |
| `ja` | اليابانية |
| `ko` | الكورية |
| `pt` | البرتغالية |
| `ru` | الروسية |
| `tr` | التركية |
| `ur` | الأردية (RTL) |
| `zh` | الصينية |

**الاستخدام في المكونات:**
```jsx
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
return <span>{t('key.nested')}</span>;
```

**RTL تلقائي:** اللغات `ar`, `he`, `ur` تُفعّل `dir="rtl"` تلقائياً.

---

## 5. قاعدة البيانات والـ ORM

**TypeORM** مع **PostgreSQL** على **Neon Cloud**

### أهم الـ Entities

| Entity | الجدول | الوصف |
|--------|--------|-------|
| `User` | `users` | المستخدمون |
| `Provider` | `providers` | الأعمال/المزودون |
| `Place` | `places` | الأماكن السياحية |
| `Event` | `events` | الفعاليات |
| `TripPlanner` | `trip_planners` | خطط الرحلات |
| `Booking` | `bookings` | الحجوزات |
| `Review` | `reviews` | التقييمات |
| `City` | `cities` | المدن |
| `Country` | `countries` | الدول |
| `Subscription` | `subscriptions` | الاشتراكات |
| `Credit` | `credits` | النقاط |
| `Notification` | `notifications` | الإشعارات |
| `SocialContent` | `social_contents` | المنشورات |
| `Story` | `stories` | القصص |

### العلاقات الرئيسية

```
User ──── Provider (OneToOne)
User ──── TripPlanner (OneToMany)
City ──── Place (OneToMany)
Place ─── Review (OneToMany)
Place ─── PlaceOpeningHours (OneToMany)
Place ─── PlacePricing (OneToMany)
TripPlanner ─── Expense (OneToMany)
User ──── SocialContent (OneToMany)
User ──── Story (OneToMany)
```

---

## 6. نظام الـ AI — منظومة الذكاء الاصطناعي

### سلسلة الـ Fallback

```
الطلب
  ↓
Groq (llama-3.3-70b-versatile)        ← الأسرع والأرخص
  ↓ (إذا فشل أو تجاوز الوقت)
OpenRouter (نماذج مجانية متعددة)      ← fallback ثاني
  ↓ (إذا فشل)
Gemini (gemini-2.0-flash)             ← fallback ثالث
  ↓ (إذا فشل)
HuggingFace                           ← آخر خيار
  ↓ (إذا فشلوا جميعاً)
خطة قواعدية (Rule-based)             ← لا فشل مطلق
```

### متغيرات AI

```env
# Groq
GROQ_API_KEY
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TIMEOUT_MS=45000

# OpenRouter
OPENROUTER_API_KEY
OPENROUTER_SITE_URL
OPENROUTER_APP_NAME
OPENROUTER_MODELS            ← نماذج مجانية مفصولة بفاصلة
OPENROUTER_TIMEOUT_MS=45000

# Gemini
GEMINI_API_KEY
GEMINI_MODEL=gemini-2.0-flash
GEMINI_COOLDOWN_MS=60000     ← انتظار بعد rate limit

# HuggingFace
HUGGINGFACE_API_KEY
HUGGINGFACE_MODEL

# Trip Planner AI Control
TRIP_PLANNER_USE_AI=true     ← تفعيل/تعطيل AI
TRIP_PLANNER_AI_TIMEOUT_MS=50000
TRIP_PLANNER_AI_PRICE_ESTIMATE=false
```

### خدمات أخرى

| الخدمة | الاستخدام |
|--------|-----------|
| `OpenWeather API` | توقعات الطقس 5 أيام |
| `Google Places API` | بيانات الأماكن |
| `Foursquare API` | بيانات الأماكن (بديل) |
| `Google Custom Search` | بحث الصور |
| `Exchange Rate API` | أسعار العملات |

---

## 7. الـ Real-Time — Socket.IO

**Backend:** `@nestjs/platform-socket.io` + `@socket.io/redis-adapter`
**Frontend:** `socket.io-client`

### يُستخدم لـ:
- إشعارات فورية
- المحادثات (Chat)
- تحديثات الحجوزات
- النشاط الاجتماعي

### الـ Redis Adapter:
يتيح لـ Socket.IO العمل عبر instances متعددة (scaling).
إذا لم يكن Redis متاحاً، يعود لـ in-memory adapter (لـ instance واحدة).

---

## 8. المدفوعات — Stripe

**الحزمة:** `stripe` ^22.1.1

### المتغيرات
```env
STRIPE_SECRET_KEY       ← مفتاح Stripe (test: sk_test_...)
STRIPE_PUBLISHABLE_KEY  ← للـ frontend
STRIPE_WEBHOOK_SECRET   ← للـ webhook verification
```

### يُستخدم في:
- `billing` module — إدارة الاشتراكات
- `subscriptions` module — خطط الاشتراك
- نظام الـ Credits (شراء نقاط)

**Webhook:** يستقبل أحداث Stripe (payment_intent.succeeded, subscription.updated...)

---

## 9. متغيرات البيئة (.env)

**ملف:** `waynest-be/.env`

### تصنيف كامل

#### قاعدة البيانات
```env
DATABASE_URL=postgres://...@neon.tech/waynest?sslmode=require
DB_HOST=...
DB_PORT=5432
DB_USERNAME=...
DB_PASSWORD=...
DB_NAME=waynest
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
DB_SYNC=false
DB_POOL_MAX=30
DB_POOL_MIN=5
DB_CONNECT_TIMEOUT_MS=8000
DB_QUERY_TIMEOUT_MS=30000
```

#### التطبيق
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=...
JWT_EXPIRES_IN=7d
TRUST_PROXY=false
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:3001
```

#### الذكاء الاصطناعي (كاملة في القسم 6)

#### البريد الإلكتروني
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=...
MAIL_PASS=...
MAIL_FROM=noreply@waynest.com
MAIL_FROM_NAME=Waynest
```

#### Web Push
```env
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
WEB_PUSH_VAPID_SUBJECT=mailto:...
```

#### الأداء
```env
HTTP_COMPRESSION_THRESHOLD=2048
HTTP_KEEP_ALIVE_TIMEOUT_MS=65000
HTTP_HEADERS_TIMEOUT_MS=66000
HTTP_REQUEST_TIMEOUT_MS=30000
SLOW_REQUEST_MS=600
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=100
```

#### Redis (اختياري)
```env
REDIS_URL=redis://localhost:6379
# أو
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

#### Frontend
```env
# waynest-FE/.env
VITE_API_URL=http://localhost:3001/api
```

---

## 10. الـ Deployment — Vercel

### Backend

**ملف:** `waynest-be/vercel.json`

```json
{
  "builds": [{ "src": "api/index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/api/index.ts" }]
}
```

- الـ Backend يُنشر كـ **Serverless Function**
- Entry point: `api/index.ts` (يُغلّف NestJS في Lambda handler)
- كل طلب → Serverless function تُنفَّذ

### Frontend

**ملف:** `waynest-FE/vercel.json`

```json
{
  "builds": [{ "src": "package.json", "use": "@vercel/static-build" }],
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

- `index.html` — no-cache
- `/assets/*` — immutable (cache سنة كاملة)
- SPA routing: أي مسار → `index.html`

---

## 11. TypeScript Config

### Backend (`waynest-be/tsconfig.json`)

```json
{
  "target": "ES2023",
  "module": "NodeNext",
  "moduleResolution": "NodeNext",
  "outDir": "./dist",
  "paths": { "src/*": ["./src/*"] },
  "emitDecoratorMetadata": true,    ← مطلوب لـ NestJS DI
  "experimentalDecorators": true,   ← مطلوب لـ decorators
  "strictNullChecks": true,
  "incremental": true               ← compilation أسرع
}
```

### Frontend (`waynest-FE/tsconfig.app.json`)

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "jsx": "react-jsx",
  "paths": { "@/*": ["src/*"] },    ← import @/components/...
  "strict": true,
  "noUnusedLocals": true
}
```

---

## 12. خريطة الـ API Endpoints

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/refresh
POST /api/auth/verify-email
POST /api/auth/invite
POST /api/auth/invite/activate
```

### Users
```
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
GET    /api/users/:id/trips
```

### Places
```
GET    /api/place
GET    /api/place/:id
POST   /api/place           (Provider)
PATCH  /api/place/:id       (Provider/Admin)
DELETE /api/place/:id       (Admin)
```

### Events
```
GET    /api/event
GET    /api/event/:id
POST   /api/event           (Provider)
```

### Trip Planner
```
POST   /api/trip-planner
GET    /api/trip-planner
GET    /api/trip-planner/:id
PATCH  /api/trip-planner/:id
DELETE /api/trip-planner/:id
POST   /api/trip-planner/:id/replan-day
GET    /api/trip-planner/shared/:slug
POST   /api/trip-planner/:id/expenses
GET    /api/trip-planner/:id/expenses
```

### Social
```
POST   /api/social-content            ← نشر منشور
GET    /api/social-content/:id
DELETE /api/social-content/:id
POST   /api/social-graph/follow/:id
DELETE /api/social-graph/unfollow/:id
GET    /api/social-graph/followers/:id
GET    /api/social-graph/following/:id
```

### Chat
```
GET    /api/chat/conversations
GET    /api/chat/:conversationId/messages
POST   /api/chat/:conversationId/messages
```

### Bookings
```
POST   /api/bookings
GET    /api/bookings
GET    /api/bookings/:id
PATCH  /api/bookings/:id
```

### Admin
```
GET    /api/admin/users
GET    /api/admin/providers
PATCH  /api/admin/users/:id
GET    /api/admin/stats
...
```

---

## ملاحظات هامة للتطوير

1. **لا تغيّر DB_SYNC إلى `true` في production** — استخدم دائماً migrations.

2. **AI معطّل افتراضياً:** `TRIP_PLANNER_USE_AI` افتراضيه `false` — فعّله في `.env` عند الحاجة.

3. **Redis اختياري:** النظام يعمل بدونه (بدون job queues و WebSocket scaling).

4. **Swagger متاح محلياً:** `http://localhost:3001/api/docs` — معطّل في production.

5. **Base URL في الـ Frontend:** `VITE_API_URL=http://localhost:3001/api` — عدّله عند الـ deploy.

6. **Credits:** كل trip plan يخصم 5 credits من المستخدم — تحقق من رصيده قبل الإنشاء.

7. **Cursor Pagination:** الـ lists الكبيرة تستخدم cursor-based pagination لا offset.
