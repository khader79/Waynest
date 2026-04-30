#!/usr/bin/env node
/**
 * Comprehensive Translation Script
 * Translates all untranslated UI strings to all languages (ar, en, fr, ru, tr)
 * Uses LibreTranslate API (free, no key required)
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const LANGUAGES = ["en", "ar", "fr", "ru", "tr"];
const LOCALES_PATH = path.join(__dirname, "..", "public", "locales");
const UNTRANSLATED_REPORT = path.join(
  __dirname,
  "..",
  "i18n-untranslated-report.json",
);
const OUTPUT_REPORT = path.join(
  __dirname,
  "..",
  "i18n-comprehensive-translation-report.json",
);

// Language name map for translation APIs
const langNameMap = {
  en: "English",
  ar: "Arabic",
  fr: "French",
  ru: "Russian",
  tr: "Turkish",
};

// Language codes for LibreTranslate
const libreTranslateLangMap = {
  en: "en",
  ar: "ar",
  fr: "fr",
  ru: "ru",
  tr: "tr",
};

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateWithLibreTranslate(text, targetLang) {
  if (targetLang === "en") return text; // Already in English

  const endpoint =
    process.env.LIBRETRANSLATE_URL || "https://libretranslate.de/translate";
  const libreTarget = libreTranslateLangMap[targetLang] || targetLang;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: libreTarget,
        format: "text",
      }),
    });

    if (!res.ok) {
      console.error(
        `  [ERROR] LibreTranslate HTTP ${res.status} for "${text.slice(0, 50)}"`,
      );
      return null;
    }

    const data = await res.json();
    return data.translatedText || null;
  } catch (err) {
    console.error(`  [ERROR] Translation failed: ${err.message}`);
    return null;
  }
}

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

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function mergeTranslations(existing, newTranslations) {
  // Recursively merge new translations into existing structure
  for (const key in newTranslations) {
    if (
      typeof newTranslations[key] === "object" &&
      newTranslations[key] !== null &&
      !Array.isArray(newTranslations[key])
    ) {
      if (!existing[key]) {
        existing[key] = {};
      }
      mergeTranslations(existing[key], newTranslations[key]);
    } else {
      existing[key] = newTranslations[key];
    }
  }
  return existing;
}

async function main() {
  console.log("🌍 Comprehensive Translation Process");
  console.log("====================================\n");

  // Step 1: Read untranslated report
  console.log("📖 Reading untranslated strings...");
  const untranslatedData = readJSON(UNTRANSLATED_REPORT);
  if (!untranslatedData || untranslatedData.length === 0) {
    console.log("✓ No untranslated strings found");
    return;
  }
  console.log(`✓ Found ${untranslatedData.length} untranslated strings\n`);

  // Step 2: Load existing translations
  console.log("📚 Loading existing translations for all languages...");
  const existingTranslations = {};
  for (const lang of LANGUAGES) {
    const langDir = path.join(LOCALES_PATH, lang);
    const translationFile = path.join(langDir, "translation.json");
    existingTranslations[lang] = readJSON(translationFile) || {};
    console.log(
      `  ✓ Loaded ${lang}/translation.json (${JSON.stringify(existingTranslations[lang]).length} chars)`,
    );
  }
  console.log();

  // Step 3: Create new translations
  const newTranslations = {};
  for (const lang of LANGUAGES) {
    newTranslations[lang] = {};
  }

  const report = {
    processedAt: new Date().toISOString(),
    totalStrings: untranslatedData.length,
    languages: LANGUAGES,
    translations: [],
  };

  // Step 4: Translate each untranslated string
  console.log("🔤 Translating strings...\n");
  for (let i = 0; i < untranslatedData.length; i++) {
    const { text, locations } = untranslatedData[i];
    const keyName = `autogen.${text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 50)}`;

    process.stdout.write(
      `[${i + 1}/${untranslatedData.length}] Translating: "${text.slice(0, 60)}${text.length > 60 ? "..." : ""}"`,
    );

    const translationEntry = {
      text,
      key: keyName,
      locations: locations.slice(0, 3), // Keep first 3 locations
      translations: {
        en: text,
      },
    };

    // Translate to each language
    for (const lang of LANGUAGES) {
      if (lang === "en") {
        translationEntry.translations.en = text;
      } else {
        const translated = await translateWithLibreTranslate(text, lang);
        if (translated) {
          translationEntry.translations[lang] = translated;
          newTranslations[lang][keyName] = translated;
        } else {
          translationEntry.translations[lang] = `[FAILED] ${text}`;
          newTranslations[lang][keyName] = text; // Fallback to English
        }
      }
      await sleep(100); // Rate limiting
    }

    report.translations.push(translationEntry);
    console.log(" ✓");
  }

  console.log("\n📝 Merging translations into language files...\n");

  // Step 5: Merge and save translations
  for (const lang of LANGUAGES) {
    const langDir = path.join(LOCALES_PATH, lang);
    ensureDir(langDir);

    const translationFile = path.join(langDir, "translation.json");
    const merged = mergeTranslations(
      existingTranslations[lang],
      newTranslations[lang],
    );
    writeJSON(translationFile, merged);

    const translations = Object.keys(merged).length;
    console.log(`  ✓ ${lang}/translation.json (${translations} total keys)`);
  }

  // Step 6: Save report
  console.log("\n📊 Saving translation report...");
  writeJSON(OUTPUT_REPORT, report);
  console.log(`✓ Report saved to: ${OUTPUT_REPORT}\n`);

  // Summary
  console.log("✨ Translation Complete!");
  console.log("====================================");
  console.log(`Languages: ${LANGUAGES.join(", ")}`);
  console.log(`Strings translated: ${untranslatedData.length}`);
  console.log(`Report: ${OUTPUT_REPORT}`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
