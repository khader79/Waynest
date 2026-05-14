/**
 * Regenerate ALL translation.json files to match current English structure.
 * Preserves existing translations, adds English fallback for missing keys.
 * Run: node scripts/i18n/regenerate-all.cjs
 */
const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.resolve(__dirname, '../../waynest-FE/public/locales');
const LANGUAGES = ['ar','fr','ru','tr','es','de','zh','pt','he','hi','it','ja','ko','ur'];

const EN = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, 'en', 'translation.json'), 'utf-8'));

function setByPath(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function getByPath(obj, pathStr) {
  const parts = pathStr.split('.');
  let current = obj;
  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[p];
  }
  return current;
}

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, p));
    } else {
      result[p] = value;
    }
  }
  return result;
}

// Build English flat structure as template
const enFlat = flatten(EN);
const enKeys = Object.keys(enFlat);

for (const lang of LANGUAGES) {
  const fPath = path.join(LOCALE_DIR, lang, 'translation.json');
  const existing = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
  const existingFlat = flatten(existing);

  // Build new object matching English structure, preserving existing translations
  const result = {};
  for (const key of enKeys) {
    const existingValue = existingFlat[key];
    // Use existing translation if available and different from placeholder
    if (existingValue !== undefined && existingValue !== '' && existingValue !== 'EN_KEY') {
      setByPath(result, key, existingValue);
    } else {
      // Fall back to English
      setByPath(result, key, enFlat[key]);
    }
  }

  fs.writeFileSync(fPath, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  console.log(`${lang}: regenerated (${enKeys.length} keys, preserved ${Object.keys(existingFlat).length} existing)`);
}

console.log('\nDone. All languages now match English structure.');
