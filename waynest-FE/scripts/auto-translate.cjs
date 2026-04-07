#!/usr/bin/env node
/*
 Auto-translate autogen keys using a LibreTranslate endpoint (fallbacks).
 Usage: run from repo root: `node waynest-FE/scripts/auto-translate.cjs`
 Optional env vars:
 - LIBRETRANSLATE_URL: custom translate endpoint (POST /translate)
 - SKIP_NETWORK: if set, skips network calls and copies English text into other langs

 Writes:
 - waynest-FE/i18n-autogen-translated-report.json
 - waynest-FE/i18n-autogen-translated-report.csv
 - updates waynest-FE/public/locales/<lang>/translation.json (creates if missing)
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const cwd = process.cwd();
const wfRoot = path.join(cwd, 'waynest-FE');
const candidates = [
  path.join(wfRoot, 'i18n-autogen-map.json'),
  path.join(cwd, 'i18n-autogen-map.json'),
];

function findAutogenMap() {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function translateTextLibre(text, target) {
  const endpoint = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de/translate';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'en', target, format: 'text' })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    // LibreTranslate-style: { translatedText: '...' }
    if (j.translatedText) return j.translatedText;
    // fallback: common shape { data: { translations: [ { translatedText } ] } }
    if (j.data && j.data.translations && j.data.translations[0] && j.data.translations[0].translatedText) {
      return j.data.translations[0].translatedText;
    }
    return null;
  } catch (err) {
    console.error('Translate error (Libre) ->', err.message);
    return null;
  }
}

const langNameMap = {
  en: 'English',
  ar: 'Arabic',
  fr: 'French',
  ru: 'Russian',
  tr: 'Turkish'
};

async function translateOpenAI(text, targetLanguageName) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const endpoint = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions';
    const system = `You are a concise translator. Translate the user's text to ${targetLanguageName}. Output only the translated text with no commentary. Preserve punctuation, emojis, and line breaks.`;
    const body = {
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text }
      ],
      temperature: 0,
      max_tokens: 800
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error('HTTP ' + res.status + ' ' + t.slice(0,200));
    }
    const j = await res.json();
    if (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) {
      return j.choices[0].message.content.trim();
    }
    return null;
  } catch (err) {
    console.error('Translate error (OpenAI) ->', err.message);
    return null;
  }
}

async function translateGemini(text, targetLanguageName) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const endpoint = process.env.GEMINI_API_URL;
  if (!endpoint) {
    console.error('GEMINI_API_URL not set — set to your Gemini endpoint (e.g. https://...): skipping Gemini.');
    return null;
  }
  try {
    const system = `You are a concise translator. Translate the user's text to ${targetLanguageName}. Output only the translated text with no commentary. Preserve punctuation, emojis, and line breaks.`;
    let url = endpoint;
    let headers = { 'Content-Type': 'application/json' };

    // Google Generative Language (generativelanguage.googleapis.com) expects x-goog-api-key header
    const isGoogleGL = url.includes('generativelanguage.googleapis.com');
    if (isGoogleGL) {
      headers['x-goog-api-key'] = apiKey;
    } else if (process.env.GEMINI_USE_KEY_PARAM === '1') {
      url += (url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(apiKey);
    } else {
      headers.Authorization = 'Bearer ' + apiKey;
    }

    // For Google GL, use the `contents` body shape; otherwise send a generic prompt payload
    let body;
    if (isGoogleGL) {
      body = { contents: [{ parts: [{ text: system + '\n\n' + text }] }] };
    } else {
      body = { prompt: system + '\n\n' + text };
    }

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const t = await res.text();
      throw new Error('HTTP ' + res.status + ' ' + t.slice(0,200));
    }
    const j = await res.json();
    if (!j) return null;
    // Google GL response: { candidates: [ { content: { parts: [ { text } ] } } ] }
    if (j.candidates && j.candidates[0]) {
      const cand = j.candidates[0];
      if (cand.content && Array.isArray(cand.content.parts) && cand.content.parts[0] && cand.content.parts[0].text) {
        return cand.content.parts[0].text.trim();
      }
      // older shapes
      if (cand.text) return cand.text.trim();
    }
    // fallback shapes (OpenAI-like)
    if (typeof j === 'string' && j.trim()) return j.trim();
    if (j.outputText) return j.outputText;
    if (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) return j.choices[0].message.content.trim();
    if (j.responses && j.responses[0] && j.responses[0].content) {
      const c = j.responses[0].content;
      if (Array.isArray(c)) return c.map(x => x.text || x.output_text || '').join('').trim() || null;
      if (typeof c === 'string') return c.trim();
    }
    return null;
  } catch (err) {
    console.error('Translate error (Gemini) ->', err.message);
    return null;
  }
}

async function translate(text, target) {
  if (!text || text.trim() === '') return text;
  if (process.env.SKIP_NETWORK) return text;
  // Prefer Gemini if API key provided
  if (process.env.GEMINI_API_KEY) {
    const langName = langNameMap[target] || target;
    const trGem = await translateGemini(text, langName);
    if (trGem) return trGem;
  }
  // Prefer OpenAI if API key provided
  if (process.env.OPENAI_API_KEY) {
    const langName = langNameMap[target] || target;
    const trOpen = await translateOpenAI(text, langName);
    if (trOpen) return trOpen;
  }
  // fallback to libretranslate
  let tr = await translateTextLibre(text, target);
  if (tr) return tr;
  // small delay then return original as fallback
  await sleep(100);
  return text;
}

function setNested(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in cur) || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function getNested(obj, parts) {
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

async function main() {
  const mapPath = findAutogenMap();
  if (!mapPath) {
    console.error('i18n-autogen-map.json not found. Run generate-autogen-keys first.');
    process.exitCode = 2;
    return;
  }
  console.log('Using autogen map:', mapPath);

  const map = readJSON(mapPath); // array of { key, text, locations }

  const localesDir = path.join(wfRoot, 'public', 'locales');
  if (!fs.existsSync(localesDir)) {
    console.error('Locales folder not found at', localesDir);
    process.exitCode = 3;
    return;
  }

  const langs = fs.readdirSync(localesDir).filter(f => fs.statSync(path.join(localesDir, f)).isDirectory());
  console.log('Found languages:', langs.join(', '));

  // Prepare per-language JSON objects
  const translationsByLang = {};
  for (const lang of langs) {
    const file = path.join(localesDir, lang, 'translation.json');
    if (fs.existsSync(file)) {
      try { translationsByLang[lang] = readJSON(file); } catch (e) { translationsByLang[lang] = {}; }
    } else {
      translationsByLang[lang] = {};
    }
  }

  const report = [];
  // translate sequentially (throttle)
  for (let i = 0; i < map.length; i++) {
    const item = map[i];
    const key = item.key; // e.g. autogen.back_to_explore
    const parts = key.split('.');
    const enText = item.text;
    const row = { key, text: enText, locations: item.locations || [], translations: {} };

    for (const lang of langs) {
      if (lang === 'en') {
        setNested(translationsByLang[lang], parts, enText);
        row.translations[lang] = enText;
        continue;
      }
      const existing = getNested(translationsByLang[lang], parts);
      if (existing && typeof existing === 'string' && existing.trim() !== '' && existing !== enText) {
        // keep existing human translation
        row.translations[lang] = existing;
        continue;
      }
      // translate
      const tr = await translate(enText, lang);
      setNested(translationsByLang[lang], parts, tr);
      row.translations[lang] = tr;
      // small throttle to be gentle on public endpoints
      await sleep(180);
    }
    report.push(row);
    if ((i + 1) % 20 === 0) console.log(`Processed ${i + 1}/${map.length} keys...`);
  }

  // write back translation.json files
  for (const lang of langs) {
    const outFile = path.join(localesDir, lang, 'translation.json');
    ensureDir(path.dirname(outFile));
    writeJSON(outFile, translationsByLang[lang]);
    console.log('Wrote', outFile);
  }

  // write report JSON + CSV
  const reportJsonPath = path.join(wfRoot, 'i18n-autogen-translated-report.json');
  writeJSON(reportJsonPath, report);
  console.log('Wrote report JSON:', reportJsonPath);

  // CSV
  const csvPath = path.join(wfRoot, 'i18n-autogen-translated-report.csv');
  const headers = ['key','text','locations', ...langs];
  const rows = [headers.join(',')];
  for (const r of report) {
    const cols = [
      `"${r.key.replace(/"/g, '""')}"`,
      `"${(r.text||'').replace(/"/g,'""')}"`,
      `"${(r.locations||[]).join(' | ').replace(/"/g,'""')}"`
    ];
    for (const lang of langs) cols.push(`"${(r.translations[lang]||'').replace(/"/g,'""')}"`);
    rows.push(cols.join(','));
  }
  fs.writeFileSync(csvPath, rows.join('\n'), 'utf8');
  console.log('Wrote CSV report:', csvPath);

  console.log('Done. Translated', map.length, 'keys for', langs.length, 'languages.');
}

main().catch(err => { console.error(err); process.exitCode = 1; });
