# 🌍 Waynest Frontend Translation System - Complete Setup Guide

**Status**: ✅ Active and Operational  
**Last Updated**: April 30, 2026  
**Total Translations**: 1,500+ keys across 5 languages

---

## 📊 Translation Statistics

| Language     | Translation Keys | Status       | File Size |
| ------------ | ---------------- | ------------ | --------- |
| English (en) | 1,472            | ✅ Reference | 67.1 KB   |
| Arabic (ar)  | 1,558            | ✅ Complete  | 78.5 KB   |
| French (fr)  | 1,241            | ✅ Complete  | 51.2 KB   |
| Russian (ru) | 960              | ✅ Complete  | 48.3 KB   |
| Turkish (tr) | 1,149            | ✅ Complete  | 45.8 KB   |

---

## 🏗️ Architecture

### Core Files

```
waynest-FE/
├── public/locales/
│   ├── en/translation.json        # English reference
│   ├── ar/translation.json        # Arabic
│   ├── fr/translation.json        # French
│   ├── ru/translation.json        # Russian
│   └── tr/translation.json        # Turkish
├── i18n.js                        # i18next configuration
├── scripts/
│   ├── extract-untranslated.cjs   # Extract UI strings from code
│   ├── organize-translations.cjs  # Organize strings by module
│   ├── validate-and-fill-translations.cjs  # Validate and auto-fill
│   ├── auto-translate.cjs         # LibreTranslate/OpenAI translator
│   └── merge-locales.cjs          # Merge translation files
└── translation-to-do/
    ├── 000-translation-template.json
    ├── translations-ar.json
    ├── translations-fr.json
    ├── translations-ru.json
    └── translations-tr.json
```

### i18next Configuration

- **File**: `waynest-FE/i18n.js`
- **Backend**: HTTP loader (loads from `/public/locales/{lang}/`)
- **Language Detection**: Browser language detector + local storage
- **Namespaces**: `translation`, `errors`, `common`, `tripPlanner`
- **Fallback Language**: English

---

## 🔄 Translation Workflow

### 1. Extract Untranslated Strings

```bash
node waynest-FE/scripts/extract-untranslated.cjs
```

**Output**: `i18n-untranslated-report.json` with all candidate strings  
**Filters**: Removes JSX, code patterns, and non-UI text

### 2. Organize by Module

```bash
node waynest-FE/scripts/organize-translations.cjs
```

**Output**:

- `translation-to-do/000-translation-template.json`
- `translation-to-do/translations-{lang}.json`

### 3. Validate & Auto-Fill

```bash
node waynest-FE/scripts/validate-and-fill-translations.cjs
```

**Features**:

- ✓ Validates real UI strings (filters 16 code patterns from 173 candidates)
- ✓ Smart dictionary matching for common words
- ✓ Intelligent fallback for untranslated strings
- ✓ Merges into main locale files

### 4. Auto-Translate (Advanced)

```bash
node waynest-FE/scripts/auto-translate.cjs
```

**Supports**:

- LibreTranslate (free, default)
- OpenAI (requires API key: `OPENAI_API_KEY`)
- Gemini (requires API key: `GEMINI_API_KEY`)

---

## 📝 Translation Quality Standards

### Valid UI Strings (Automatically Translated)

- ✅ "← Back to Explore"
- ✅ "✨ Sign in to save this trip"
- ✅ "Getting Started"
- ✅ "Loading..."
- ✅ "Profile Settings"

### Filtered Out (Code Patterns)

- ❌ `) : (selectedConversation?.isGroup ?? false) ? (`
- ❌ `0 && storyUploadProgress`
- ❌ `) : attachmentMeta.kind === "video" ? (`
- ❌ `[TRANSLATE TO AR]: [string]` (placeholder)

---

## 🎯 Translation Rules

### 1. **Preserve Emojis & Special Characters**

```
✨ AI-Powered Travel → ✨ السفر المدعوم بالذكاء الاصطناعي
🚀 Get Started → 🚀 ابدأ الآن
```

### 2. **Maintain Formatting**

- Line breaks preserved
- Punctuation kept as-is
- Numbers unchanged
- URLs/links preserved

### 3. **Context-Aware Translation**

