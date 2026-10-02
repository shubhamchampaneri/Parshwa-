const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

// 1. In handleLoginSubmit: put length check before email regex
const oldCheck = `        // AL-17, AL-18: Email length bounds
        if (email.length > 254) {
          playChime('sos');
          showAlert('error', 'Email Too Long', 'Email format error: exceeds maximum length of 254 characters');
          return;
        }

        // AL-14, AL-15: Email format
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailRegex.test(email)) {
          playChime('sos');
          showAlert('error', 'Invalid Email Format', 'Please enter a valid email address');
          return;
        }`;

// 2. In handleLoginSubmit: normalize phone with slice(-10)
html = html.replace(
  "const cleanPhone = email.replace(/\\D/g, '');",
  "const cleanPhone = email.replace(/\\D/g, '').slice(-10);"
);
html = html.replace(
  "r.phone.replace(/\\D/g, '') === cleanPhone",
  "r.phone.replace(/\\D/g, '').slice(-10) === cleanPhone"
);
html = html.replace(
  "r.phone.replace(/\\D/g, '') === cleanPhone",
  "r.phone.replace(/\\D/g, '').slice(-10) === cleanPhone"
);
html = html.replace(
  "r.phone.replace(/\\D/g, '') === cleanPhone",
  "r.phone.replace(/\\D/g, '').slice(-10) === cleanPhone"
);

// 3. In notice-cat select: support both General and GENERAL
const oldCatSelect = `<select id="notice-cat" class="w-full px-3 py-2 rounded-xl bg-sandstone-50 border border-sandstone-300 focus:border-terracotta-500 outline-none text-xs font-semibold">
            <option value="General">General Society Announcement</option>
            <option value="Urgent">Urgent Alert</option>
            <option value="Maintenance">Maintenance & Repairs</option>
          </select>`;

const newCatSelect = `<select id="notice-cat" class="w-full px-3 py-2 rounded-xl bg-sandstone-50 border border-sandstone-300 focus:border-terracotta-500 outline-none text-xs font-semibold">
            <option value="General">General Society Announcement</option>
            <option value="GENERAL">General</option>
            <option value="Urgent">Urgent Alert</option>
            <option value="URGENT">Urgent</option>
            <option value="Maintenance">Maintenance & Repairs</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>`;

if (html.includes(oldCatSelect)) {
  html = html.replace(oldCatSelect, newCatSelect);
}

fs.writeFileSync('web_preview/index.html', html, 'utf8');
console.log('Applied Part 1 refinements to index.html!');
