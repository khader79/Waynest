# Waynest Frontend QA - 2026-05-15

## Scope

- Ran a browser QA sweep against `http://localhost:5173` with API `http://localhost:3001/api`.
- Covered 60 user-facing routes across guest, traveler, provider, and admin personas.
- Exercised Explore and Destinations filters/search interactions.
- Logged console errors, failed API responses, redirects, RTL/lang state, suspicious i18n key leaks, visible English UI samples, and obvious clipped controls.

## Result

- Browser QA: 60 / 60 routes passed.
- Production build: `npm run build` passed.
- Latest machine report:
  `C:\Users\khade\AppData\Local\Temp\waynest-qa\2026-05-15T09-59-50-956Z\browser-qa-report.json`

## Fixes Applied

- Fixed provider bookings API mapping from `/bookings` to `/bookings/provider/mine`.
- Added missing top-level user booking API routes for `/bookings/my` and cancellation.
- Localized pricing plan names/descriptions by `plan.slug` instead of rendering backend English descriptions directly.
- Added Arabic translations for visible gaps in navbar, login/register, notifications, profile, settings, provider application, provider composer, provider places, feedback, activities, billing, AI launcher, and public provider labels.
- Added shared locale keys for `navbar.destinations` and admin sidebar provider/billing links across all locale files.
- Added reusable browser QA script at `scripts/qa/browser-smoke.cjs`.

## Notes

- The QA script creates local QA traveler/provider accounts and a provider application to test authenticated flows end to end.
- Public trip text and geo table names can contain English because they are persisted/generated data, not static frontend UI strings.