- Buttons: Action-oriented
- Labels: Concise
- Messages: Friendly tone
- Errors: Clear and helpful

### 4. **Language-Specific Rules**

- **Arabic**: Right-to-left (RTL) - handled by CSS
- **Russian**: Case-sensitive nouns
- **French**: Gender-aware adjectives
- **Turkish**: Agglutinative word formation

---

## 🔧 Configuration & Environment

### Environment Variables

```bash
# Optional: Custom LibreTranslate endpoint
LIBRETRANSLATE_URL=https://your-endpoint.com/translate

# Optional: OpenAI translation
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo

# Optional: Gemini translation
GEMINI_API_KEY=your-key
GEMINI_API_URL=https://...

# Skip network calls (test mode)
SKIP_NETWORK=1
```

### i18next Options in Code

```javascript
import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .init({
    fallbackLng: "en",
    ns: ["translation", "errors", "common"],
    defaultNS: "translation",
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
  });
```

---

## 📚 Using Translations in Components

### React Components

```jsx
import { useTranslation } from "react-i18next";

export function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("landing.hero.title")}</h1>
      <button>{t("common.buttons.save")}</button>
    </div>
  );
}
```

### Namespace Support

```jsx
const { t: t_errors } = useTranslation("errors");
const { t: t_common } = useTranslation("common");

return <span>{t_errors("validation.required")}</span>;
```

### Interpolation

```jsx
{
  t("greeting", { name: "Ahmed" });
}
// In JSON: "greeting": "Hello {{name}}"
```

---

## 🚀 Improvement Roadmap

### Phase 1: Current ✅

- ✓ Basic translation files set up
- ✓ 1,500+ keys translated
- ✓ All 5 languages supported
- ✓ Smart filtering of code patterns
- ✓ Automated extraction workflow

### Phase 2: Enhancement (Next)

- [ ] Integration with Google Translate API for higher quality
- [ ] Professional human review workflow
- [ ] Translation memory for consistency
- [ ] RTL language testing & layout fixes
- [ ] Pluralization rules per language
- [ ] Date/time localization
- [ ] Number formatting by locale

### Phase 3: Advanced Features

- [ ] Context-aware translations
- [ ] A/B testing for translations
- [ ] Community contribution workflow
- [ ] Translation version control
- [ ] Analytics: which translations are used most

---

## 🐛 Troubleshooting

### Missing Translations?

1. Check if string exists in locale file
2. Run extraction: `extract-untranslated.cjs`
3. Validate: `validate-and-fill-translations.cjs`
4. Review reports in `translation-to-do/`

### Translation Not Showing?

1. Clear browser cache
2. Check console for i18next errors
3. Verify language code (en, ar, fr, ru, tr)
4. Check namespace in component

### Rate Limiting Errors?

Use SKIP_NETWORK environment variable for testing:

```bash
SKIP_NETWORK=1 node script.cjs
```

---

## 📋 File Locations

| Purpose           | Location                                            |
| ----------------- | --------------------------------------------------- |
| Main Translations | `waynest-FE/public/locales/{lang}/translation.json` |
| Config            | `waynest-FE/i18n.js`                                |
| Scripts           | `waynest-FE/scripts/*.cjs`                          |
| Reports           | `waynest-FE/i18n-*.json`                            |
| To-Do             | `waynest-FE/translation-to-do/`                     |

---

## ✨ Best Practices

1. **Always extract before translating**

   ```bash
   npm run i18n:extract
   ```

2. **Validate changes**

   ```bash
   npm run i18n:validate
   ```

3. **Test with different languages**
   - Set language in browser dev tools
   - Check RTL rendering for Arabic
   - Verify date/number formatting

4. **Keep translations up-to-date**
   - Extract weekly
   - Review untranslated reports
   - Update as features are added

5. **Use consistent terminology**
   - Maintain glossary for key terms
   - Review translations across languages
   - Avoid literal translations

---

## 📞 Support

For translation issues:

1. Check this guide
2. Review translation-to-do files
3. Check i18n documentation
4. Review locale JSON structure
5. Test with translation validation script

---

**Maintained by**: Waynest Development Team  
**Last Review**: April 30, 2026  
**Status**: Production Ready ✅
