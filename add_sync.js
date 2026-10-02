const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

const syncCode = `
    // Cross-tab synchronization via BroadcastChannel & localStorage
    const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('parshwa_sync') : null;

    function broadcastStateUpdate() {
      const payload = {
        registeredUsers: APP.registeredUsers,
        pendingRegistrations: APP.pendingRegistrations,
        rejectedUsers: APP.rejectedUsers,
        activePasses: APP.activePasses,
        visitorLog: APP.visitorLog,
        visitorsInside: APP.visitorsInside,
        notices: APP.notices,
        incidents: APP.incidents,
        pendingVisitorRequest: APP.pendingVisitorRequest,
        guardSecretCode: APP.guardSecretCode,
        flats: APP.flats,
        deliveryPolicy: APP.deliveryPolicy
      };
      try {
        localStorage.setItem('parshwa_shared_state', JSON.stringify(payload));
      } catch(_) {}
      if (syncChannel) {
        try { syncChannel.postMessage({ type: 'STATE_SYNC', payload }); } catch(_) {}
      }
    }
    window.broadcastStateUpdate = broadcastStateUpdate;

    function applySyncedState(payload) {
      if (!payload) return;
      if (payload.registeredUsers) APP.registeredUsers = payload.registeredUsers;
      if (payload.pendingRegistrations) APP.pendingRegistrations = payload.pendingRegistrations;
      if (payload.rejectedUsers) APP.rejectedUsers = payload.rejectedUsers;
      if (payload.activePasses) APP.activePasses = payload.activePasses;
      if (payload.visitorLog) APP.visitorLog = payload.visitorLog;
      if (payload.visitorsInside) APP.visitorsInside = payload.visitorsInside;
      if (payload.notices) APP.notices = payload.notices;
      if (payload.incidents) APP.incidents = payload.incidents;
      if (payload.pendingVisitorRequest !== undefined) {
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
      }
      if (payload.guardSecretCode) APP.guardSecretCode = payload.guardSecretCode;
      if (payload.flats) APP.flats = payload.flats;
      if (payload.deliveryPolicy) APP.deliveryPolicy = payload.deliveryPolicy;

      // Re-render current active screen if applicable
      const vp = document.getElementById('app-viewport');
      if (vp && APP.screen === 'guard') renderGuardScreen(vp);
      else if (vp && APP.screen === 'admin') renderAdminScreen(vp);
      else if (vp && APP.screen === 'resident') renderResidentScreen(vp);
      else if (vp && APP.screen === 'visitors') renderVisitorsScreen(vp);
      else if (vp && APP.screen === 'notices') renderNoticesScreen(vp);
    }

    if (syncChannel) {
      syncChannel.onmessage = (e) => {
        if (e.data && e.data.type === 'STATE_SYNC') {
          applySyncedState(e.data.payload);
        }
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'parshwa_shared_state' && e.newValue) {
        try {
          applySyncedState(JSON.parse(e.newValue));
        } catch(_) {}
      }
    });
`;

if (!html.includes('syncChannel')) {
  html = html.replace('window.resetAppClean = resetAppClean;', 'window.resetAppClean = resetAppClean;\n' + syncCode);
  fs.writeFileSync('web_preview/index.html', html, 'utf8');
  console.log('Added syncChannel and broadcastStateUpdate successfully!');
} else {
  console.log('syncChannel already present.');
}
