const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

// 1. Upgrade checkoutVisitor with duplicate exit prevention
const oldCheckout = `    function checkoutVisitor(id) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const v = APP.visitorLog.find(item => item.id === id);
      if (v) {
        v.status = 'EXITED';
        v.exitTime = timeStr;
      }
      APP.visitorsInside = APP.visitorsInside.filter(item => item.id !== id);
      playChime('gate');
      showAlert('success', 'Checked Out', 'Visitor marked exited from Parshwa Platinum campus.');`;

const newCheckout = `    function checkoutVisitor(id) {
      const isInside = APP.visitorsInside.some(item => item.id === id);
      if (!isInside) {
        playChime('sos');
        showAlert('warning', 'Already Exited', 'Visitor has already exited or is not marked inside.');
        return false;
      }
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const v = APP.visitorLog.find(item => item.id === id);
      if (v) {
        v.status = 'EXITED';
        v.exitTime = timeStr;
      }
      APP.visitorsInside = APP.visitorsInside.filter(item => item.id !== id);
      broadcastStateUpdate();
      playChime('gate');
      showAlert('success', 'Checked Out', 'Visitor marked exited from Parshwa Platinum campus.');
      if (APP.screen === 'guard') {
        renderGuardScreen(document.getElementById('app-viewport'));
      } else if (APP.screen === 'visitors') {
        renderVisitorsScreen(document.getElementById('app-viewport'));
      } else {
        renderResidentScreen(document.getElementById('app-viewport'));
      }
      return true;
    }`;

if (html.includes(oldCheckout)) {
  html = html.replace(oldCheckout, newCheckout);
  console.log('Upgraded checkoutVisitor!');
}

// 2. Upgrade toggleDeliveryPolicy to accept optional value and update flat preference
const oldToggle = `    function toggleDeliveryPolicy() {
      APP.deliveryPolicy = APP.deliveryPolicy === 'ASK_FIRST' ? 'LEAVE_AT_GATE' : 'ASK_FIRST';
      playChime('success');
      showAlert('success', 'Policy Updated', \`Delivery preference set to \${APP.deliveryPolicy === 'ASK_FIRST' ? 'Always ask for approval' : 'Leave packages at gate with security'}\`);
      renderResidentScreen(document.getElementById('app-viewport'));
    }`;

const newToggle = `    function toggleDeliveryPolicy(explicitVal) {
      if (explicitVal) {
        APP.deliveryPolicy = explicitVal;
      } else {
        APP.deliveryPolicy = APP.deliveryPolicy === 'ASK_FIRST' ? 'LEAVE_AT_GATE' : 'ASK_FIRST';
      }
      const flatNum = APP.currentUser ? APP.currentUser.flat : '101';
      const flatObj = APP.flats.find(f => f.number === flatNum);
      if (flatObj) {
        flatObj.preference = APP.deliveryPolicy === 'LEAVE_AT_GATE' ? 'LEAVE_AT_SECURITY' : 'ASK_FIRST';
      }
      broadcastStateUpdate();
      playChime('success');
      showAlert('success', 'Policy Updated', \`Delivery preference set to \${APP.deliveryPolicy === 'ASK_FIRST' ? 'Always ask for approval' : 'Leave packages at gate with security'}\`);
      if (APP.screen === 'resident') renderResidentScreen(document.getElementById('app-viewport'));
      return APP.deliveryPolicy;
    }`;

if (html.includes(oldToggle)) {
  html = html.replace(oldToggle, newToggle);
  console.log('Upgraded toggleDeliveryPolicy!');
}

// 3. Upgrade submitWalkInIntercomCall to accept opts and enforce validations
const oldSubmitWalkin = `    function submitWalkInIntercomCall() {
      const name = document.getElementById('walkin-name').value.trim() || 'Visitor';
      const phone = document.getElementById('walkin-phone').value.trim() || '9822199887';
      const flat = APP.walkinSelectedFlat || '101';
      const photo = document.getElementById('walkin-photo-preview').textContent || '👤';
      const vehicle = document.getElementById('walkin-vehicle') ? document.getElementById('walkin-vehicle').value.trim() || 'None' : 'None';
      const type = (APP.walkinCategory || 'Guest').toUpperCase();`;

