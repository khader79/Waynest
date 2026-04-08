#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(projectRoot, 'src');

function walk(dir) {
  const res = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      res.push(...walk(p));
    } else if (stat.isFile()) {
      res.push(p);
    }
  }
  return res;
}

function isEntityFile(filePath) {
  return (
    filePath.endsWith('.entity.ts') ||
    filePath.includes(path.sep + 'entities' + path.sep)
  );
}

function findEntities(files) {
  const entities = [];
  for (const file of files) {
    if (!file.endsWith('.ts')) continue;
    const src = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
    ts.forEachChild(sf, (node) => {
      if (
        ts.isClassDeclaration(node) &&
        node.decorators &&
        node.decorators.length
      ) {
        const hasEntity = node.decorators.some((d) =>
          d.getText().includes('Entity'),
        );
        if (hasEntity) {
          const clsName = node.name ? node.name.getText() : '<anonymous>';
          const props = [];
          for (const member of node.members) {
            if (ts.isPropertyDeclaration(member) && member.name) {
              const propName = member.name.getText();
              const hasDecorator = !!(
                member.decorators && member.decorators.length
              );
              if (hasDecorator) {
                props.push({
                  name: propName,
                  start: member.getFullStart(),
                  end: member.getEnd(),
                  text: src.slice(member.getFullStart(), member.getEnd()),
                });
              }
            }
          }
          if (props.length) {
            entities.push({ file, className: clsName, props });
          }
        }
      }
    });
  }
  return entities;
}

function searchUsageAcrossFiles(propName, allFiles, originFile) {
  const re = new RegExp('\\b' + propName + '\\b');
  for (const f of allFiles) {
    if (f === originFile) continue;
    if (
      !f.endsWith('.ts') &&
      !f.endsWith('.js') &&
      !f.endsWith('.json') &&
      !f.endsWith('.mjs') &&
      !f.endsWith('.cjs')
    )
      continue;
    const content = fs.readFileSync(f, 'utf8');
    if (re.test(content)) return true;
  }
  return false;
}

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.error('src directory not found at', srcRoot);
    process.exit(1);
  }

  const allFiles = walk(srcRoot);
  const entityFiles = allFiles.filter(isEntityFile);
  const entities = findEntities(entityFiles);

  const report = [];
  for (const ent of entities) {
    const unused = [];
    for (const p of ent.props) {
      const used = searchUsageAcrossFiles(p.name, allFiles, ent.file);
      if (!used) unused.push({ name: p.name });
    }
    if (unused.length)
      report.push({
        file: path.relative(projectRoot, ent.file),
        className: ent.className,
        unused,
      });
  }

  const outPath = path.join(projectRoot, 'unused-entity-attrs-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('Report written to', outPath);
  console.log(
    'Found',
    report.reduce((s, e) => s + e.unused.length, 0),
    'unused entity properties across',
    report.length,
    'files.',
  );
}

main();
