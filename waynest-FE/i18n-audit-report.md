# Waynest i18n Audit Report

**Date:** 2026-05-18  
**Languages:** 15 (en, ar, he, fr, ru, tr, es, de, zh, ja, ko, it, pt, hi, ur)  
**English Key Count:** 2,278

---

## 1. KEY COUNT COMPARISON

| Language | Keys | Delta vs EN | Status |
|----------|------|-------------|--------|
| ar | 1,959 | -319 | ❌ Missing |
| he | 2,366 | +88 | ⚠️ Extra |
| fr | 2,229 | -49 | ❌ Missing |
| ru | 2,229 | -49 | ❌ Missing |
| tr | 2,229 | -49 | ❌ Missing |
| es | 2,042 | -236 | ❌ Missing |
| de | 2,044 | -234 | ❌ Missing |
| zh | 2,042 | -236 | ❌ Missing |
| ja | 2,352 | +74 | ⚠️ Extra |
| ko | 2,352 | +74 | ⚠️ Extra |
| it | 3,187 | +909 | ⚠️ Extra |
| pt | 2,042 | -236 | ❌ Missing |
| hi | 2,352 | +74 | ⚠️ Extra |
| ur | 2,248 | -30 | ❌ Missing |

---

## 2. MISSING KEYS (Critical)

### HIGH SEVERITY - Large Gaps (>200 missing)
- **ar (Arabic):** 810 missing keys - includes landing stats, contact form, register errors, explore features
- **es (Spanish):** 258 missing keys - includes common actions, login, contact, about, explore
- **de (German):** 258 missing keys - same pattern as Spanish
- **zh (Chinese):** 258 missing keys - same pattern as Spanish
- **pt (Portuguese):** 258 missing keys - same pattern as Spanish

### MEDIUM SEVERITY - Moderate Gaps (50-100 missing)
- **he (Hebrew):** 66 missing keys - provider.apply section, timeline, access labels
- **fr (French):** 67 missing keys - login, provider.apply section
- **ru (Russian):** 67 missing keys - login, provider.apply section
- **tr (Turkish):** 67 missing keys - login, provider.apply section
- **ja (Japanese):** 66 missing keys - provider.apply section
- **ko (Korean):** 66 missing keys - provider.apply section
- **it (Italian):** 66 missing keys - provider.apply section
- **ur (Urdu):** 67 missing keys - login, provider.apply section

### Common Missing Key Patterns:
1. `provider.apply.*` - Provider application form (missing in 12/14 languages)
2. `login.noAccount` - Missing in fr, ru, tr, ur
3. `landing.stats.*.value` - Missing in ar
4. `contact.form.*` - Missing in ar
5. `register.*` - Missing in ar
6. `explore.*` - Missing in ar
7. `common.logIn`, `common.createAccount` - Missing in es, de, zh, pt

---

## 3. EXTRA KEYS (Not in English)

### HIGH SEVERITY - Large Divergence
- **it (Italian):** 975 extra keys - massive divergence, likely contains keys not in EN
- **ar (Arabic):** 491 extra keys - significant divergence
- **he (Hebrew):** 154 extra keys - common UI actions (create, update, filter, sort, etc.)
- **ja (Japanese):** 140 extra keys - same pattern as Hebrew
- **ko (Korean):** 140 extra keys - same pattern as Hebrew
- **hi (Hindi):** 140 extra keys - same pattern as Hebrew

### MEDIUM SEVERITY - Moderate Divergence
- **fr, ru, tr:** 18 extra keys each - user dashboard/bookings section
- **es, zh, pt:** 22 extra keys each - user dashboard/bookings section
- **de:** 24 extra keys - user dashboard/bookings section
- **ur:** 37 extra keys - navbar, theme, admin sections

