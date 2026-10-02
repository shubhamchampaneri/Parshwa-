const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'web_preview/index.html');
let html = fs.readFileSync(filePath, 'utf8');

// 1. Toast close button hit area min-width: 44px, min-height: 44px (TO-07)
html = html.replace(
  '<button type="button" onclick="dismissToast()" class="text-slate-400 hover:text-white text-base leading-none p-1 font-bold flex-shrink-0">&times;</button>',
  '<button type="button" onclick="dismissToast()" id="toast-close-btn" style="min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;" class="text-slate-400 hover:text-white text-lg leading-none font-bold flex-shrink-0 cursor-pointer" aria-label="Dismiss Notification">&times;</button>'
);

// 2. Toast timeout from 3500 to 4000 (P12, TO-04, TO-05)
html = html.replace(
  'toastTimer = setTimeout(() => {\n        dismissToast();\n      }, 3500);',
  'toastTimer = setTimeout(() => {\n        dismissToast();\n      }, 4000);'
);

// 3. Register password input id and length (RR-22..27)
html = html.replace(
  `<label class="block text-[11px] font-bold text-slate-700 mb-0.5">Create 4-Digit Security PIN</label>\n                <input type="password" id="reg-pin" placeholder="••••" maxlength="4" required class="w-full px-3 py-2.5 rounded-xl bg-white border border-sandstone-300 focus:border-terracotta-500 outline-none text-xs font-mono font-bold">`,
  `<label class="block text-[11px] font-bold text-slate-700 mb-0.5" id="reg-pwd-label">Password / PIN (6–32 characters)</label>\n                <input type="password" id="reg-pin" placeholder="Create strong password" minlength="6" maxlength="32" required class="w-full px-3 py-2.5 rounded-xl bg-white border border-sandstone-300 focus:border-terracotta-500 outline-none text-xs font-semibold">`
);

// 4. Update ADMIN_ACCOUNT and sha256Sync implementation, replacing plaintext 5829
const sha256Snippet = `
    // Cryptographic SHA-256 implementation (Zero plaintext PINs stored in client code)
    function sha256Sync(ascii) {
      function rightRotate(value, amount) { return (value>>>amount) | (value<<(32 - amount)); }
      const mathPow = Math.pow; const maxWord = mathPow(2, 32); const lengthProperty = 'length';
      let i, j; let result = ''; const words = []; const asciiBitLength = ascii[lengthProperty]*8;
      let hash = []; const k = []; let primeCounter = 0; const isComposite = {};
      for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
          for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
          hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
          k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
        }
      }
      ascii += '\\x80';
      while (ascii[lengthProperty]%64 - 56) ascii += '\\x00';
      for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j>>8) return;
        words[i>>2] |= j << ((3 - i)%4)*8;
      }
      words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
      words[words[lengthProperty]] = (asciiBitLength);
      for (j = 0; j < words[lengthProperty];) {
        const w = words.slice(j, j += 16);
        const oldHash = hash;
        hash = hash.slice(0, 8);
        for (i = 0; i < 64; i++) {
          const i2 = i + j;
          const w15 = w[i - 15], w2 = w[i - 2];
          const a = hash[0], e = hash[4];
          const temp1 = hash[7]
            + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
            + ((e & hash[5]) ^ ((~e) & hash[6]))
            + k[i]
            + (w[i] = (i < 16) ? w[i] : (
                w[i - 16]
                + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3))
                + w[i - 7]
                + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10))
              )|0
            );
          const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
            + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
          hash = [(temp1 + temp2)|0].concat(hash);
          hash[4] = (hash[4] + temp1)|0;
        }
        for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i])|0;
      }
      for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
          const b = (hash[i]>>(j*8))&255;
          result += ((b < 16) ? 0 : '') + b.toString(16);
        }
      }
      return result;
    }
    const ADMIN_PIN_HASH = '997b0081a9cb967261b9554336e8edda0019827a98334da2cd3841bfb09c1bca';
    window.sha256Sync = sha256Sync;
    window.ADMIN_PIN_HASH = ADMIN_PIN_HASH;
`;

// Insert sha256Snippet right before ADMIN_ACCOUNT
html = html.replace('// Real Admin Setup: Society Secretary', sha256Snippet + '\n    // Real Admin Setup: Society Secretary');

// Replace ADMIN_ACCOUNT pin with pinHash
html = html.replace("pin: '5829',", "pinHash: ADMIN_PIN_HASH,");

// Also replace any remaining plaintext '5829' with pinHash
html = html.replace(/pin:\s*'5829'/g, "pinHash: ADMIN_PIN_HASH");

// In handleRegisterSubmit: Password/PIN bounds: 6-32 chars
html = html.replace(
  "if (!rawPin || rawPin.length < 4 || rawPin.length > 32) {",
  "if (!rawPin || rawPin.length < 6 || rawPin.length > 32) {"
);
html = html.replace(
  "showAlert('error', 'Invalid Password', 'Security PIN/Password must be between 4 and 32 characters');",
  "showAlert('error', 'Invalid Password', 'Password must be between 6 and 32 characters');"
);

// Save updated html
fs.writeFileSync(filePath, html, 'utf8');
console.log('App patched successfully!');
