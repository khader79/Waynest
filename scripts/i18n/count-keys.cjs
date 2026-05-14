const fs = require('fs');
const path = require('path');
const LOCALE_DIR = 'waynest-FE/public/locales';
const LANGUAGES = ['ar','fr','ru','tr','es','de','zh','pt','he','hi','it','ja','ko','ur'];

function countKeys(obj) {
  let count = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      count += countKeys(v);
    } else {
      count++;
    }
  }
  return count;
}

function getTopKeys(obj) {
  return Object.keys(obj).sort();
}

const en = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, 'en', 'translation.json'), 'utf-8'));
const enCount = countKeys(en);
const enTopKeys = getTopKeys(en);

console.log('English: ' + enCount + ' keys, top-level sections: ' + enTopKeys.join(', '));
console.log();

for (const lang of LANGUAGES) {
  const data = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, lang, 'translation.json'), 'utf-8'));
  const count = countKeys(data);
  const topKeys = getTopKeys(data);
  const missingKeys = enTopKeys.filter(k => !topKeys.includes(k));
  const extraKeys = topKeys.filter(k => !enTopKeys.includes(k));
  console.log(lang + ': ' + count + ' keys (en=' + enCount + ', diff=' + (count - enCount) + ')');
  if (missingKeys.length > 0) console.log('  MISSING sections: ' + missingKeys.join(', '));
  if (extraKeys.length > 0) console.log('  EXTRA sections: ' + extraKeys.join(', '));
}
