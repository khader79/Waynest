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
    } else if (stat.isFile() && p.endsWith('.ts')) {
      res.push(p);
    }
  }
  return res;
}

function parseEntities(files) {
  const entities = [];
  const propRegex =
    /^\s*(?:public\s+|private\s+|protected\s+|readonly\s+|static\s+)*([A-Za-z0-9_]+)\??\s*:\s*([^=;{]+)(?:[=;].*)?$/;
  for (const file of files) {
    if (
      !file.includes(path.sep + 'entities' + path.sep) &&
      !file.endsWith('.entity.ts')
    )
      continue;
    const src = fs.readFileSync(file, 'utf8');
    if (!/@Entity\b/.test(src)) continue;

    const classMatch = src.match(
      /export\s+class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?/,
    );
    if (!classMatch) continue;
    const className = classMatch[1];
    const extendsText = classMatch[2] || null;

    const lines = src.split(/\r?\n/);
    let currentDecorators = [];
    const props = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith('@')) {
        // accumulate decorator lines until a closing ')'
        let deco = line;
        while (
          deco.indexOf('(') !== -1 &&
          deco.indexOf(')') === -1 &&
          i + 1 < lines.length
        ) {
          i++;
          deco += ' ' + lines[i].trim();
        }
        currentDecorators.push(deco);
        continue;
      }

      const m = line.match(propRegex);
      if (m) {
        const propName = m[1];
        const typeText = m[2].trim();

        let relationTarget = null;
        const decorators = currentDecorators.map((d) => {
          const dn = d.match(/^@([A-Za-z0-9_]+)/);
          const argsMatch = d.match(/\((([\s\S]*))\)/);
          const args = argsMatch ? [argsMatch[1].trim()] : [];
          const name = dn ? dn[1] : null;
          if (
            name &&
            ['ManyToOne', 'OneToMany', 'OneToOne', 'ManyToMany'].includes(
              name,
            ) &&
            args.length
          ) {
            const first = args[0];
            const m2 = first.match(/=>\s*([A-Za-z0-9_]+)/);
            if (m2) relationTarget = m2[1];
            else {
              const m3 = first.match(/([A-Za-z0-9_]+)/);
              if (m3) relationTarget = m3[1];
            }
          }
          return { raw: d, name, args };
        });

        props.push({
          name: propName,
          type: typeText,
          decorators,
          relationTarget,
        });
        currentDecorators = [];
      }
    }

    entities.push({
      file: path.relative(projectRoot, file),
      className,
      extends: extendsText,
      props,
    });
  }
  return entities;
}

function generateMermaid(entities) {
  const lines = ['classDiagram'];

  // classes
  for (const e of entities) {
    lines.push(`  class ${e.className} {`);
    for (const p of e.props) {
      // shorten type
      const t = p.type.replace(/\s+/g, ' ').replace(/\n/g, '');
      lines.push(`    + ${p.name} : ${t}`);
    }
    lines.push('  }');
  }

  // inheritance
  for (const e of entities) {
    if (e.extends) {
      lines.push(`  ${e.className} --|> ${e.extends}`);
    }
  }

  // relations
  for (const e of entities) {
    for (const p of e.props) {
      for (const d of p.decorators) {
        if (
          ['ManyToOne', 'OneToMany', 'OneToOne', 'ManyToMany'].includes(
            d.name,
          ) &&
          p.relationTarget
        ) {
          const src = e.className;
          const tgt = p.relationTarget;
          let rel = '';
          if (d.name === 'ManyToOne')
            rel = `  ${src} "*" --> "1" ${tgtOr(tgt)} : ${p.name}`;
          if (d.name === 'OneToMany')
            rel = `  ${src} "1" --> "*" ${tgtOr(tgt)} : ${p.name}`;
          if (d.name === 'OneToOne')
            rel = `  ${src} "1" --> "1" ${tgtOr(tgt)} : ${p.name}`;
          if (d.name === 'ManyToMany')
            rel = `  ${src} "*" --> "*" ${tgtOr(tgt)} : ${p.name}`;
          // safe push
          if (rel) lines.push(rel.replace(/\$\{tgt\}/g, tgt));
        }
      }
    }
  }

  // helper to ensure valid identifier
  function tgtOr(t) {
    return t || 'Unknown';
  }

  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.error('src not found:', srcRoot);
    process.exit(1);
  }

  const allFiles = walk(srcRoot);
  const entities = parseEntities(allFiles);

  const outJson = path.join(projectRoot, 'entity-list.json');
  fs.writeFileSync(outJson, JSON.stringify(entities, null, 2));

  const mermaid = generateMermaid(entities);
  const outMmd = path.join(projectRoot, 'entity-diagram.mmd');
  fs.writeFileSync(outMmd, mermaid);

  console.log(
    'Wrote',
    outJson,
    'and',
    outMmd,
    'with',
    entities.length,
    'entities.',
  );
}

main();
