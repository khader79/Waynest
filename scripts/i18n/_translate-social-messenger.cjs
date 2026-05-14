// Translate ALL social/messenger keys for all 14 non-English languages
const fs = require('fs');
const path = require('path');
const https = require('https');

const LOCALE_DIR = path.resolve('waynest-FE/public/locales');
const EN_PATH = path.join(LOCALE_DIR, 'en', 'translation.json');

const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));

function flatten(obj, prefix = '') {
  const r = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(r, flatten(v, key));
    else r[key] = String(v);
  }
  return r;
}

function unflatten(flat) {
  const root = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return root;
}

function protectTemplates(text) {
  const placeholders = [];
  const result = text.replace(/\{\{(\w+)\}\}/g, (match) => {
    placeholders.push(match);
    return `__TPL${placeholders.length}__`;
  });
  return { text: result, placeholders };
}

function restoreTemplates(text, placeholders) {
  let result = text;
  for (let i = 0; i < placeholders.length; i++) {
    result = result.replace(`__TPL${i + 1}__`, placeholders[i]);
  }
  return result;
}

function translateText(text, targetLang) {
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encoded}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let translation = '';
          if (parsed && parsed[0]) {
            for (const part of parsed[0]) {
              if (part[0]) translation += part[0];
            }
          }
          resolve(translation || text);
        } catch {
          resolve(text);
        }
      });
    }).on('error', () => resolve(text));
  });
}

const enFlat = flatten(en);

// Only translate social and messenger keys
const PREFIXES = ['social.', 'messenger.'];

function isCode(v) {
  return /^[\d:%\s\/\-.*"'<>()@#$&!?\n]+$/.test(v) || v === '' || v === '*';
}

const LANGUAGES = [
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ur', name: 'Urdu' },
];

async function main() {
  for (const lang of LANGUAGES) {
    console.log(`\n══════ ${lang.name} (${lang.code}) ══════`);

    const langPath = path.join(LOCALE_DIR, lang.code, 'translation.json');
    const langData = JSON.parse(fs.readFileSync(langPath, 'utf-8'));
    const langFlat = flatten(langData);

    // Find social/messenger keys still in English
    const toTranslate = [];
    for (const [k, v] of Object.entries(enFlat)) {
      const isTarget = PREFIXES.some(p => k.startsWith(p));
      if (!isTarget) continue;
      if (langFlat[k] === v && !isCode(v)) {
        toTranslate.push({ key: k, value: v });
      }
    }

    if (toTranslate.length === 0) {
      console.log('  ✓ All social/messenger translated.');
      continue;
    }

    console.log(`  Found ${toTranslate.length} social/messenger keys to translate.`);

    const BATCH_SIZE = 15;
    const BATCH_DELAY = 600;

    for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
      const batch = toTranslate.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(toTranslate.length / BATCH_SIZE);

      process.stdout.write(`  Batch ${batchNum}/${totalBatches}...`);

      const promises = batch.map(async (item) => {
        const { text: protectedText, placeholders } = protectTemplates(item.value);
        const translated = await translateText(protectedText, lang.code);
        const restored = restoreTemplates(translated, placeholders);
        // Keep original if translation failed or is empty
        return { key: item.key, value: restored || item.value };
      });

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result.value !== enFlat[result.key]) {
          langFlat[result.key] = result.value;
        }
      }

      console.log(` ${results.length} done`);

      if (i + BATCH_SIZE < toTranslate.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
    }

    // Write back
    const updated = unflatten(langFlat);
    fs.writeFileSync(langPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
    console.log(`  ✓ Saved ${lang.code}/translation.json`);
  }

  console.log('\n══════ All social/messenger translations done! ══════');
}

main().catch(e => console.error('Fatal:', e));
