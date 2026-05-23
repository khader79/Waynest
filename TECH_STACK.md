# Waynest — Tech Stack

## Backend (`waynest-be`)

**Framework:** NestJS v11 (TypeScript)
**Database:** PostgreSQL + TypeORM v0.28 (ORM)

### Project Structure

```
src/
├── modules/              # Each module = one feature
│   ├── auth/               # Login, JWT, Invite system
│   ├── users/              # User management
│   ├── providers/          # Provider (business) accounts
│   ├── provider-applications/  # Apply-to-be-provider flow
│   ├── provider-membership/    # Provider memberships
│   ├── place/              # Places (venues)
│   ├── placepricing/       # Place pricing
│   ├── place-opening-hours/    # Opening hours
│   ├── bookings/           # Booking system
│   ├── event/              # Events
│   ├── calendar/           # Calendar entries
│   ├── chat/               # Chat (WebSocket gateway)
│   ├── messaging/          # Messages (REST + WebSocket)
│   ├── notifications/      # Notifications (Web Push)
│   ├── social-content/     # Posts, likes, comments
│   ├── social-graph/       # Friends, follow, block
│   ├── subscriptions/      # Subscription plans
│   ├── credits/            # Credit wallet system
│   ├── billing/            # Billing (Stripe integration)
│   ├── reviews/            # Place/event reviews
│   ├── cities/             # City data
│   ├── countries/          # Country data
│   ├── currencies/         # Currency data
│   ├── tag/                # Tags
│   ├── upload/             # Image/file upload
│   └── email-verification/ # Email verification codes
├── common/               # Base entity, guards, decorators, pipes
├── jobs/                 # Scheduled tasks (cron)
├── migrations/           # Raw SQL migrations (manual)
└── trip-planner/         # AI trip planner via Google Gemini
```

### Key Libraries

| Library | Purpose |
|---------|---------|
| `@nestjs/jwt` + `passport-jwt` | JWT authentication (httpOnly cookie) |
| `@nestjs/websockets` + `socket.io` | Real-time messaging via WebSocket |
| `@nestjs/throttler` | Rate limiting / brute-force protection |
| `@nestjs/swagger` + `swagger-ui-express` | Auto-generated API docs |
| `@nestjs/schedule` | Cron jobs |
| `@google/generative-ai` | AI trip planning (Gemini) |
| `stripe` | Payment processing |
| `bcrypt` | Password hashing |
| `class-validator` + `class-transformer` | DTO validation & transformation |
| `nodemailer` | Email sending |
| `web-push` | Browser push notifications |
| `slugify` | URL slug generation |
| `redis` + `@socket.io/redis-adapter` | In-memory cache + WebSocket scaling |
| `helmet` + `compression` | Security headers + response compression |
| `pg` | PostgreSQL driver |
| `typeorm` | ORM with migration support |

---

## Frontend (`waynest-FE`)

**Framework:** React 18 (JSX)
**Build Tool:** Vite 8
**Routing:** React Router v6

### Project Structure

```
src/
├── api/                # Axios instance + route config + auth helpers
├── components/         # Reusable UI components
│   ├── public/navbar/     # Main navbar (search, messages, notifications)
│   ├── social/            # Left sidebar, right sidebar
│   ├── panel/             # Dashboard sidebar + navbar
│   └── shared/            # Shared components (ProviderSidebarCTA, etc.)
├── context/            # React Context (AuthContext, NotificationsContext)
├── hooks/              # Custom hooks (useLoginForm, useMediaQuery, useTheme)
├── pages/              # Full page components (auth, social, admin, etc.)
├── modules/            # Layout modules (Facebook-style layout, etc.)
├── services/           # Business logic, normalizers, WebSocket client
├── utils/              # Utilities (routing, storage, avatar, media)
├── design-system/      # Design system components (Logo, etc.)
├── locales/            # i18n translation files (en, ar)
└── styles/             # Global styles
```

### Key Libraries

| Library | Purpose |
|---------|---------|
| `react-router-dom` v6 | Client-side routing |
| `axios` | HTTP requests |
| `socket.io-client` | WebSocket client for real-time features |
| `@tanstack/react-query` | Server state management (caching, refetching) |
| `i18next` + `react-i18next` + `i18next-http-backend` | Internationalization (en/ar) |
| `react-icons` (Fi, Hi, Ai) | Feather, Heroicons, Ant Design icons |
| `antd` + `@ant-design/icons` | Ant Design UI component library |
| `recharts` | Charts (admin dashboard) |
| `react-toastify` | Toast notifications |
| `dayjs` | Date manipulation |
| `@fingerprintjs/fingerprintjs` | Device fingerprinting (security) |
| `react-cookie` | Cookie management |
| `vite` | Dev server + build tool |

---

## Architecture Overview

```
[Browser] ←→ [Vite / React 18] ←→ [NestJS API] ←→ [PostgreSQL]
                ↕                           ↕
          Socket.IO Client           Socket.IO Server
                                            ↕
                                         [Redis]

[Stripe] ←→ [NestJS] ←→ [Google Gemini AI]
[Nodemailer] ←→ [Email Service]
[Web Push API] ←→ [Browser Notifications]
```

### Key Concepts

| Term | Description |
|------|-------------|
| **Provider** | Business account owner — manages places, events, bookings |
| **User** | Regular traveler — books, posts, plans trips |
| **Admin** | System administrator — manages users, providers, billing |
| **Credits** | Virtual wallet balance used for bookings & services |
| **Social Graph** | Friend/follow/block relationship system |
| **Trip Planner** | AI-powered itinerary generator (Google Gemini) |
| **Provider Application** | Request flow for a User to become a Provider |
