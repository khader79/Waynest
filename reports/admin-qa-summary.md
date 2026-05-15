**Admin Panel QA Summary**

- **Date:** 2026-05-15
- **Target:** Admin panel routes (dev toggles enabled: `DEV_API_MOCK`, `DEV_AUTH_USER`)

- **Overall status:** Many admin pages load; Add-modals open on most pages. Repeated console issues observed that require attention before further UI polish.

**Key issues found**
- **401 Unauthorized (many requests):** Backend requests frequently returned 401; dev API mock mitigates some but not all calls.
- **Form warning:** "Instance created by `useForm` is not connected to any Form element" appears repeatedly — some forms created with `useForm()` are not passed to `<Form form={form} />`.
- **List key warning:** "Each child in a list should have a unique 'key' prop" coming from Ant Table `Body` — ensure table row/key props unique.
- **Billing page crash:** `AdminBillingDashboard` throws `TypeError: plans.map is not a function` — `plans` expected array but receives non-array value from API/mock.

**Per-route quick checks**
- `/admin-panel` — loads; heading present; Add-modal not relevant.
- `/admin-panel/devices` — loads; heading present; Add button present; Add modal opens.
- `/admin-panel/users` — loads; Add modal opens.
- `/admin-panel/providers` — loads; Add modal opens.
- `/admin-panel/places` — loads; Add modal opens; modal confirm and saves wired to `mutateAsync` in recent patch.
- `/admin-panel/countries` — loads; Add modal opens.
- `/admin-panel/cities` — loads; Add modal opens.
- `/admin-panel/currencies` — loads; table shows key-warning in console.
- `/admin-panel/tags` — loads; Add modal opens.
- `/admin-panel/events` — loads; Add modal opens; form `onFinish` patched to await `mutateAsync`.
- `/calendar` — loads (separate route), OK.
- `/admin-panel/reviews` — loads.
- `/admin-panel/place-pricing` — loads.
- `/admin-panel/place-opening-hours` — loads.
- `/admin-panel/provider-membership` — loads.
- `/admin-panel/provider-applications` — loads.
- `/admin-panel/provider-verification-requests` — loads; request verification confirm now awaits mutation.
- `/admin-panel/billing` — crashes with `plans.map` TypeError (see Key issues).

**Artifacts captured**
- Playwright run captured per-route headings, modal-open checks, console logs, and screenshots (saved during the run). I can export those screenshots and raw per-route JSON if you want them bundled.

**Recommended next steps**
1. Fix `plans` shape in billing mock/endpoint so `plans` is always an array (or guard with `Array.isArray(plans) ? plans : []`).
2. Sweep app for `useForm()` instances and ensure the `form` object is passed to corresponding `<Form form={form}>` to silence the `useForm` warning.
3. Add stable keys for table rows (use `rowKey` or ensure `key` field present) to remove list `key` warning.
4. Trace remaining backend calls not intercepted by `DEV_API_MOCK` and either mock them or ensure dev auth bypass provides valid responses.
5. Continue modal confirm/loading sweep: replace `Modal.confirm({ onOk: () => mutate(...) })` with `onOk: async () => await mutateAsync(...)` across pages.

If you want, I can now:
- Export the raw Playwright results and screenshots into `/reports/admin-qa-artifacts/` (JSON + PNGs), or
- Start applying the quick fixes above (billing `plans` guard, `useForm` wiring, and table `rowKey`) across the codebase.

Tell me which next step you prefer.