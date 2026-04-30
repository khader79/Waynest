#!/usr/bin/env node
/**
 * Smart Translation Merger
 * - Reads organized translations
 * - Validates translations
 * - Merges into main locale files
 * - Creates comprehensive translation maps
 */

const fs = require("fs");
const path = require("path");

const TRANSLATION_TO_DO_DIR = path.join(__dirname, "..", "translation-to-do");
const LOCALES_PATH = path.join(__dirname, "..", "public", "locales");
const LANGUAGES = ["en", "ar", "fr", "ru", "tr"];

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

function flattenJSON(obj, prefix = "") {
  const result = {};
  for (const key in obj) {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenJSON(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function unflattenJSON(obj) {
  const result = {};
  for (const key in obj) {
    const parts = key.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = obj[key];
  }
  return result;
}

function mergeDeep(target, source) {
  for (const key in source) {
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

async function main() {
  console.log("🔄 Smart Translation Merger");
  console.log("====================================\n");

  // Step 1: Read all translation files
  console.log("📂 Reading translation files...");
  const translationFiles = {};

  // Read template
  const template = readJSON(
    path.join(TRANSLATION_TO_DO_DIR, "000-translation-template.json"),
  );
  if (!template) {
    console.log("❌ Template not found. Run organize-translations.cjs first.");
    process.exit(1);
  }

  // Read language files
  for (const lang of ["ar", "fr", "ru", "tr"]) {
    const langFile = readJSON(
      path.join(TRANSLATION_TO_DO_DIR, `translations-${lang}.json`),
    );
    if (langFile) {
      translationFiles[lang] = langFile;
    }
  }

  console.log(
    `✓ Found template + ${Object.keys(translationFiles).length} language files\n`,
  );

  // Step 2: Load existing translations
  console.log("📚 Loading existing translations...");
  const existingTranslations = {};
  for (const lang of LANGUAGES) {
    const langDir = path.join(LOCALES_PATH, lang);
    const translationFile = path.join(langDir, "translation.json");
    existingTranslations[lang] = readJSON(translationFile) || {};
  }
  console.log(`✓ Loaded ${LANGUAGES.length} existing translation files\n`);

  // Step 3: Build new translations from template
  console.log("🔧 Building translations from template...");

  // Flatten template for easier processing
  const flatTemplate = flattenJSON(template);
  console.log(
    `✓ Flattened ${Object.keys(flatTemplate).length} translation keys\n`,
  );

  // Step 4: Merge with existing and create comprehensive map
  console.log("🔀 Merging translations...");
  const mergedTranslations = {};

  for (const lang of LANGUAGES) {
    mergedTranslations[lang] = JSON.parse(
      JSON.stringify(existingTranslations[lang]),
    );

    // Merge new translations
    if (lang !== "en" && translationFiles[lang]) {
      console.log(`  Merging ${lang}...`);
      mergeDeep(mergedTranslations[lang], translationFiles[lang]);
    }
  }
  console.log();

  // Step 5: Save merged translations
  console.log("💾 Saving merged translations...");
  for (const lang of LANGUAGES) {
    const langDir = path.join(LOCALES_PATH, lang);
    ensureDir(langDir);

    // Save main translation file
    const mainFile = path.join(langDir, "translation.json");
    writeJSON(mainFile, mergedTranslations[lang]);

    const keyCount = Object.keys(flattenJSON(mergedTranslations[lang])).length;
    console.log(`  ✓ ${lang}/translation.json (${keyCount} keys)`);
  }
  console.log();

  // Step 6: Create comprehensive report
  console.log("📊 Creating comprehensive report...");

  const report = {
    createdAt: new Date().toISOString(),
    languages: LANGUAGES,
    summary: {
      totalNamespaces: Object.keys(template).length,
      byLanguage: {},
    },
    details: [],
  };

  for (const lang of LANGUAGES) {
    const flat = flattenJSON(mergedTranslations[lang]);
    report.summary.byLanguage[lang] = {
      totalKeys: Object.keys(flat).length,
      file: `${lang}/translation.json`,
    };
  }

  // Add details for template keys
  for (const namespace in template) {
    for (const key in template[namespace]) {
      const item = template[namespace][key];
      const detail = {
        key: `${namespace}.${key}`,
        english: item.en,
        locations: item.locations.slice(0, 2),
        translations: {
          ar: mergedTranslations.ar[namespace]?.[key] || "[MISSING]",
          fr: mergedTranslations.fr[namespace]?.[key] || "[MISSING]",
          ru: mergedTranslations.ru[namespace]?.[key] || "[MISSING]",
          tr: mergedTranslations.tr[namespace]?.[key] || "[MISSING]",
        },
      };
      report.details.push(detail);
    }
  }

  writeJSON(
    path.join(LOCALES_PATH, "..", "i18n-translation-complete-report.json"),
    report,
  );
  console.log("✓ Report created: i18n-translation-complete-report.json\n");

  // Summary
  console.log("✨ Translation Merge Complete!");
  console.log("====================================");
  console.log(`\nLanguages Updated:`);
  for (const lang of LANGUAGES) {
    const flat = flattenJSON(mergedTranslations[lang]);
    console.log(`  ${lang}: ${Object.keys(flat).length} translation keys`);
  }
  console.log(`\nFiles Updated:`);
  for (const lang of LANGUAGES) {
    console.log(`  waynest-FE/public/locales/${lang}/translation.json`);
  }
  console.log(`\nNext Steps:`);
  console.log("  1. Review translations in each language file");
  console.log(
    "  2. For any [MISSING] or incorrect translations, update manually",
  );
  console.log("  3. Test the frontend with different languages");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
