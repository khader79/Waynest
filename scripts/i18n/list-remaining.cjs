const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.resolve(__dirname, '../../waynest-FE/public/locales');
const LANGUAGES = ['ar', 'fr', 'ru', 'tr', 'es', 'de', 'zh', 'pt'];
const EN_PATH = path.join(LOCALE_DIR, 'en', 'translation.json');
const enData = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
const brands = ['Visa','Mastercard','PayPal','Stripe','Google','Facebook','Twitter','Instagram','WhatsApp','YouTube','Spotify','Airbnb','Uber','iOS','Android','iPhone','iPad','LinkedIn'];
function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, p));
    } else {
      result[p] = String(value);
    }
  }
  return result;
}
const flatEn = flatten(enData);
function isIgnored(v) {
  if (/^\{\{.*\}\}$/.test(v)) return true;
  if (/^[\d:%\s\/\-.*"''<>()]+$/.test(v)) return true;
  if (/^[A-Z][A-Z]+$/.test(v)) return true;
  if (brands.includes(v)) return true;
  if (v === '') return true;
  if (v === '*') return true;
  return false;
}
for (const lang of LANGUAGES) {
  const fPath = path.join(LOCALE_DIR, lang, 'translation.json');
  const data = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
  const flat = flatten(data);
  const untranslated = {};
  for (const [k, ev] of Object.entries(flatEn)) {
    if (!(k in flat)) {
      untranslated[k] = { value: '<MISSING>', reason: 'missing' };
    } else {
      const v = flat[k];
      if (v === ev && !isIgnored(ev)) {
        untranslated[k] = { value: v, reason: `english: same as en` };
      }
    }
  }
  const keys = Object.keys(untranslated);
  console.log(`\n=== ${lang}: ${keys.length} remaining ===`);
  for (const k of keys) {
    console.log(`  ${k} = '${untranslated[k].value}'`);
  }
}
