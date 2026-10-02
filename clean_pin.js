const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

html = html.replace(
  "const expected = APP.currentUser ? (APP.currentUser.pin || '5829') : '5829';",
  "const expectedHash = APP.currentUser ? (APP.currentUser.pinHash || ADMIN_PIN_HASH) : ADMIN_PIN_HASH;"
);
html = html.replace(
  "if (APP.pinInput === expected)",
  "if (sha256Sync(APP.pinInput) === expectedHash)"
);
html = html.replace(/pin: rawPin \|\| '5829'/g, "pin: rawPin, pinHash: sha256Sync(rawPin)");
html = html.replace(/pin: req\.pin \|\| '5829'/g, "pin: req.pin, pinHash: (req.pinHash || sha256Sync(req.pin || 'Pass@123'))");

fs.writeFileSync('web_preview/index.html', html, 'utf8');

const occurrences = (html.match(/5829/g) || []).length;
console.log('Remaining 5829 count:', occurrences);
