// Comprehensive translation script for remaining 5 languages
// Uses Google Translate API (free, no key needed)
const fs = require('fs');
const path = require('path');
const https = require('https');

const LOCALE_DIR = path.resolve('C:/Users/khade/Documents/Me/Coding/Waynest/waynest-FE/public/locales');
const EN_PATH = path.join(LOCALE_DIR, 'en', 'translation.json');

// ─── Load English reference ───
const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));

// ─── Helpers ───
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

const brands = ['Visa','Mastercard','PayPal','Stripe','Google','Facebook','Twitter','Instagram','WhatsApp','YouTube','Spotify','Airbnb','Uber','iOS','Android','iPhone','iPad','LinkedIn','Google Calendar','Apple Calendar','Outlook'];
const units = ['km','mi','m','ft','kg','lb','L','gal','km/h','mph'];
const months = ['January','February','March','April','May','June','July','August','September','October','November','December','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const identical = new Set(['Hotel','Restaurant','Museum','Park','Cafe','Café','Social','Social Feed','Type','Total','Status','Name','Code','Slug','Info','Email','Blog','Support','Cookies','Contact','Destinations','Europe','Asia','Africa','Oceania','Capital','Region','Population','Latitude','Longitude','Alpha 2','Alpha 3','Dashboard','Wishlist','Feed','Feedback','Photos','Public','Private','Followers','Following','Follow','Accept','Decline','Events','Budget','Destination','Shopping','Nature','Attraction','Monument','Actions','Description','Venue','Guests','Pending','Devices','Account Center','Numeric Code','Fraction Size','End Date','Available Tickets','Currency Code','Provider Type','Month','Day','Search','Language','Settings','About','Menu','Home','Profile','Gallery','Map','Book','Review','Price','Date','Time','Euro','Person','People','Adult','Child','Option','Filter','Load','Error','Success','Warning','Message','Image','Video','Link','Share','Save','Edit','Delete','Cancel','View','List','Grid','Close','Open','Back','Next','Previous','First','Last','Top','Bottom','Left','Right','Center','Middle','Front','Up','Down','In','Out','On','Off','Yes','No','Maybe','All','None','Some','Every','Any','Other','Same','New','Old','Big','Small','Hot','Cold','Warm','Cool','Good','Bad','Best','High','Low','Fast','Slow','Hard','Soft','Easy','Dark','Light','Simple','Clear','Hide','Show','Enable','Disable','Allow','Block','Include','Exclude','Import','Export','Upload','Download','Update','Capital:','Region:','Tags','Optional','Hotels','Restaurants','Tours','support@waynest.com','Slug (optional)','Website','AI route engine','Sample output','Day 1','Countries','Waynest platform stats','Remix','Cultural','Men','*','Women','Plan','Hindi','Urdu','Messages','Photo','Source','Notes','Password','Partnership','File','Account','Privacy','per','Gateway timeout']);

function isIgnored(v) {
  if (/^\{\{.*\}\}$/.test(v) || /^[\d:%\s\/\-.*"'<>()@#$&!?]+$/.test(v) || /^[A-Z][A-Z]+$/.test(v) || v === '' || v === '*' || (v.includes('{{') && v.includes('}}'))) return true;
  if (brands.includes(v) || units.includes(v) || months.includes(v) || identical.has(v)) return true;
  return false;
}

// ─── Google Translate via https ───
function translateText(text, targetLang) {
  return new Promise((resolve, reject) => {
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
        } catch (e) {
          console.error('  Parse error:', e.message, 'for text:', text.substring(0, 50));
          resolve(text); // fallback to original
        }
      });
    }).on('error', (e) => {
      console.error('  HTTP error:', e.message);
      resolve(text); // fallback
    });
  });
}

// ─── Replace template vars with placeholders ───
function protectTemplates(text) {
  const placeholders = [];
  const result = text.replace(/\{\{(\w+)\}\}/g, (match, name) => {
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

// ─── Main ───
const enFlat = flatten(en);

const LANGUAGES = [
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ur', name: 'Urdu' },
];

async function main() {
  for (const lang of LANGUAGES) {
    console.log(`\n══════ Processing ${lang.name} (${lang.code}) ══════`);

    const langPath = path.join(LOCALE_DIR, lang.code, 'translation.json');
    const langData = JSON.parse(fs.readFileSync(langPath, 'utf-8'));
    const langFlat = flatten(langData);

    // Find untranslated keys
    const toTranslate = [];
    for (const [k, v] of Object.entries(enFlat)) {
      if (langFlat[k] === v && !isIgnored(v)) {
        toTranslate.push({ key: k, value: v });
      }
    }

    if (toTranslate.length === 0) {
      console.log('  ✓ All translated, nothing to do.');
      continue;
    }

    console.log(`  Found ${toTranslate.length} untranslated keys. Translating...`);

    // Translate in batches to avoid overwhelming the API
    const BATCH_SIZE = 20;
    const BATCH_DELAY = 800; // ms between batches

    let translated = 0;
    let errors = 0;

    for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
      const batch = toTranslate.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(toTranslate.length / BATCH_SIZE);

      process.stdout.write(`  Batch ${batchNum}/${totalBatches}...`);

      const promises = batch.map(async (item) => {
        const { text: protectedText, placeholders } = protectTemplates(item.value);
        const translated = await translateText(protectedText, lang.code);
        const restored = restoreTemplates(translated, placeholders);
        return { key: item.key, value: restored };
      });

      const results = await Promise.all(promises);

      // Apply translations to flattened object
      for (const result of results) {
        if (result.value && result.value !== result.key) {
          langFlat[result.key] = result.value;
        }
      }

      translated += results.length;
      console.log(` ${results.length} done (total: ${translated}/${toTranslate.length})`);

      // Delay between batches
      if (i + BATCH_SIZE < toTranslate.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
    }

    // Unflatten and write back
    const updated = unflatten(langFlat);
    fs.writeFileSync(langPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
    console.log(`  ✓ Saved ${langPath}`);
    console.log(`  Translated ${translated} keys for ${lang.code}`);
  }

  console.log('\n══════ All done! ══════');
}

main().catch(e => console.error('Fatal:', e));
