const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

function isLikelyUIString(s) {
  if (!s) return false;
  const trimmed = s.trim();
  if (!trimmed) return false;
  if (trimmed.length < 2) return false; // too short
  if (/^\d+$/.test(trimmed)) return false; // just numbers
  if (trimmed.includes("\n")) return false;
  if (trimmed.includes("{") || trimmed.includes("}")) return false;
  if (/^\s*$/.test(trimmed)) return false;
  // skip common icons or single words like OK (maybe still translate?) keep words longer than 1 char
  return true;
}

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (/\.(jsx|js|tsx|ts|mjs|cjs)$/.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

async function extract() {
  const files = await walk(SRC);
  const found = new Map();

  const attrPattern =
    /(aria-label|placeholder|alt|title|subTitle|label)=\s*["'`]([^"'`<>]+?)["'`]/gi;
  const textPattern = />\s*([^<{][^<\n]+?)\s*</g;

  for (const file of files) {
    let content;
    try {
      content = await fs.promises.readFile(file, "utf8");
    } catch (e) {
      continue;
    }

    let m;
    while ((m = attrPattern.exec(content)) !== null) {
      const val = m[2].trim();
      if (!isLikelyUIString(val)) continue;
      const key = val;
      if (!found.has(key)) found.set(key, new Set());
      found
        .get(key)
        .add(
          `${path.relative(process.cwd(), file)}:${getLineForIndex(content, m.index)}`,
        );
    }

    while ((m = textPattern.exec(content)) !== null) {
      const val = m[1].trim();
      // skip if contains JSX expression markers
      if (!isLikelyUIString(val)) continue;
      // skip if line contains t(" or useTranslation or {t(
      const before = content.slice(Math.max(0, m.index - 200), m.index + 200);
      if (/t\(/.test(before) || /{\s*t\(/.test(before)) continue;
      const key = val;
      if (!found.has(key)) found.set(key, new Set());
      found
        .get(key)
        .add(
          `${path.relative(process.cwd(), file)}:${getLineForIndex(content, m.index)}`,
        );
    }
  }

  const out = [];
  for (const [text, locations] of found.entries()) {
    out.push({ text, locations: Array.from(locations) });
  }

  out.sort((a, b) => a.text.localeCompare(b.text));

  const reportPath = path.join(
    __dirname,
    "..",
    "i18n-untranslated-report.json",
  );
  await fs.promises.writeFile(reportPath, JSON.stringify(out, null, 2));
    `Found ${out.length} candidate untranslated strings. Report: ${reportPath}`,
  );
}

function getLineForIndex(content, index) {
  return content.slice(0, index).split("\n").length;
}

extract().catch((err) => {
  console.error(err);
  process.exit(1);
});
