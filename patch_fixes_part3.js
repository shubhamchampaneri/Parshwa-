const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

// 1. Update newPass object inside generatePass
const oldNewPass = `      const newPass = {
        id: \`pass-\${Date.now()}\`,
        name: name,
        type: type,
        flat: flat,
        otp: otpFormatted,
        cleanOtp: cleanOtp,
        createdAt: 'Just now',
        createdAtTimestamp: Date.now(),
        expiresAt: Date.now() + 86400000, // 24 hours default
        status: 'ACTIVE'
      };

      APP.activePasses.unshift(newPass);
      broadcastStateUpdate();`;

const newNewPass = `      const newPass = {
        id: \`pass-\${Date.now()}\`,
        name: name,
        type: type,
        flat: flat,
        otp: cleanOtp,
        formattedOtp: otpFormatted,
        cleanOtp: cleanOtp,
        createdAt: 'Just now',
        createdAtTimestamp: Date.now(),
        durationMinutes: durationMin,
        expiresAt: endTime,
        status: 'ACTIVE'
      };

      APP.activePasses.unshift(newPass);
      broadcastStateUpdate();`;

if (html.includes(oldNewPass)) {
  html = html.replace(oldNewPass, newNewPass);
  console.log('Updated newPass object in generatePass');
}

// 2. Add return newPass to generatePass
const oldGenPassEnd = `      document.getElementById('pass-result').classList.remove('hidden');
      playChime('success');
      showAlert('success', 'Pass Generated', \`OTP \${otpFormatted} is active in gate database!\`);
    }`;

const newGenPassEnd = `      document.getElementById('pass-result').classList.remove('hidden');
      playChime('success');
      showAlert('success', 'Pass Generated', \`OTP \${otpFormatted} is active in gate database!\`);
      return newPass;
    }`;

if (html.includes(oldGenPassEnd)) {
  html = html.replace(oldGenPassEnd, newGenPassEnd);
  console.log('Added return newPass to generatePass');
}

// 3. Return newVisitor / request from submitWalkInIntercomCall
const oldLeftAtGateReturn = `        showAlert('info', 'Left at Gate', \`Delivery package for Flat \${flat} left at security gate.\`);
        if (APP.screen === 'guard') renderGuardScreen(document.getElementById('app-viewport'));
        return;
      }`;

const newLeftAtGateReturn = `        showAlert('info', 'Left at Gate', \`Delivery package for Flat \${flat} left at security gate.\`);
        if (APP.screen === 'guard') renderGuardScreen(document.getElementById('app-viewport'));
        return newVisitor;
      }`;

if (html.includes(oldLeftAtGateReturn)) {
  html = html.replace(oldLeftAtGateReturn, newLeftAtGateReturn);
  console.log('Updated Left at Gate return');
}

const oldIntercomEnd = `      APP.intercomRingTimer = setTimeout(() => {
        respondVisitorAlert(false);
      }, 60000);
    }`;

const newIntercomEnd = `      APP.intercomRingTimer = setTimeout(() => {
        respondVisitorAlert(false);
      }, 60000);
      return APP.pendingVisitorRequest;
    }`;

if (html.includes(oldIntercomEnd)) {
  html = html.replace(oldIntercomEnd, newIntercomEnd);
  console.log('Updated submitWalkInIntercomCall return');
}

// 4. Update toggle button height in resident screen
const oldToggleBtn = `<button type="button" onclick="toggleDeliveryPolicy()" class="btn-base btn-secondary btn-sm">
              Toggle
            </button>`;

const newToggleBtn = `<button type="button" onclick="toggleDeliveryPolicy()" class="btn-base btn-secondary btn-md min-h-[44px]">
              Toggle
            </button>`;

if (html.includes(oldToggleBtn)) {
  html = html.replace(oldToggleBtn, newToggleBtn);
  console.log('Updated delivery toggle button height');
}

fs.writeFileSync('web_preview/index.html', html, 'utf8');
console.log('patch_fixes_part3 completed!');
