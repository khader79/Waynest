const fs = require('fs');
const path = require('path');
const LOCALE_DIR = 'waynest-FE/public/locales';
const LANGUAGES = ['ar','fr','ru','tr','es','de','zh','pt','he','hi','it','ja','ko','ur'];
const en = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, 'en', 'translation.json'), 'utf-8'));
const enFlat = {};
function flatten(obj, p) {
  for (const [k, v] of Object.entries(obj)) {
    const key = p ? p + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key);
    else enFlat[key] = String(v);
  }
}
flatten(en);
const brands = ['Visa','Mastercard','PayPal','Stripe','Google','Facebook','Twitter','Instagram','WhatsApp','YouTube','Spotify','Airbnb','Uber','iOS','Android','iPhone','iPad','LinkedIn','Google Calendar','Apple Calendar','Outlook'];
const units = ['km','mi','m','ft','kg','lb','L','gal','km/h','mph'];
const months = ['January','February','March','April','May','June','July','August','September','October','November','December','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const identicalWords = ['Hotel','Restaurant','Museum','Park','Café','Cafe','Social','Social Feed','Type','Total','Status','Name','Code','Slug','Info','Email','Blog','Support','Cookies','Contact','Destinations','Europe','Asia','Africa','Oceania','Capital','Region','Population','Latitude','Longitude','Alpha 2','Alpha 3','Dashboard','Wishlist','Feed','Feedback','Photos','Public','Private','Followers','Following','Follow','Accept','Decline','Wishlist','Events','Budget','Destination','Shopping','Nature','Attraction','Monument','Actions','Description','Venue','Guests','Pending','Devices','Account Center','Numeric Code','Fraction Size','End Date','Available Tickets','Currency Code','Month','Day','Search','Language','Settings','About','Menu','Home','Profile','Gallery','Map','Book','Review','Price','Date','Time','Euro','Person','People','Adult','Child','Option','Filter','Load','Error','Success','Warning','Message','Image','Video','Link','Share','Save','Edit','Delete','Cancel','View','List','Grid','Close','Open','Back','Next','Previous','First','Last','Top','Bottom','Left','Right','Center','Middle','Front','Up','Down','In','Out','On','Off','Yes','No','Maybe','All','None','Some','Every','Any','Other','Same','New','Old','Big','Small','Hot','Cold','Warm','Cool','Good','Bad','Best','High','Low','Fast','Slow','Hard','Soft','Easy','Dark','Light','Simple','Clear','Hide','Show','Enable','Disable','Allow','Block','Include','Exclude','Import','Export','Upload','Download','Update','Capital:','Region:','Tags','Optional','Hotels','Restaurants','Tours','Twitter','Facebook','Instagram','LinkedIn','WhatsApp','support@waynest.com','Slug (optional)','Website','AI route engine','Sample output','Day 1','Countries','Waynest platform stats','Remix','Cultural','Men','Provider Type','Plan','Hindi','Urdu'];
function isIgnored(v) {
  if (/^\{\{.*\}\}$/.test(v)) return true;
  if (/^[\d:%\s\/\-.*"''<>()@]+$/.test(v)) return true;
  if (/^[A-Z][A-Z]+$/.test(v)) return true;
  if (v === '' || v === '*') return true;
  if (v.includes('{{') && v.includes('}}')) return true;
  if (brands.includes(v)) return true;
  if (units.includes(v)) return true;
  if (months.includes(v)) return true;
  if (identicalWords.includes(v)) return true;
  return false;
}
for (const lang of LANGUAGES) {
  const data = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, lang, 'translation.json'), 'utf-8'));
  const flat = {};
  flatten(data);
  let untranslated = [];
  for (const [k, ev] of Object.entries(enFlat)) {
    if (!(k in flat)) { untranslated.push({ key: k, val: '<MISSING>' }); continue; }
    const v = flat[k];
    if (v === ev && !isIgnored(ev)) untranslated.push({ key: k, val: v });
  }
  const total = Object.keys(enFlat).length;
  console.log(lang + ': ' + untranslated.length + '/' + total + ' truly untranslated (' + (untranslated.length / total * 100).toFixed(1) + '%)');
  if (untranslated.length > 0 && untranslated.length <= 20) {
    for (const u of untranslated) console.log('  ' + u.key + ' = "' + u.val + '"');
  }
}
