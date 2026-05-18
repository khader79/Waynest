import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');

function findFiles(dir, exts) {
  let results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(findFiles(full, exts));
    } else if (exts.includes(path.extname(full))) {
      results.push(full);
    }
  }
  return results;
}

const files = findFiles(SRC_DIR, ['.jsx', '.tsx']);

console.log(`Scanning ${files.length} JSX/TSX files for hardcoded strings...\n`);

const issues = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative(SRC_DIR, file);
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    
    // Skip imports, comments, exports
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import ') || trimmed.startsWith('export ') || trimmed.startsWith('/*')) return;
    
    // Check for JSX text content between tags
    const jsxTextMatch = line.match(/>([^<>{}]+)</);
    if (jsxTextMatch) {
      const text = jsxTextMatch[1].trim();
      if (/[a-zA-Z]{3,}.*[a-zA-Z]{3,}/.test(text) && !line.includes('t(')) {
        issues.push({
          file: relativePath,
          line: lineNum,
          type: 'Hardcoded JSX text',
          content: text.substring(0, 80),
          suggestion: `Wrap in t() with defaultValue: t('key', '${text.replace(/'/g, "\\'")}')`
        });
      }
    }
    
    // Check for hardcoded strings in props
    const propPatterns = [
      /title=["']([^"']{4,})["']/g,
      /placeholder=["']([^"']{4,})["']/g,
      /label=["']([^"']{4,})["']/g,
      /aria-label=["']([^"']{4,})["']/g,
    ];
    
    for (const pattern of propPatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const text = match[1];
        if (!line.substring(0, match.index).includes('t(')) {
          issues.push({
            file: relativePath,
            line: lineNum,
            type: 'Hardcoded prop string',
            content: text.substring(0, 80),
            suggestion: `Use t() function: t('key', '${text.replace(/'/g, "\\'")}')`
          });
        }
      }
    }
  });
}

const byFile = {};
issues.forEach(issue => {
  if (!byFile[issue.file]) byFile[issue.file] = [];
  byFile[issue.file].push(issue);
});

console.log(`=== HARDCODED STRING AUDIT ===\n`);
console.log(`Total issues found: ${issues.length}\n`);

for (const [file, fileIssues] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
  if (fileIssues.length > 2) {
    console.log(`\n--- ${file} (${fileIssues.length} issues) ---`);
    fileIssues.slice(0, 10).forEach(issue => {
      console.log(`  L${issue.line}: [${issue.type}] "${issue.content}"`);
      console.log(`    → ${issue.suggestion}`);
    });
    if (fileIssues.length > 10) {
      console.log(`  ... and ${fileIssues.length - 10} more`);
    }
  }
}

console.log('\n=== END OF HARDCODED STRING AUDIT ===');
