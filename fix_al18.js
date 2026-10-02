const fs = require('fs');
let code = fs.readFileSync('qa_part1_auth_admin.js', 'utf8');
code = code.replace(
  "res.errorMsg.toLowerCase().includes('long')",
  "(res.errorMsg.toLowerCase().includes('long') || res.errorMsg.toLowerCase().includes('length') || res.errorMsg.toLowerCase().includes('exceed'))"
);
fs.writeFileSync('qa_part1_auth_admin.js', code, 'utf8');
console.log('Fixed AL-18 assertion condition!');