### Recommendation:
Extra keys should either be:
1. Added to English base file (if they're valid features)
2. Removed from translation files (if they're deprecated/unused)

---

## 4. UNTRANSLATED VALUES (Same as English)

### HIGH SEVERITY - Mostly Untranslated
- **es (Spanish):** 675 untranslated keys
- **pt (Portuguese):** 671 untranslated keys
- **de (German):** 710 untranslated keys
- **zh (Chinese):** 636 untranslated keys

### MEDIUM SEVERITY - Partially Untranslated
- **he (Hebrew):** 311 untranslated keys
- **ja (Japanese):** 309 untranslated keys
- **ko (Korean):** 310 untranslated keys
- **hi (Hindi):** 306 untranslated keys
- **ur (Urdu):** 329 untranslated keys
- **it (Italian):** 268 untranslated keys

### LOW SEVERITY - Minor Issues
- **fr (French):** 179 untranslated keys
- **ru (Russian):** 97 untranslated keys
- **tr (Turkish):** 103 untranslated keys

### Common Untranslated Patterns:
1. `landing.stats.*.value` - "0" (numeric, acceptable)
2. `contact.followUs.*` - Social media names (Twitter, Facebook, etc.)
3. `common.ok`, `common.home`, `common.profile` - Basic UI terms
4. `admin.users.role.*` - Role names (USER, PROVIDER, ADMIN)
5. `provider.places.table.image` - Empty in all non-EN languages

---

## 5. PLACEHOLDER INCONSISTENCIES

| Language | Count | Issue |
|----------|-------|-------|
| it | 8 | `{{count}}` used instead of `{{min}}`/`{{max}}` in validation |
| ar | 4 | Missing placeholders entirely |
| ru | 4 | Missing placeholders in admin messages |
| tr | 5 | Missing placeholders in admin/provider messages |
| fr | 1 | Missing placeholders in provider rating |

### Specific Issues:
1. **ar:** `sidebar.planDays` - `{{count}}` missing → "أيام" should be "{{count}} أيام"
2. **ar:** `calendar.monthYear` - `{{month}} {{year}}` missing
3. **ar:** `messenger.confirmRemoveMember` - `{{member}}` missing
4. **ar:** `messenger.maxFilesPerMessage` - `{{count}}` used instead of `{{limit}}`
5. **it:** Validation messages use `{{count}}` instead of `{{min}}`/`{{max}}` (6 instances)
6. **ru/tr:** Admin entity messages missing `{{entity}}` placeholder

---

## 6. EMPTY VALUES

**All non-EN languages (13):** `provider.places.table.image` is empty
- Impact: Image column header will show blank in provider places table

---

## 7. HARDCODED STRINGS IN JSX/TSX

### ProviderApplication.jsx (7 issues)
- L33: Arabic title hardcoded: "نموذج تقديم طلب البروفايدِر"
- L38: Arabic placeholder: "مثلاً: مطبخ السلطان"
- L53: Arabic phone placeholder: "مثلاً: +963 9xx xxx xxx"
- L61: Email placeholder: "name@example.com"
- L67: Arabic city placeholder: "المدينة أو العنوان"
- L75: Arabic categories hint: "اختر كلمات توضح تميز خدمتك"

---

## 8. RTL SUPPORT AUDIT

### ✅ Strengths:
- `i18n.js` correctly identifies ar, he, ur as RTL languages
- `RTL_LANGUAGE_CODES` Set properly defined
- `applyLanguageToDocument()` sets `dir` attribute on `<html>`
- CSS files include `html[dir="rtl"]` selectors
- `global.css` has RTL rules for password input, language dropdown, admin table
- `premiumExperience.css` has comprehensive RTL support
- `PanelLayout.css` handles RTL layout main area

### ⚠️ Potential Issues:
1. **Urdu (ur)** is marked as RTL but may need additional font support
2. No explicit RTL handling for:
   - Icons that should mirror (arrows, chevrons)
   - Margins/padding that should flip (use `margin-inline-start` instead of `margin-left`)
3. Tailwind RTL plugin not detected (if using Tailwind)

---

## 9. I18N CONFIGURATION REVIEW

### ✅ Good Practices:
- `fallbackLng: "en"` - Proper fallback
- `cleanCode: true` - Normalizes language codes
- `load: "languageOnly"` - Correct for region-independent translations
- `interpolation.escapeValue: false` - Safe for React
- `returnNull: false` and `returnEmptyString: false` - Good defaults
- `parseMissingKeyHandler` - Humanizes missing keys for debugging
- `overloadTranslationOptionHandler` - Supports `t('key', 'defaultValue')` pattern
- Detection order: querystring → cookie → localStorage → navigator → htmlTag

### ⚠️ Recommendations:
1. Consider adding `keySeparator: '.'` explicitly (currently default)
2. Consider adding `nsSeparator: ':'` explicitly (currently default)
3. `nonExplicitSupportedLngs: true` - Verify this is intentional (allows en-US → en)
4. No pluralization rules configured - verify if needed
5. No context support configured - verify if needed

---

## 10. PRIORITY FIXES

### 🔴 CRITICAL (Fix Immediately)
1. **Arabic (ar):** 810 missing keys + 4 placeholder issues
2. **Spanish/German/Chinese/Portuguese:** 236+ untranslated keys each
3. **Italian:** 975 extra keys causing divergence
4. **ProviderApplication.jsx:** 7 hardcoded strings

### 🟡 HIGH (Fix Soon)
1. **All languages:** `provider.apply.*` keys missing (new feature not translated)
2. **Italian:** 8 placeholder inconsistencies in validation messages
3. **Russian/Turkish:** 4-5 placeholder issues in admin messages
4. **All non-EN:** Empty `provider.places.table.image` key

### 🟢 MEDIUM (Plan for Next Sprint)
1. **Extra keys audit:** Review 491 extra Arabic keys, 140+ extra keys in ja/ko/hi/he
2. **RTL testing:** Verify all RTL layouts render correctly
3. **Untranslated strings:** Review and translate remaining English strings
4. **Hardcoded strings:** Scan all components systematically

---

## 11. RECOMMENDED ACTIONS

### Immediate:
1. Sync missing `provider.apply.*` keys to all 14 non-EN languages
2. Fix placeholder inconsistencies in ar, it, ru, tr
3. Add `provider.places.table.image` translation to all languages
4. Wrap hardcoded strings in ProviderApplication.jsx with `t()`

### Short-term:
1. Create translation checklist for each language
2. Set up i18n CI/CD checks (key parity, placeholder validation)
3. Add missing common keys (login, contact, explore) to all languages
4. Review and reconcile extra keys in it, ar, ja, ko, hi, he

### Long-term:
1. Implement translation management tool (e.g., Lokalise, Crowdin)
2. Add automated tests for i18n completeness
3. Create RTL visual regression tests
4. Document i18n conventions for developers