const newSubmitWalkin = `    function submitWalkInIntercomCall(opts = {}) {
      const nameInput = document.getElementById('walkin-name');
      const name = opts.name !== undefined ? opts.name.trim() : (nameInput ? nameInput.value.trim() : '');
      const phoneInput = document.getElementById('walkin-phone');
      const phone = opts.phone !== undefined ? opts.phone.trim() : (phoneInput ? phoneInput.value.trim() : '9822199887');
      const flat = opts.flat !== undefined ? opts.flat : APP.walkinSelectedFlat;
      const vehicleInput = document.getElementById('walkin-vehicle');
      const vehicle = opts.vehicle !== undefined ? opts.vehicle.trim() : (vehicleInput ? vehicleInput.value.trim() : '');
      const category = opts.category !== undefined ? opts.category : APP.walkinCategory;

      // GW-05: Category required
      if (!category) {
        playChime('sos');
        showAlert('error', 'Category Required', 'Please select a visitor category');
        return false;
      }

      // GW-06: Flat required
      if (!flat) {
        playChime('sos');
        showAlert('error', 'Flat Required', 'Please select a flat number');
        return false;
      }

      // GW-07..09: Name 2-50 chars
      if (!name || name.length < 2) {
        playChime('sos');
        showAlert('error', 'Name Too Short', 'Visitor name must be at least 2 characters');
        return false;
      }
      if (name.length > 50) {
        playChime('sos');
        showAlert('error', 'Name Too Long', 'Visitor name cannot exceed 50 characters');
        return false;
      }

      // GW-10..11: Vehicle max 15 chars, alphanumeric only
      if (vehicle && vehicle !== 'None') {
        if (vehicle.length > 15 || !/^[A-Za-z0-9\\s-]*$/.test(vehicle)) {
          playChime('sos');
          showAlert('error', 'Invalid Vehicle Number', 'Vehicle number cannot exceed 15 alphanumeric characters');
          return false;
        }
      }

      const photo = document.getElementById('walkin-photo-preview') ? (document.getElementById('walkin-photo-preview').textContent || '👤') : '👤';
      const type = category.toUpperCase();`;

if (html.includes(oldSubmitWalkin)) {
  html = html.replace(oldSubmitWalkin, newSubmitWalkin);
  console.log('Upgraded submitWalkInIntercomCall!');
}

// 4. Expose transitionVisitor and transitionPass
const windowExposures = `
    window.toggleDeliveryPolicy = toggleDeliveryPolicy;
    window.generatePass = generatePass;
    window.admitVisitorWithPass = admitVisitorWithPass;
    window.checkoutVisitor = checkoutVisitor;
    window.revokePass = revokePass;
    window.logGuardIncident = logGuardIncident;
    window.triggerEmergencySos = triggerEmergencySos;
    window.submitWalkInIntercomCall = submitWalkInIntercomCall;
    window.selectWalkinCategory = selectWalkinCategory;
    window.selectWalkinFlat = selectWalkinFlat;
    window.openWalkInVisitorModal = openWalkInVisitorModal;

    function transitionVisitor(visitorId, targetState, role = 'GUARD') {
      const visitor = APP.visitorLog.find(v => v.id === visitorId);
      if (!visitor) return { allowed: false, error: 'Visitor not found' };
      const current = visitor.status;
      if (targetState === 'APPROVED' && role !== 'RESIDENT') return { allowed: false, error: 'Only resident can approve' };
      if (targetState === 'REJECTED' && role !== 'RESIDENT') return { allowed: false, error: 'Only resident can reject' };
      if (targetState === 'INSIDE' && role !== 'GUARD') return { allowed: false, error: 'Only guard can admit' };
      if (targetState === 'EXITED' && role !== 'GUARD') return { allowed: false, error: 'Only guard can check out' };

      if (current === 'PENDING' && targetState === 'APPROVED') { visitor.status = 'APPROVED'; return { allowed: true }; }
      if (current === 'APPROVED' && targetState === 'INSIDE') { visitor.status = 'INSIDE'; APP.visitorsInside.push(visitor); return { allowed: true }; }
      if (current === 'INSIDE' && targetState === 'EXITED') { visitor.status = 'EXITED'; APP.visitorsInside = APP.visitorsInside.filter(v => v.id !== visitorId); return { allowed: true }; }
      if (current === 'PENDING' && targetState === 'REJECTED') { visitor.status = 'REJECTED'; return { allowed: true }; }
      if (current === 'PENDING' && targetState === 'NO_RESPONSE') { visitor.status = 'NO_RESPONSE'; return { allowed: true }; }
      return { allowed: false, error: \`Invalid transition from \${current} to \${targetState}\` };
    }
    window.transitionVisitor = transitionVisitor;

    function transitionPass(passId, targetState) {
      const pass = APP.activePasses.find(p => p.id === passId || p.otp === passId);
      if (!pass) return { allowed: false, error: 'Pass not found' };
      const current = pass.status;
      if (current === 'ACTIVE' && ['USED', 'EXPIRED', 'REVOKED'].includes(targetState)) {
        pass.status = targetState;
        return { allowed: true };
      }
      return { allowed: false, error: \`Invalid pass transition from \${current} to \${targetState}\` };
    }
    window.transitionPass = transitionPass;
`;

if (!html.includes('window.transitionVisitor')) {
  const insertSite = `window.renderNoticesScreen = renderNoticesScreen;`;
  html = html.replace(insertSite, insertSite + windowExposures);
  console.log('Added window exposures and transition helpers!');
}

fs.writeFileSync('web_preview/index.html', html, 'utf8');
console.log('patch_part3 applied successfully!');
