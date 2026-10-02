const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

// 1. In handleLoginSubmit: Guard phone check with slice(-10)
html = html.replace(
  "const isPending = APP.pendingRegistrations && APP.pendingRegistrations.some(r => r.role === 'GUARD' && (r.phone.replace(/\\D/g, '') === cleanPhone || r.email === email));",
  "const isPending = APP.pendingRegistrations && APP.pendingRegistrations.some(r => r.role === 'GUARD' && (r.phone.replace(/\\D/g, '').slice(-10) === cleanPhone || r.email === email));"
);
html = html.replace(
  "const isRejected = APP.rejectedUsers && APP.rejectedUsers.some(r => r.role === 'GUARD' && (r.phone.replace(/\\D/g, '') === cleanPhone || r.email === email));",
  "const isRejected = APP.rejectedUsers && APP.rejectedUsers.some(r => r.role === 'GUARD' && (r.phone.replace(/\\D/g, '').slice(-10) === cleanPhone || r.email === email));"
);
html = html.replace(
  "const guard = APP.registeredUsers && APP.registeredUsers.find(r => r.role === 'GUARD' && (r.phone.replace(/\\D/g, '') === cleanPhone || r.email === email));",
  "const guard = APP.registeredUsers && APP.registeredUsers.find(r => r.role === 'GUARD' && (r.phone.replace(/\\D/g, '').slice(-10) === cleanPhone || r.email === email));"
);

// 2. In applySyncedState: fix doorbell modal ID and element targets
const oldApplyIntercom = `      if (payload.pendingVisitorRequest !== undefined) {
        APP.pendingVisitorRequest = payload.pendingVisitorRequest;
        // If resident is on screen and pending visitor matches flat, show ring modal
        const modal = document.getElementById('modal-intercom-call');
        if (APP.pendingVisitorRequest && APP.currentUser && APP.currentUser.role === 'RESIDENT' && APP.currentUser.flat === APP.pendingVisitorRequest.flat) {
          const nameEl = document.getElementById('intercom-visitor-name');
          const metaEl = document.getElementById('intercom-visitor-meta');
          if (nameEl) nameEl.textContent = APP.pendingVisitorRequest.name;
          if (metaEl) metaEl.textContent = \`Flat \${APP.pendingVisitorRequest.flat} • \${APP.pendingVisitorRequest.category}\`;
          if (modal) modal.classList.remove('hidden');
          playChime('doorbell');
        } else if (!APP.pendingVisitorRequest && modal) {
          modal.classList.add('hidden');
        }
      }`;

const newApplyIntercom = `      if (payload.pendingVisitorRequest !== undefined) {
        APP.pendingVisitorRequest = payload.pendingVisitorRequest;
        const modal = document.getElementById('doorbell-alert-modal');
        if (APP.pendingVisitorRequest && APP.currentUser && APP.currentUser.role === 'RESIDENT' && APP.currentUser.flat === APP.pendingVisitorRequest.flat) {
          const nameEl = document.getElementById('alert-visitor-title');
          const metaEl = document.getElementById('alert-visitor-desc');
          if (nameEl) nameEl.textContent = \`Visitor at Main Gate: \${APP.pendingVisitorRequest.name}\`;
          if (metaEl) metaEl.textContent = \`\${APP.pendingVisitorRequest.name} (\${APP.pendingVisitorRequest.type}) is requesting entry for Flat \${APP.pendingVisitorRequest.flat}\`;
          if (modal) modal.classList.remove('hidden');
          playChime('doorbell');
        } else if (!APP.pendingVisitorRequest && modal) {
          modal.classList.add('hidden');
        }
      }`;

if (html.includes(oldApplyIntercom)) {
  html = html.replace(oldApplyIntercom, newApplyIntercom);
}

// 3. In submitWalkInIntercomCall: call broadcastStateUpdate()
const submitOld = `document.getElementById('doorbell-alert-modal').classList.remove('hidden');`;
const submitNew = `document.getElementById('doorbell-alert-modal').classList.remove('hidden');\n      broadcastStateUpdate();`;

if (html.includes(submitOld) && !html.includes(submitNew)) {
  html = html.replace(submitOld, submitNew);
}

// 4. In respondVisitorAlert: call broadcastStateUpdate()
const respondOld = `APP.pendingVisitorRequest = null;\n      }`;
const respondNew = `APP.pendingVisitorRequest = null;\n        broadcastStateUpdate();\n      }`;

if (html.includes(respondOld) && !html.includes(respondNew)) {
  html = html.replace(respondOld, respondNew);
}

fs.writeFileSync('web_preview/index.html', html, 'utf8');
console.log('Patched intercom and guard login phone check in index.html!');
