const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

// Replace if (!pass) return; with return false;
const oldNoPass = `        } else {
          showAlert('warning', 'Invalid OTP', 'Invalid OTP entered. Pass not found in active database.');
        }
        return;
      }`;

const newNoPass = `        } else {
          showAlert('warning', 'Invalid OTP', 'Invalid OTP entered. Pass not found in active database.');
        }
        return false;
      }`;

if (html.includes(oldNoPass)) {
  html = html.replace(oldNoPass, newNoPass);
  console.log('Updated noPass return false');
}

// Return newVisitor on success
const oldAdmitSuccess = `      showAlert('success', 'Pass Validated', \`\${pass.name} admitted for Flat \${pass.flat}!\`);
      if (APP.screen === 'guard') {
        renderGuardScreen(document.getElementById('app-viewport'));
      } else if (APP.screen === 'visitors') {
        renderVisitorsScreen(document.getElementById('app-viewport'));
      } else {
        renderResidentScreen(document.getElementById('app-viewport'));
      }
    }`;

const newAdmitSuccess = `      showAlert('success', 'Pass Validated', \`\${pass.name} admitted for Flat \${pass.flat}!\`);
      if (APP.screen === 'guard') {
        renderGuardScreen(document.getElementById('app-viewport'));
      } else if (APP.screen === 'visitors') {
        renderVisitorsScreen(document.getElementById('app-viewport'));
      } else {
        renderResidentScreen(document.getElementById('app-viewport'));
      }
      return newVisitor;
    }`;

if (html.includes(oldAdmitSuccess)) {
  html = html.replace(oldAdmitSuccess, newAdmitSuccess);
  console.log('Updated admitVisitorWithPass return newVisitor');
}

fs.writeFileSync('web_preview/index.html', html, 'utf8');
console.log('patch_admit completed');
