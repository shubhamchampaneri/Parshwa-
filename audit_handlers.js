const fs = require('fs');
const html = fs.readFileSync('web_preview/index.html', 'utf8');

// Find all onclick="foo(" and onsubmit="foo("
const regex = /(?:onclick|onsubmit)="([a-zA-Z0-9_]+)\s*\(/g;
let match;
const handlers = new Set();
while ((match = regex.exec(html)) !== null) {
  handlers.add(match[1]);
}

const missing = [];
for (const h of handlers) {
  const hasFn = html.includes('function ' + h) || html.includes('window.' + h) || html.includes(h + ' = function') || html.includes(h + ' = (');
  if (!hasFn) {
    missing.push(h);
  }
}

console.log('Total unique handlers:', handlers.size);
console.log('Handlers checked:', Array.from(handlers));
console.log('Missing/Undefined handlers:', missing);
