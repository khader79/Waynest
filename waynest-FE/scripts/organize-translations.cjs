#!/usr/bin/env node
/**
 * Smart Translation Organizer
 * - Extracts untranslated strings
 * - Organizes them by module/namespace
 * - Creates structured translation bundles
 * - Supports manual translation workflow
 */

const fs = require("fs");
const path = require("path");

const UNTRANSLATED_REPORT = path.join(
  __dirname,
  "..",
  "i18n-untranslated-report.json",
);
const LOCALES_PATH = path.join(__dirname, "..", "public", "locales");
const OUTPUT_DIR = path.join(__dirname, "..", "translation-to-do");
const LANGUAGES = ["ar", "fr", "ru", "tr"];

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    return null;
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJSON(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

function extractNamespace(locations) {
  if (!locations || locations.length === 0) return "general";
  const firstLocation = locations[0];
  // Extract namespace from file path: src/pages/user/profile -> user.profile
  const match = firstLocation.match(/src\/([^/]+)\/([^/]+)/);
  if (match) {
    return `${match[1]}.${match[2]}`;
  }
  return "general";
}

function organizeByNamespace(untranslatedData) {
  const organized = {};
  for (const item of untranslatedData) {
    const namespace = extractNamespace(item.locations);
    if (!organized[namespace]) {
      organized[namespace] = [];
    }
    organized[namespace].push(item);
  }
  return organized;
}

async function main() {
  console.log("📚 Smart Translation Organizer");
  console.log("====================================\n");

  // Step 1: Read untranslated data
  console.log("📖 Reading untranslated strings...");
  const untranslatedData = readJSON(UNTRANSLATED_REPORT);
  if (!untranslatedData || untranslatedData.length === 0) {
    console.log("✓ No untranslated strings found");
    return;
  }
  console.log(`✓ Found ${untranslatedData.length} untranslated strings\n`);

  // Step 2: Organize by namespace
  console.log("🏗️ Organizing by module/namespace...");
  const organized = organizeByNamespace(untranslatedData);
  const namespaces = Object.keys(organized).sort();
  console.log(`✓ Organized into ${namespaces.length} namespaces\n`);

  // Step 3: Create translation structure
  ensureDir(OUTPUT_DIR);

  // Master translation file structure
  const translationStructure = {};
  for (const namespace of namespaces) {
    translationStructure[namespace] = {};
    for (const item of organized[namespace]) {
      const key = item.text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 50);
      translationStructure[namespace][key] = {
        en: item.text,
        ar: "",
        fr: "",
        ru: "",
        tr: "",
        locations: item.locations,
      };
    }
  }

  // Save master translation template
  writeJSON(
    path.join(OUTPUT_DIR, "000-translation-template.json"),
    translationStructure,
  );
  console.log("✓ Created translation template\n");

  // Step 4: Create language-specific files
  console.log("📄 Creating language-specific translation files...");
  for (const lang of LANGUAGES) {
    const langTranslations = {};
    for (const namespace of namespaces) {
      langTranslations[namespace] = {};
      for (const item of organized[namespace]) {
        const key = item.text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 50);
        langTranslations[namespace][key] =
          `[TRANSLATE TO ${lang.toUpperCase()}]: ${item.text}`;
      }
    }
    writeJSON(
      path.join(OUTPUT_DIR, `translations-${lang}.json`),
      langTranslations,
    );
    console.log(
      `  ✓ ${lang}.json (${Object.keys(langTranslations).length} namespaces)`,
    );
  }
  console.log();

  // Step 5: Create index with statistics
  const stats = {
    totalStrings: untranslatedData.length,
    byNamespace: {},
    languages: LANGUAGES,
    createdAt: new Date().toISOString(),
    instructions:
      "Fill in the blanks in each language file. Each key starts with [TRANSLATE TO LANG]: original_text",
  };

  for (const namespace of namespaces) {
    stats.byNamespace[namespace] = organized[namespace].length;
  }

  writeJSON(path.join(OUTPUT_DIR, "INDEX.json"), stats);

  // Step 6: Create human-friendly organization document
  const orgDoc = `# Translation Organization Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Untranslated Strings**: ${untranslatedData.length}
- **Namespaces**: ${namespaces.length}
- **Languages to Translate**: ${LANGUAGES.join(", ")}

## By Namespace
${namespaces.map((ns) => `- **${ns}**: ${organized[ns].length} strings`).join("\n")}

## Files Created
1. **000-translation-template.json** - Master template with all languages in one place
2. **translations-ar.json** - Arabic translations
3. **translations-fr.json** - French translations
4. **translations-ru.json** - Russian translations  
5. **translations-tr.json** - Turkish translations
6. **INDEX.json** - Statistics and metadata

## Translation Instructions
1. Open each \`translations-{lang}.json\` file
2. Replace \`[TRANSLATE TO {LANG}]: {original_text}\` with the actual translation
3. Preserve the JSON structure
4. Keep key names in English (lowercase with underscores)
5. Run \`npm run merge-translations\` to merge into main translation files

## Sample Translation (before):
\`\`\`json
{
  "pages.user": {
    "profile_title": "[TRANSLATE TO AR]: Welcome to your profile"
  }
}
\`\`\`

## Sample Translation (after):
\`\`\`json
{
  "pages.user": {
    "profile_title": "مرحبا بك في ملفك الشخصي"
  }
}
\`\`\`
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, "README.md"), orgDoc, "utf8");

  // Summary
  console.log("✨ Translation Organization Complete!");
  console.log("====================================");
  console.log(`Location: ${OUTPUT_DIR}`);
  console.log(`\nFiles created:`);
  console.log(
    "  1. 000-translation-template.json - Master translation structure",
  );
  console.log("  2. translations-ar.json - Arabic");
  console.log("  3. translations-fr.json - French");
  console.log("  4. translations-ru.json - Russian");
  console.log("  5. translations-tr.json - Turkish");
  console.log("  6. README.md - Translation instructions");
  console.log(`\nTotal strings to translate: ${untranslatedData.length}`);
  console.log(`Organized into: ${namespaces.length} namespaces`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
