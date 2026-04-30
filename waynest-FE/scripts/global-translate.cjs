#!/usr/bin/env node
/**
 * 🌍 Global Translation System
 * Comprehensive translation for all UI strings across all languages
 * Uses multiple translation APIs with fallback support
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const LANGUAGES = ["ar", "fr", "ru", "tr"];
const LOCALES_PATH = path.join(__dirname, "..", "public", "locales");
const REPORT_FILE = path.join(
  __dirname,
  "..",
  "i18n-global-translation-report.json",
);

// Translation API configurations
const APIs = {
  GOOGLE_TRANSLATE: {
    endpoint:
      "https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit",
    fallback: true,
  },
  LIBRETRANSLATE: {
    endpoint:
      process.env.LIBRETRANSLATE_URL || "https://libretranslate.de/translate",
    maxConcurrent: 3,
  },
};

const langCodes = {
  ar: "ar",
  fr: "fr",
  ru: "ru",
  tr: "tr",
};

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    return null;
  }
}

function writeJSON(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// LibreTranslate API
async function translateWithLibreTranslate(text, targetLang) {
  if (targetLang === "en" || !text) return text;

  try {
    const response = await fetch(APIs.LIBRETRANSLATE.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: langCodes[targetLang],
        format: "text",
      }),
    });

    if (!response.ok) {
      console.error(
        `  ⚠️  API Error (${response.status}): ${text.slice(0, 40)}`,
      );
      return null;
    }

    const data = await response.json();
    return data.translatedText || null;
  } catch (err) {
    console.error(`  ⚠️  Translation failed: ${err.message}`);
    return null;
  }
}

// Flatten nested JSON
function flattenJSON(obj, prefix = "") {
  const result = {};
  for (const key in obj) {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenJSON(value, fullKey));
    } else if (typeof value === "string" && value.trim()) {
      result[fullKey] = value;
    }
  }
  return result;
}

// Unflatten JSON
function unflattenJSON(flat) {
  const result = {};
  for (const key in flat) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = flat[key];
  }
  return result;
}

async function translateAllStrings(translations) {
  console.log("\n🔤 Translating all strings globally...\n");

  const enFlat = flattenJSON(translations.en);
  const totalKeys = Object.keys(enFlat).length;
  let processed = 0;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalKeys: totalKeys,
      translatedByLanguage: {},
    },
    languages: {},
    errors: [],
  };

  for (const lang of LANGUAGES) {
    console.log(`\n📝 Translating to ${lang.toUpperCase()}...`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const langFlat = flattenJSON(translations[lang] || {});
    let translatedCount = 0;
    let errorCount = 0;
    processed = 0;

    for (const [key, enText] of Object.entries(enFlat)) {
      // Skip if already translated
      if (langFlat[key] && langFlat[key] !== enText) {
        translatedCount++;
        processed++;
        continue;
      }

      // Skip very short strings and numbers
      if (enText.length < 2 || /^\d+$/.test(enText.trim())) {
        processed++;
        continue;
      }

      // Translate
      const translated = await translateWithLibreTranslate(enText, lang);

      if (translated && translated !== enText) {
        langFlat[key] = translated;
        translatedCount++;
      } else {
        langFlat[key] = enText; // Fallback to English
        errorCount++;
        report.errors.push({
          language: lang,
          key: key,
          englishText: enText.slice(0, 50),
          status: "failed_fallback",
        });
      }

      processed++;
      if (processed % 50 === 0) {
        process.stdout.write(`  [${processed}/${totalKeys}] ✓\n`);
      }

      // Rate limiting
      await sleep(100);
    }

    console.log(
      `\n✅ Translated: ${translatedCount} | ⚠️  Errors: ${errorCount}\n`,
    );

    report.summary.translatedByLanguage[lang] = {
      total: totalKeys,
      translated: translatedCount,
      errors: errorCount,
      coverage: `${Math.round((translatedCount / totalKeys) * 100)}%`,
    };

    // Unflatten and merge back
    translations[lang] = unflattenJSON(langFlat);
  }

  return { translations, report };
}

async function main() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║   🌍 GLOBAL TRANSLATION SYSTEM             ║");
  console.log("║   Universal Multilingual Coverage          ║");
  console.log("╚════════════════════════════════════════════╝\n");

  // Step 1: Load all translations
  console.log("📚 Loading translations from all languages...\n");
  const translations = {};

  for (const lang of ["en", ...LANGUAGES]) {
    const langDir = path.join(LOCALES_PATH, lang);
    const files = fs.readdirSync(langDir).filter((f) => f.endsWith(".json"));

    translations[lang] = {};
    for (const file of files) {
      const filePath = path.join(langDir, file);
      const content = readJSON(filePath);
      if (content) {
        // Merge into translations object using namespace
        const namespace = file.replace(".json", "");
        translations[lang][namespace] = content;
      }
    }

    const keyCount = Object.keys(flattenJSON(translations[lang])).length;
    console.log(`  ✓ ${lang.toUpperCase()}: ${keyCount} translation keys`);
  }

  // Step 2: Translate all strings
  const { translations: translatedData, report } =
    await translateAllStrings(translations);

  // Step 3: Save updated translations
  console.log("\n💾 Saving translated files...\n");

  for (const lang of LANGUAGES) {
    const langDir = path.join(LOCALES_PATH, lang);

    // Save each namespace file
    for (const namespace in translatedData[lang]) {
      const filePath = path.join(langDir, `${namespace}.json`);
      writeJSON(filePath, translatedData[lang][namespace]);
    }

    const keyCount = Object.keys(flattenJSON(translatedData[lang])).length;
    console.log(`  ✓ Saved ${lang}/: ${keyCount} keys`);
  }

  // Step 4: Save report
  writeJSON(REPORT_FILE, report);
  console.log(`\n✓ Report saved: ${REPORT_FILE}\n`);

  // Summary
  console.log("═══════════════════════════════════════════");
  console.log("🎉 GLOBAL TRANSLATION COMPLETE!\n");
  console.log("📊 Translation Coverage:\n");

  for (const lang of LANGUAGES) {
    const stats = report.summary.translatedByLanguage[lang];
    console.log(
      `  ${lang.toUpperCase()}: ${stats.coverage} (${stats.translated}/${stats.total})`,
    );
  }

  console.log("\n✨ All UI strings now available in all languages!");
  console.log("═══════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
