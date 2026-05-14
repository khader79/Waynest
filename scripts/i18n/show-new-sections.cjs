const fs = require('fs');
const en = JSON.parse(fs.readFileSync('waynest-FE/public/locales/en/translation.json', 'utf-8'));
const sections = ['calendar', 'billing', 'publicTrip', 'verification', 'invite', 'routeLoading', 'statusPage', 'errorBoundary', 'notifications', 'sharing', 'footer'];
for (const s of sections) {
  if (en[s]) {
    console.log('=== ' + s + ' ===');
    function print(obj, indent) {
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          console.log(indent + k + ':');
          print(v, indent + '  ');
        } else {
          const val = typeof v === 'string' ? '"' + v.substring(0, 100) + (v.length > 100 ? '...' : '') + '"' : v;
          console.log(indent + k + ': ' + val);
        }
      }
    }
    print(en[s], '');
    console.log();
  }
}
