#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "public", "locales");
const EN_FILE = path.join(LOCALES_DIR, "en", "translation.json");

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.error("read error", p, e.message);
    process.exit(1);
  }
}

function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function flatten(obj, prefix = "") {
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(res, flatten(v, key));
    } else {
      res[key] = v;
    }
  }
  return res;
}

function unflatten(flat) {
  const res = {};
  for (const k of Object.keys(flat)) {
    const parts = k.split(".");
    let cur = res;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i === parts.length - 1) cur[p] = flat[k];
      else cur[p] = cur[p] || {};
      cur = cur[p];
    }
  }
  return res;
}

const en = readJSON(EN_FILE);
const enFlat = flatten(en);
const enKeys = Object.keys(enFlat);

const langs = fs
  .readdirSync(LOCALES_DIR)
  .filter(
    (d) => fs.statSync(path.join(LOCALES_DIR, d)).isDirectory() && d !== "en",
  );

for (const lang of langs) {
  const file = path.join(LOCALES_DIR, lang, "translation.json");
  const bak = file + ".bak";
  if (!fs.existsSync(file)) continue;
  const obj = readJSON(file);
  const flat = flatten(obj);

  let changed = false;
  for (const k of enKeys) {
    if (!(k in flat)) {
      flat[k] = enFlat[k];
      changed = true;
    }
  }

  if (changed) {
    // backup
    try {
      if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
    } catch (e) {
      /* ignore */
    }
    const merged = unflatten(flat);
    writeJSON(file, merged);
    console.log(
      `Filled missing ${lang} keys: now ${Object.keys(flat).length} entries`,
    );
  } else {
    console.log(`No missing keys for ${lang}`);
  }
}

console.log("Done");
