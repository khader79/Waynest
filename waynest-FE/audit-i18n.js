import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, 'public', 'locales');
const LANGUAGES = ['en', 'ar', 'he', 'fr', 'ru', 'tr', 'es', 'de', 'zh', 'ja', 'ko', 'it', 'pt', 'hi', 'ur'];

function flattenKeys(obj, prefix = '') {
  let result = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenKeys(obj[key], fullKey));
    } else {
      result[fullKey] = obj[key];
    }
  }
  return result;
}

function extractPlaceholders(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/\{\{[^}]+\}\}/g);
  return matches ? matches.sort() : [];
}

// Load all translations
const translations = {};
const flatTranslations = {};
const errors = {};

for (const lang of LANGUAGES) {
  const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    translations[lang] = JSON.parse(content);
    flatTranslations[lang] = flattenKeys(translations[lang]);
    errors[lang] = [];
  } catch (e) {
    console.error(`Error loading ${lang}: ${e.message}`);
    errors[lang] = [`JSON Parse Error: ${e.message}`];
    flatTranslations[lang] = {};
  }
}

const enKeys = flatTranslations['en'];
const enKeyCount = Object.keys(enKeys).length;

console.log('=== TRANSLATION AUDIT REPORT ===\n');
console.log(`English (en) key count: ${enKeyCount}\n`);

// 1. Key count comparison
console.log('--- KEY COUNT COMPARISON ---');
for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const langKeys = flatTranslations[lang];
  const langKeyCount = Object.keys(langKeys).length;
  const diff = langKeyCount - enKeyCount;
  const status = diff === 0 ? '✓' : diff > 0 ? '+' : '✗';
  console.log(`${lang}: ${langKeyCount} keys (${diff > 0 ? '+' : ''}${diff} vs en) ${status}`);
}

// 2. Missing keys per language
console.log('\n--- MISSING KEYS (not in target, present in en) ---');
for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const langKeys = flatTranslations[lang];
  const missing = Object.keys(enKeys).filter(k => !(k in langKeys));
  if (missing.length > 0) {
    console.log(`\n${lang}: ${missing.length} missing keys:`);
    missing.slice(0, 20).forEach(k => console.log(`  - ${k}`));
    if (missing.length > 20) console.log(`  ... and ${missing.length - 20} more`);
  }
}

// 3. Extra keys (in target but not in en)
console.log('\n--- EXTRA KEYS (in target but not in en) ---');
for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const langKeys = flatTranslations[lang];
  const extra = Object.keys(langKeys).filter(k => !(k in enKeys));
  if (extra.length > 0) {
    console.log(`\n${lang}: ${extra.length} extra keys:`);
    extra.slice(0, 10).forEach(k => console.log(`  + ${k}`));
    if (extra.length > 10) console.log(`  ... and ${extra.length - 10} more`);
  }
}

// 4. Untranslated values (same as English)
console.log('\n--- UNTRANSLATED VALUES (same as English) ---');
for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const langKeys = flatTranslations[lang];
  const untranslated = [];
  for (const key in enKeys) {
    if (key in langKeys && langKeys[key] === enKeys[key] && typeof enKeys[key] === 'string' && enKeys[key].trim().length > 0) {
      untranslated.push(key);
    }
  }
  if (untranslated.length > 0) {
    console.log(`\n${lang}: ${untranslated.length} untranslated keys:`);
    untranslated.slice(0, 10).forEach(k => console.log(`  = ${k}: "${enKeys[k].substring(0, 50)}..."`));
    if (untranslated.length > 10) console.log(`  ... and ${untranslated.length - 10} more`);
  }
}

// 5. Placeholder consistency
console.log('\n--- PLACEHOLDER INCONSISTENCIES ---');
for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const langKeys = flatTranslations[lang];
  const inconsistencies = [];
  for (const key in enKeys) {
    if (key in langKeys) {
      const enPlaceholders = extractPlaceholders(enKeys[key]);
      const langPlaceholders = extractPlaceholders(langKeys[key]);
      if (enPlaceholders.length > 0 && JSON.stringify(enPlaceholders) !== JSON.stringify(langPlaceholders)) {
        inconsistencies.push({
          key,
          en: enPlaceholders,
          lang: langPlaceholders,
          enValue: enKeys[key],
          langValue: langKeys[key]
        });
      }
    }
  }
  if (inconsistencies.length > 0) {
    console.log(`\n${lang}: ${inconsistencies.length} placeholder mismatches:`);
    inconsistencies.slice(0, 10).forEach(i => {
      console.log(`  ${i.key}: en=${JSON.stringify(i.en)} vs ${lang}=${JSON.stringify(i.lang)}`);
      console.log(`    en: "${i.enValue.substring(0, 60)}..."`);
      console.log(`    ${lang}: "${i.langValue.substring(0, 60)}..."`);
    });
    if (inconsistencies.length > 10) console.log(`  ... and ${inconsistencies.length - 10} more`);
  }
}

// 6. Empty values
console.log('\n--- EMPTY VALUES ---');
for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const langKeys = flatTranslations[lang];
  const emptyKeys = Object.entries(langKeys).filter(([k, v]) => v === '' || v === null || v === undefined);
  if (emptyKeys.length > 0) {
    console.log(`\n${lang}: ${emptyKeys.length} empty values:`);
    emptyKeys.forEach(([k, v]) => console.log(`  - ${k}`));
  }
}

console.log('\n=== END OF REPORT ===');
