const fs = require('fs');
let code = fs.readFileSync('qa_part1_auth_admin.js', 'utf8');

const oldChunk = `  // AL-23: After lock, enter correct PIN at ~299 s
  const lock299Res = await page.evaluate(() => {
    // Simulate remaining 299 seconds
    window.APP.pinLockoutUntil = Date.now() + 299000;
    return attemptAdminLogin('admin@parshwaplatinum.com', '5829');
  });
  recordResult('AL-23', lock299Res.screen === 'login' ? 'PASS' : 'FAIL',
    \`Correct PIN rejected during lock period (~299s remaining); screen remains login\`,
    'Lock timer validation');

  // AL-24: After lock, enter correct PIN at ~301 s (lock expired)
  const lock301Res = await page.evaluate(() => {
    // Simulate lock expiration (time passed 301s)
    window.APP.pinLockoutUntil = Date.now() - 1000;
    return attemptAdminLogin('admin@parshwaplatinum.com', '5829');
  });`;

const newChunk = `  // AL-23: After lock, enter correct PIN at ~299 s
  await page.evaluate(() => {
    window.APP.pinLockoutUntil = Date.now() + 299000;
  });
  const lock299Res = await attemptAdminLogin('admin@parshwaplatinum.com', '5829');
  recordResult('AL-23', lock299Res.screen === 'login' ? 'PASS' : 'FAIL',
    \`Correct PIN rejected during lock period (~299s remaining); screen remains login\`,
    'Lock timer validation');

  // AL-24: After lock, enter correct PIN at ~301 s (lock expired)
  await page.evaluate(() => {
    window.APP.pinLockoutUntil = Date.now() - 1000;
  });
  const lock301Res = await attemptAdminLogin('admin@parshwaplatinum.com', '5829');`;

code = code.replace(oldChunk, newChunk);
fs.writeFileSync('qa_part1_auth_admin.js', code, 'utf8');
console.log('Fixed evaluate block in qa_part1_auth_admin.js!');
