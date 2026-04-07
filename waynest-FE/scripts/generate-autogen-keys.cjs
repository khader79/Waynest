const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const reportPath = path.join(projectRoot, 'i18n-untranslated-report.json');
const localesDir = path.join(projectRoot, 'public', 'locales');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}0-9]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function isCodeLike(s) {
  if (!s) return true;
  // heuristics: contains code operators or unbalanced punctuation
  if (/\&\&|\|\||=>|\?\?|\(|\)\s*:\s*\(|^\d+\s*&&|<[^>]+>|\{\s*\}/.test(s)) return true;
  // if it contains many punctuation and no letters
  const letters = (s.match(/\p{L}/gu) || []).length;
  const others = s.length - letters;
  if (letters === 0 && others > 0) return true;
  // skip very short tokens
  if (s.trim().length <= 1) return true;
  return false;
}

async function main() {
  const raw = fs.readFileSync(reportPath, 'utf8');
  const items = JSON.parse(raw);

  const candidates = items.filter(it => !isCodeLike(it.text));

  const map = [];
  const usedKeys = new Set();

  for (const it of candidates) {
    let base = slugify(it.text);
    if (!base) {
      base = 'text';
    }
    let key = base;
    let idx = 1;
    while (usedKeys.has(key)) {
      key = `${base}_${idx++}`;
    }
    usedKeys.add(key);
    map.push({ key: `autogen.${key}`, text: it.text, locations: it.locations });
  }

  // save map
  const mapPath = path.join(projectRoot, 'i18n-autogen-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
  console.log(`Wrote autogen map: ${mapPath} (${map.length} entries)\n`);

  // update each locale translation.json by adding autogen keys if missing (copy english text)
  const langs = await fs.promises.readdir(localesDir, { withFileTypes: true });
  for (const dirent of langs) {
    if (!dirent.isDirectory()) continue;
    const lang = dirent.name;
    const filePath = path.join(localesDir, lang, 'translation.json');
    let data = {};
    try {
      data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
    } catch (e) {
      console.warn(`Failed to read ${filePath}, creating new object.`);
      data = {};
    }

    if (!data.autogen) data.autogen = {};
    let added = 0;
    for (const entry of map) {
      const keyPath = entry.key.split('.').slice(1); // remove autogen prefix
      let node = data.autogen;
      for (let i = 0; i < keyPath.length - 1; i++) {
        const part = keyPath[i];
        if (!node[part] || typeof node[part] !== 'object') node[part] = {};
        node = node[part];
      }
      const last = keyPath[keyPath.length - 1];
      if (node[last] === undefined) {
        // if English, keep original; for others, copy English as placeholder
        node[last] = entry.text;
        added++;
      }
    }

    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`Updated ${filePath} — added ${added} autogen keys.`);
  }

  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
