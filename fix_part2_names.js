const fs = require('fs');
let code = fs.readFileSync('qa_part2_reg_intercom.js', 'utf8');

// RR-29: change name from `Edge Flat ${f}` to `Edge Flat Resident`
code = code.replace(
  "const r = await attemptResidentRegister({ name: `Edge Flat ${f}`, phone: `987654323${i}`, flat: f, pass: 'Pass@123' });",
  "const r = await attemptResidentRegister({ name: 'Edge Flat Resident', phone: `987654323${i}`, flat: f, pass: 'Pass@123' });"
);

// RR-33: change name from 'Second Resident in 101' to 'Second Resident Patel'
code = code.replace(
  "regRes = await attemptResidentRegister({ name: 'Second Resident in 101', phone: '9876543240', flat: '101', pass: 'Pass@123' });",
  "regRes = await attemptResidentRegister({ name: 'Second Resident Patel', phone: '9876543240', flat: '101', pass: 'Pass@123' });"
);

fs.writeFileSync('qa_part2_reg_intercom.js', code, 'utf8');
console.log('Fixed names in qa_part2_reg_intercom.js!');
