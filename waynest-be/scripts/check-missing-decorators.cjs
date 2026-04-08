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

function getImportedNames(sf) {
  // Map name -> { module: string, typeOnly: boolean }
  const imports = new Map();
  ts.forEachChild(sf, (node) => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      const moduleName = node.moduleSpecifier.getText().slice(1, -1);
      const { importClause } = node;
      // node.isTypeOnly indicates `import type` at the declaration level
      const typeOnlyDecl = !!node.isTypeOnly || !!importClause.isTypeOnly;
      if (importClause.name) {
        // default import
        imports.set(importClause.name.getText(), {
          module: moduleName,
          typeOnly: typeOnlyDecl,
        });
      }
      if (importClause.namedBindings) {
        if (ts.isNamedImports(importClause.namedBindings)) {
          for (const el of importClause.namedBindings.elements) {
            const name = (el.propertyName || el.name).getText();
            imports.set(name, { module: moduleName, typeOnly: typeOnlyDecl });
          }
        } else if (ts.isNamespaceImport(importClause.namedBindings)) {
          const ns = importClause.namedBindings.name.getText();
          imports.set(ns + '.*', {
            module: moduleName,
            typeOnly: typeOnlyDecl,
          });
        }
      }
    }
  });
  return imports;
}

function collectDecorators(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const imports = getImportedNames(sf);
  const missing = [];

  function checkDecorators(node) {
    if (
      (ts.isClassDeclaration(node) || ts.isClassExpression(node)) &&
      node.members
    ) {
      for (const member of node.members) {
        if (member.decorators && member.decorators.length) {
          for (const dec of member.decorators) {
            let name = null;
            if (ts.isCallExpression(dec.expression)) {
              const expr = dec.expression.expression;
              if (ts.isIdentifier(expr)) name = expr.getText();
              else if (ts.isPropertyAccessExpression(expr))
                name = expr.name.getText();
            } else if (ts.isIdentifier(dec.expression)) {
              name = dec.expression.getText();
            } else if (ts.isPropertyAccessExpression(dec.expression)) {
              name = dec.expression.name.getText();
            }

            if (name) {
              // check if import exists and whether it's type-only
              const binding = imports.get(name);
              const hasDirect = !!binding;
              const hasNs = Array.from(imports.keys()).some(
                (k) => k.endsWith('.*') && name.startsWith(k.replace('.*', '')),
              );
              if (!hasDirect && !hasNs) {
                missing.push({
                  name,
                  reason: 'not_imported',
                  pos: member.pos,
                  text: member.getText().slice(0, 200),
                });
              } else if (binding && binding.typeOnly) {
                missing.push({
                  name,
                  reason: 'imported_as_type_only',
                  module: binding.module,
                  pos: member.pos,
                  text: member.getText().slice(0, 200),
                });
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, checkDecorators);
  }

  checkDecorators(sf);
  return missing;
}

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.error('src not found:', srcRoot);
    process.exit(1);
  }
  const files = walk(srcRoot);
  const report = [];
  for (const f of files) {
    const missing = collectDecorators(f);
    if (missing.length)
      report.push({ file: path.relative(projectRoot, f), missing });
  }

  if (!report.length) {
    console.log('No missing decorator imports detected.');
    process.exit(0);
  }

  console.log(JSON.stringify(report, null, 2));
}

main();
