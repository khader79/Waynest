const fs = require("fs");
const path = require("path");

const localesDir = path.join(__dirname, "..", "public", "locales");

function isObject(val) {
  return val && typeof val === "object" && !Array.isArray(val);
}

function deepMergePreferBase(base, src) {
  // merge src into base but do not overwrite existing non-object values in base
  for (const key of Object.keys(src)) {
    if (isObject(src[key])) {
      if (!isObject(base[key])) {
        base[key] = {};
      }
      deepMergePreferBase(base[key], src[key]);
    } else {
      if (base[key] === undefined) {
        base[key] = src[key];
      }
    }
  }
}

async function mergeLocales() {
  try {
    const langs = await fs.promises.readdir(localesDir, {
      withFileTypes: true,
    });
    for (const dirent of langs) {
      if (!dirent.isDirectory()) continue;
      const lang = dirent.name;
      const langPath = path.join(localesDir, lang);
      const files = await fs.promises.readdir(langPath);

      // start with existing translation.json if present
      let base = {};
      const translationFile = path.join(langPath, "translation.json");
      if (files.includes("translation.json")) {
        try {
          const text = await fs.promises.readFile(translationFile, "utf8");
          base = JSON.parse(text);
        } catch (err) {
          console.error(`Failed to read ${translationFile}:`, err.message);
          base = {};
        }
      }

      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        if (file === "translation.json") continue; // already loaded
        const filePath = path.join(langPath, file);
        try {
          const txt = await fs.promises.readFile(filePath, "utf8");
          const obj = JSON.parse(txt);
          deepMergePreferBase(base, obj);
        } catch (err) {
          console.error(`Failed to process ${filePath}:`, err.message);
        }
      }

      // write back merged translation.json
      try {
        const out = JSON.stringify(base, null, 2);
        await fs.promises.writeFile(translationFile, out + "\n", "utf8");
      } catch (err) {
        console.error(`Failed to write ${translationFile}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Failed to read locales directory:", err.message);
    process.exit(1);
  }
}

mergeLocales();
