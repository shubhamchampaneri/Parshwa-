const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

// 1. Add null checks in handleRegisterSubmit
html = html.replace(
  "function handleRegisterSubmit(e) {\n      e.preventDefault();\n      const rawName = document.getElementById('reg-name').value;",
  `function handleRegisterSubmit(e) {
      if (e && e.preventDefault) e.preventDefault();
      const nameEl = document.getElementById('reg-name');
      const phoneEl = document.getElementById('reg-phone');
      const pinEl = document.getElementById('reg-pin');
      if (!nameEl || !phoneEl || !pinEl) return;
      const rawName = nameEl.value;`
);

// 2. Add \\p{M} to unicodeLettersRegex
html = html.replace(
  "const unicodeLettersRegex = /^[\\p{L}\\s.'-]+$/u;",
  "const unicodeLettersRegex = /^[\\p{L}\\p{M}\\s.'-]+$/u;"
);

fs.writeFileSync('web_preview/index.html', html, 'utf8');
console.log('Updated index.html for RR-13 and null checks!');
