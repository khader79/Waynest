const fs = require('fs');
const path = require('path');
const LOCALE_DIR = 'waynest-FE/public/locales';
const LANGUAGES = ['ar','fr','ru','tr','es','de','zh','pt','he','hi','it','ja','ko','ur'];
const EN = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, 'en', 'translation.json'), 'utf-8'));
function flatten(obj, p) { const r = {}; for (const [k, v] of Object.entries(obj)) { const key = p ? p + '.' + k : k; if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(r, flatten(v, key)); else r[key] = String(v); } return r; }
const enFlat = flatten(EN);
const brands = ['Visa','Mastercard','PayPal','Stripe','Google','Facebook','Twitter','Instagram','WhatsApp','YouTube','Spotify','Airbnb','Uber','iOS','Android','iPhone','iPad','LinkedIn','Google Calendar','Apple Calendar','Outlook'];
const units = ['km','mi','m','ft','kg','lb','L','gal','km/h','mph'];
const months = ['January','February','March','April','May','June','July','August','September','October','November','December','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const identical = new Set(['Hotel','Restaurant','Museum','Park','Cafe','Cafe','Social','Type','Total','Status','Name','Code','Slug','Info','Email','Blog','Support','Cookies','Contact','Destinations','Europe','Asia','Africa','Oceania','Capital','Region','Population','Latitude','Longitude','Alpha 2','Alpha 3','Dashboard','Wishlist','Feed','Feedback','Photos','Public','Private','Followers','Following','Follow','Accept','Decline','Wishlist','Events','Budget','Destination','Shopping','Nature','Attraction','Monument','Actions','Description','Venue','Guests','Pending','Devices','Account Center','Numeric Code','Fraction Size','End Date','Available Tickets','Currency Code','Provider Type','Month','Day','Search','Language','Settings','About','Menu','Home','Profile','Gallery','Map','Book','Review','Price','Date','Time','Euro','Person','People','Adult','Child','Option','Filter','Load','Error','Success','Warning','Message','Image','Video','Link','Share','Save','Edit','Delete','Cancel','View','List','Grid','Close','Open','Back','Next','Previous','First','Last','Top','Bottom','Left','Right','Center','Middle','Front','Up','Down','In','Out','On','Off','Yes','No','Maybe','All','None','Some','Every','Any','Other','Same','New','Old','Big','Small','Hot','Cold','Warm','Cool','Good','Bad','Best','High','Low','Fast','Slow','Hard','Soft','Easy','Dark','Light','Simple','Clear','Hide','Show','Enable','Disable','Allow','Block','Include','Exclude','Import','Export','Upload','Download','Update','Capital:','Region:','Tags','Optional','Hotels','Restaurants','Tours','Twitter','Facebook','Instagram','LinkedIn','WhatsApp','support@waynest.com','Slug (optional)','Website','AI route engine','Sample output','Day 1','Countries','Waynest platform stats','Remix','Cultural','Men','*']);
function isIgnored(v) {
  if (/^\{\{.*\}\}$/.test(v) || /^[\d:%\s\/\-.*"'<>()@#$&!?]+$/.test(v) || /^[A-Z][A-Z]+$/.test(v) || v === '' || v === '*' || (v.includes('{{') && v.includes('}}'))) return true;
  if (brands.includes(v) || units.includes(v) || months.includes(v) || identical.has(v)) return true;
  return false;
}

// Group untranslated keys by section
for (const lang of LANGUAGES.slice(0, 2)) { // just ar and fr for analysis
  const data = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, lang, 'translation.json'), 'utf-8'));
  const flat = flatten(data);
  const sections = {};
  for (const [k, ev] of Object.entries(enFlat)) {
    const v = flat[k];
    if (v === ev && !isIgnored(ev)) {
      const section = k.split('.')[0];
      if (!sections[section]) sections[section] = [];
      sections[section].push(k);
    }
  }
  console.log('=== ' + lang + ': untranslated by section ===');
  const sorted = Object.entries(sections).sort((a, b) => b[1].length - a[1].length);
  for (const [section, keys] of sorted) {
    console.log('  ' + section + ': ' + keys.length + ' untranslated');
    if (keys.length <= 5) {
      for (const k of keys) console.log('    ' + k + ' = "' + flat[k] + '"');
    }
  }
  console.log();
}
