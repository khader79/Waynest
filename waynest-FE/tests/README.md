# Waynest Playwright Enterprise Testing System

## 📁 Structure

```
waynest-FE/
├── playwright.config.ts          # Playwright configuration
├── tests/
│   ├── global-setup.ts           # Auth state generation, directory setup
│   ├── e2e/                      # Test files
│   │   ├── auth/                 # Authentication tests
│   │   ├── navigation/           # Routing & navigation tests
│   │   ├── forms/                # Form submission & validation tests
│   │   ├── i18n/                 # Translation & RTL tests
│   │   ├── a11y/                 # Accessibility tests
│   │   ├── responsive/           # Multi-device responsive tests
│   │   ├── visual/               # Visual regression tests
│   │   ├── api/                  # API endpoint tests
│   │   ├── crud/                 # CRUD operation tests
│   │   ├── edge-cases/           # Edge case & error handling tests
│   │   └── errors/               # Console & API error detection tests
│   ├── pages/                    # Page Object Models
│   │   ├── BasePage.ts           # Base page with common utilities
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   ├── LandingPage.ts
│   │   ├── TripPlannerPage.ts
│   │   ├── ContactPage.ts
│   │   ├── AdminDashboardPage.ts
│   │   ├── ProfilePage.ts
│   │   ├── SearchPage.ts
│   │   ├── SettingsPage.ts
│   │   └── NavbarPage.ts
│   ├── fixtures/                 # Test fixtures
│   │   ├── index.ts              # Page object fixtures
│   │   └── auth/                 # Auth storage states (generated)
│   ├── utils/                    # Reusable utilities
│   │   ├── ApiMocker.ts          # API response mocking
│   │   ├── Accessibility.ts      # a11y testing utilities
│   │   ├── VisualRegression.ts   # Screenshot comparison utilities
│   │   ├── Translations.ts       # i18n testing utilities
│   │   ├── Auth.ts               # Authentication helpers
│   │   └── Responsive.ts         # Responsive testing utilities
│   └── factories/                # Test data factories
│       └── index.ts              # User, Trip, Contact factories
├── test-results/                 # Generated reports (gitignored)
│   ├── html-report/              # HTML test report
│   ├── screenshots/              # Failure screenshots
│   ├── videos/                   # Test videos
│   └── traces/                   # Playwright traces
└── .github/workflows/
    └── playwright.yml            # CI pipeline
```

## 🚀 Quick Start

```bash
# Install Playwright
cd waynest-FE
npm init playwright@latest -- --browser=chromium --browser=firefox --lang=ts

# Run all tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test suite
npm run test:e2e:auth
npm run test:e2e:api
npm run test:e2e:a11y
npm run test:e2e:visual
npm run test:e2e:rtl

# Run on specific device
npm run test:e2e:mobile
npm run test:e2e:tablet
npm run test:e2e:desktop

# Update visual snapshots
npm run test:e2e:update-snapshots

# View HTML report
npm run test:e2e:report
```

## 📊 Test Projects

| Project | Purpose | Devices |
|---------|---------|---------|
| `chromium-desktop` | Desktop Chrome tests | 1440x900 |
| `firefox-desktop` | Desktop Firefox tests | 1440x900 |
| `tablet` | iPad Mini tests | 834x1112 |
| `mobile-chrome` | Pixel 7 tests | 393x851 |
| `mobile-safari` | iPhone 15 tests | 393x852 |
| `auth-flows` | Auth tests (no storage) | 1440x900 |
| `rtl-arabic` | RTL layout tests | 1440x900, ar locale |
| `api` | API endpoint tests | N/A |
| `accessibility` | a11y compliance tests | 1440x900 |
| `visual` | Visual regression tests | 1440x900 |

## 🔧 Configuration

- **Retries:** 2 in CI, 1 locally
- **Workers:** 3 in CI, auto locally
- **Timeout:** 60s per test
- **Trace:** Retained on failure
- **Screenshots:** On failure only
- **Video:** Retained on failure
- **Reporters:** HTML, List, JSON, JUnit

## 📝 Test Categories

### Auth Tests
- Login form display & validation
- Registration form display & validation
- Dev bypass authentication
- Session persistence
- Role-based redirects
- Protected route guards

### Navigation Tests
- All public routes load correctly
- Protected routes redirect to login
- Legacy route redirects work
- 404 handling
- Deep linking

### Form Tests
- Contact form submission & validation
- Trip planner form submission & validation
- Settings form password validation
- Search functionality & edge cases

### i18n Tests
- Language switching for all 15 languages
- RTL layout for Arabic, Hebrew, Urdu
- LTR layout for other languages
- Missing translation detection
- Brand name consistency across languages

### Accessibility Tests
- WCAG 2.1 AA compliance
- Heading hierarchy
- Alt text on images
- Accessible links
- Keyboard navigation
- Focus management
- RTL accessibility

### Responsive Tests
- Mobile (320px - 414px)
- Tablet (600px - 834px)
- Desktop (1024px - 1440px)
- Ultrawide (2560px)
- Navbar collapse behavior
- Footer responsiveness

### Visual Regression Tests
- Page snapshots for all major pages
- Dark mode snapshots
- RTL layout snapshots
- Loading state snapshots
- Error state snapshots

### API Tests
- Health check
- Authentication endpoints
- Public endpoints (countries, cities, tags, currencies)
- Search endpoint
- Error handling
- Rate limiting

### CRUD Tests
- Contact form (Create)
- Trip planner (Create)
- Search (Read)
- Settings (Update)
- Admin panel CRUD

### Edge Cases
- Offline mode
- Slow network
- Corrupted localStorage
- Special characters in URLs
- Rapid form submissions
- Emoji in form fields
- Back/forward navigation
- Multiple tabs

## 🔐 Auth Strategy

Uses `DEV_AUTH_USER` localStorage bypass for non-production testing:
```typescript
await page.evaluate(() => {
  localStorage.setItem("DEV_AUTH_USER", JSON.stringify({
    id: "test-user-id",
    email: "testuser@waynest.com",
    username: "testuser",
    role: "USER",
  }));
});
```

Storage states are pre-generated in `tests/fixtures/auth/` for each role.

## 🎭 API Mocking

Use `ApiMocker` utility for consistent test data:
```typescript
const mocker = new ApiMocker(page);
await mocker.mockAllCatalogData();
await mocker.mockTripGeneration({ id: "test", days: [] });
```

## 📈 Reports

- **HTML Report:** `test-results/html-report/index.html`
- **JSON Results:** `test-results/results.json`
- **JUnit XML:** `test-results/junit.xml`
- **Screenshots:** `test-results/screenshots/`
- **Videos:** `test-results/results/`
- **Traces:** `test-results/results/`
