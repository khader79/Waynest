const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.resolve(__dirname, '../../waynest-FE/public/locales');
const LANGUAGES = ['ar', 'fr', 'ru', 'tr', 'es', 'de', 'zh', 'pt'];
const EN_PATH = path.join(LOCALE_DIR, 'en', 'translation.json');
const enData = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
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
// Words that are identical in most European languages + common UI terms
const identicalWords = new Set([
  'Hotel', 'Restaurant', 'Museum', 'Park', 'Café', 'Cafe', 'Social',
  'Type', 'Total', 'Status', 'Name', 'Code', 'Slug', 'Info', 'Email',
  'Blog', 'Support', 'Cookies', 'Contact', 'Destinations', 'Europe',
  'Asia', 'Africa', 'Oceania', 'Capital', 'Region', 'Population',
  'Latitude', 'Longitude', 'Alpha 2', 'Alpha 3',
  'Dashboard', 'Wishlist', 'Feed', 'Feedback', 'Photos', 'Public',
  'Private', 'Followers', 'Following', 'Follow', 'Accept', 'Decline',
  'Account Center', 'Wishlist', 'Events', 'Budget', 'Destination',
  'Shopping', 'Nature', 'Attraction', 'Monument', 'Actions',
  'Description', 'Venue', 'Guests', 'Pending', 'Devices',
  'Provider Type', 'Numeric Code', 'Fraction Size', 'End Date',
  'Available Tickets', 'Currency Code', 'Month', 'Day', 'Search',
  'Language', 'Settings', 'About', 'Menu', 'Home', 'Profile',
  'Gallery', 'Map', 'Book', 'Review', 'Price', 'Date', 'Time',
  'Euro', 'Person', 'People', 'Adult', 'Child', 'Option', 'Filter',
  'Load', 'Error', 'Success', 'Warning', 'Message', 'Image',
  'Video', 'Link', 'Share', 'Save', 'Edit', 'Delete', 'Cancel',
  'View', 'List', 'Grid', 'Map', 'Close', 'Open', 'Back', 'Next',
  'Previous', 'First', 'Last', 'Top', 'Bottom', 'Left', 'Right',
  'Center', 'Middle', 'Front', 'Back', 'Up', 'Down', 'In', 'Out',
  'On', 'Off', 'Yes', 'No', 'Maybe', 'All', 'None', 'Some',
  'Every', 'Any', 'Other', 'Same', 'New', 'Old', 'Big', 'Small',
  'Hot', 'Cold', 'Warm', 'Cool', 'Good', 'Bad', 'Best', 'Top',
  'High', 'Low', 'Fast', 'Slow', 'Hard', 'Soft', 'Easy', 'Hard',
  'Dark', 'Light', 'Simple', 'Complex', 'Clear', 'Fade', 'Hide',
  'Show', 'Enable', 'Disable', 'Allow', 'Block', 'Include',
  'Exclude', 'Import', 'Export', 'Upload', 'Download', 'Update',
  'Google Calendar', 'Apple Calendar', 'Outlook',
  'AI route engine', 'Sample output', 'Day 1', 'Countries',
  'Waynest platform stats', 'Remix', 'Cultural',
  'Slug (optional)', 'Website',
  'Capital:', 'Region:', 'Tags', 'Optional', 'Hotels', 'Restaurants', 'Tours',
  'Twitter', 'Facebook', 'Instagram', 'LinkedIn', 'WhatsApp',
]);
// Month names and abbreviations (usually same across languages)
const monthNames = new Set([
  'January','February','March','April','May','June','July','August','September','October','November','December',
  'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec',
]);
// Unit abbreviations (international)
const unitAbbrs = new Set([
  'km', 'mi', 'm', 'ft', 'kg', 'lb', 'L', 'gal', 'km/h', 'mph',
]);
function isIgnored(k, v) {
  if (/^\{\{.*\}\}$/.test(v)) return true;
  if (/^[\d:%\s\/\-.*"''<>()@]+$/.test(v)) return true;
  if (/^[A-Z][A-Z]+$/.test(v)) return true;
  if (v === '' || v === '*') return true;
  if (v.includes('{{') && v.includes('}}')) return true;
  if (identicalWords.has(v)) return true;
  if (monthNames.has(v)) return true;
  if (unitAbbrs.has(v)) return true;
  if (v === 'support@waynest.com') return true;
  if (v === 'Men') return true; // navigation label
  return false;
}
for (const lang of LANGUAGES) {
  const fPath = path.join(LOCALE_DIR, lang, 'translation.json');
  const data = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
  const flat = flatten(data);
  const untranslated = [];
  for (const [k, ev] of Object.entries(flatEn)) {
    if (!(k in flat)) {
      untranslated.push({ key: k, value: '<MISSING>', reason: 'missing' });
    } else {
      const v = flat[k];
      if (v === ev && !isIgnored(k, ev)) {
        untranslated.push({ key: k, value: v, reason: 'untranslated English' });
      }
    }
  }
  console.log(`${lang}: ${untranslated.length} truly untranslated keys`);
  for (const u of untranslated) {
    console.log(`  ${u.key} = '${u.value}'`);
  }
  console.log();
}
