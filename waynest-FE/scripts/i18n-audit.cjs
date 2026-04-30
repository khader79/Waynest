#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "public", "locales");
const EN_FILE = path.join(LOCALES_DIR, "en", "translation.json");

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

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error("Failed to read", filePath, err.message);
    process.exitCode = 1;
    return null;
  }
}

const en = readJSON(EN_FILE);
if (!en) process.exit(1);
const enFlat = flatten(en);
const enKeys = Object.keys(enFlat).sort();

const langs = fs
  .readdirSync(LOCALES_DIR)
  .filter((d) => fs.statSync(path.join(LOCALES_DIR, d)).isDirectory());

const report = {};
for (const lang of langs) {
  const file = path.join(LOCALES_DIR, lang, "translation.json");
  const obj = readJSON(file);
  if (!obj) continue;
  const flat = flatten(obj);
  const keys = Object.keys(flat);
  const missing = enKeys.filter((k) => !(k in flat));
  const extra = keys.filter((k) => !(k in enFlat));
  report[lang] = {
    total_en: enKeys.length,
    translated: enKeys.length - missing.length,
    missingCount: missing.length,
    missingKeys: missing.slice(0, 20),
    extraCount: extra.length,
    coverage:
      Math.round(((enKeys.length - missing.length) / enKeys.length) * 10000) /
      100,
  };
}

console.log("i18n Audit Report");
console.log("==================");
for (const [lang, r] of Object.entries(report)) {
  console.log(`\nLanguage: ${lang}`);
  console.log(`  Coverage: ${r.coverage}% (${r.translated}/${r.total_en})`);
  console.log(`  Missing: ${r.missingCount} keys`);
  if (r.missingCount > 0)
    console.log(`    Example missing keys: ${r.missingKeys.join(", ")}`);
  console.log(`  Extra keys: ${r.extraCount}`);
}

const out = path.join(__dirname, "..", "i18n-audit-report.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
console.log("\nSaved report to", out);
