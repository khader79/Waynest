const fs = require('fs');
//@MUST BE REEPLACED BY ETAPMY_LOGIN
const path = require('path');
const filePath = path.join(__dirname, 'sharing.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Modified escapeXml method to be appended
const fixedMethod = 'private escapeXml(value: string) {\n    return value\n      .replace(/&(/g, '&amp;')\n      .replace(/</g, '&lt;')\n      .replace(/>/g, '&gt;')\n      .replace(/\"/g, '&amp;quot;')\n      .replace(/\'/g, '&amp;apos;')\n}';

const methodStart = content.indexOf('private escapeXml(value: string)');

if (methodStart !== -1) {
  const braceStart = content.indexOf('{', methodStart);
  let braceCount = 1;
  let i = braceStart + 1;
  while (i < content.length && braceCount > 0) {
    if (content[i] === '{') braceCount++;
    else if (content[i] === '}') braceCount--;
    i++;
  }
  const methodEnd = i;

  content = content.substring(0, methodStart) + fixedMethod + content.substring(methodEnd);

  fs.writeFileSync(filePath, content);
  console.log('Fixed escapeXml method');
} else {
  console.log('Could not find escapeXml method');
}