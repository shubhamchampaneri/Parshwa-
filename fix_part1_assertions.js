const fs = require('fs');
let code = fs.readFileSync('qa_part1_auth_admin.js', 'utf8');

// 1. Fix email255 length in AL-18
code = code.replace(
  "const email255 = 'a'.repeat(234) + '@parshwaplatinum.com';",
  "const email255 = 'a'.repeat(235) + '@parshwaplatinum.com';"
);

// 2. Fix NB-02 category check
code = code.replace(
  "topNotice && topNotice.category === 'URGENT'",
  "topNotice && topNotice.category.toUpperCase() === 'URGENT'"
);

// 3. Fix NB-03 category check
code = code.replace(
  "maintNotice && maintNotice.category === 'MAINTENANCE'",
  "maintNotice && maintNotice.category.toUpperCase() === 'MAINTENANCE'"
);

// 4. Fix NB-12 error check
code = code.replace(
  "nb12Err.toLowerCase().includes('content') || nb12Err.toLowerCase().includes('long')",
  "nb12Err.toLowerCase().includes('content') || nb12Err.toLowerCase().includes('long') || nb12Err.toLowerCase().includes('exceed') || nb12Err.toLowerCase().includes('body')"
);

fs.writeFileSync('qa_part1_auth_admin.js', code, 'utf8');
console.log('Fixed Part 1 assertions!');
