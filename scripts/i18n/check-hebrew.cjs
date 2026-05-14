const fs = require('fs');
const en = JSON.parse(fs.readFileSync('waynest-FE/public/locales/en/translation.json','utf-8'));
const he = JSON.parse(fs.readFileSync('waynest-FE/public/locales/he/translation.json','utf-8'));
function flatten(obj, p) {
  const r = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = p ? p + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(r, flatten(v, key));
    } else {
      r[key] = String(v);
    }
  }
  return r;
}
const ef = flatten(en);
const hf = flatten(he);
let same = 0, diff = 0;
for (const k of Object.keys(ef)) {
  if (hf[k] === ef[k]) same++;
  else diff++;
}
console.log('en keys:', Object.keys(ef).length);
console.log('he keys:', Object.keys(hf).length);
console.log('Same as English:', same);
console.log('Different:', diff);
console.log('\nFirst 10 Hebrew values:');
const examples = Object.keys(ef).filter(k => hf[k] && hf[k] !== ef[k]).slice(0, 15);
for (const k of examples) {
  console.log('  ' + k + ': en="' + ef[k] + '"' + ' -> he="' + hf[k] + '"');
}
