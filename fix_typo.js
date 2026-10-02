const fs = require('fs');
let code = fs.readFileSync('qa_part1_auth_admin.js', 'utf8');
code = code.replace(/,\s*'PASS'\s*:\s*'FAIL'/g, " ? 'PASS' : 'FAIL'");
fs.writeFileSync('qa_part1_auth_admin.js', code, 'utf8');
console.log('Fixed syntax typos!');
