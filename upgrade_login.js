const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

const newLoginLogic = `
    function setLoginRole(role) {
      APP.loginRole = role;
      const resBtn = document.getElementById('role-btn-resident');
      const grdBtn = document.getElementById('role-btn-guard');
      const admBtn = document.getElementById('role-btn-admin');
      const emailInput = document.getElementById('login-email');
      const emailLabel = document.getElementById('login-label-identity');
      const pwdInput = document.getElementById('login-password');
      const pwdLabel = document.getElementById('login-label-password');

      if (resBtn && grdBtn && admBtn) {
        resBtn.className = \`py-2.5 px-1 rounded-xl text-center font-bold text-xs transition flex flex-col items-center gap-0.5 \${role === 'RESIDENT' ? 'bg-terracotta-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'}\`;
        grdBtn.className = \`py-2.5 px-1 rounded-xl text-center font-bold text-xs transition flex flex-col items-center gap-0.5 \${role === 'GUARD' ? 'bg-terracotta-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'}\`;
        admBtn.className = \`py-2.5 px-1 rounded-xl text-center font-bold text-xs transition flex flex-col items-center gap-0.5 \${role === 'ADMIN' ? 'bg-terracotta-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'}\`;
      }

      if (role === 'ADMIN') {
        if (emailLabel) emailLabel.textContent = 'Admin Email';
        if (emailInput) {
          emailInput.placeholder = 'admin@parshwaplatinum.com';
          emailInput.type = 'text';
        }
        if (pwdLabel) pwdLabel.textContent = 'Admin PIN (4 digits)';
        if (pwdInput) {
          pwdInput.placeholder = '••••';
          pwdInput.maxLength = 4;
          pwdInput.setAttribute('pattern', '[0-9]*');
          pwdInput.setAttribute('inputmode', 'numeric');
        }
      } else if (role === 'GUARD') {
        if (emailLabel) emailLabel.textContent = 'Mobile Number or Email';
        if (emailInput) {
          emailInput.placeholder = 'e.g. 9822011223 or guard email';
          emailInput.type = 'text';
        }
        if (pwdLabel) pwdLabel.textContent = 'Password';
        if (pwdInput) {
          pwdInput.placeholder = '••••••••';
          pwdInput.removeAttribute('maxLength');
          pwdInput.removeAttribute('pattern');
          pwdInput.removeAttribute('inputmode');
        }
      } else {
        if (emailLabel) emailLabel.textContent = 'Mobile Number or Email';
        if (emailInput) {
          emailInput.placeholder = 'e.g. 9876543210 or resident email';
          emailInput.type = 'text';
        }
        if (pwdLabel) pwdLabel.textContent = 'Password';
        if (pwdInput) {
          pwdInput.placeholder = '••••••••';
          pwdInput.removeAttribute('maxLength');
          pwdInput.removeAttribute('pattern');
          pwdInput.removeAttribute('inputmode');
        }
      }
      playChime('keypad');
      showAlert('info', 'Role Selected', \`Sign in portal active for \${role.toLowerCase()}\`);
    }

    function handleLoginSubmit(e) {
      if (e && e.preventDefault) e.preventDefault();
      const emailEl = document.getElementById('login-email');
      const passEl = document.getElementById('login-password');
      const email = emailEl ? emailEl.value.trim() : '';
      const pass = passEl ? passEl.value.trim() : '';

      if (APP.loginRole === 'ADMIN') {
        // AL-22 / AL-23 / AL-24: Check lockout (5 failed attempts -> 300s lock)
        if (APP.pinLockoutUntil && Date.now() < APP.pinLockoutUntil) {
          const remaining = Math.ceil((APP.pinLockoutUntil - Date.now()) / 1000);
          playChime('sos');
          showAlert('error', 'Account Locked', \`5 consecutive failed logins. Account locked for \${remaining}s.\`);
          return;
        }
        if (APP.pinLockoutUntil && Date.now() >= APP.pinLockoutUntil) {
          APP.pinLockoutUntil = 0;
          APP.pinAttempts = 0;
        }

        // AL-19: Both fields empty
        if (!email && !pass) {
          playChime('sos');
          showAlert('error', 'Fields Required', 'Please enter email and PIN');
          return;
        }

        // AL-13: Email empty
        if (!email) {
          playChime('sos');
          showAlert('error', 'Email Required', 'Please enter your administrator email');
          return;
        }

        // AL-17, AL-18: Email length bounds
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
        }

        // AL-04: PIN empty
        if (!pass) {
          playChime('sos');
          showAlert('error', 'PIN Required', 'PIN cannot be empty');
          return;
        }

        // AL-05, AL-06, AL-07, AL-10, AL-11: PIN format (exactly 4 numeric digits)
        if (pass.length !== 4 || !/^\\d{4}$/.test(pass)) {
          playChime('sos');
          showAlert('error', 'Invalid PIN Format', 'Admin PIN must be exactly 4 numeric digits');
          return;
        }

        const normalizedEmail = email.toLowerCase();
        const pinHash = sha256Sync(pass);

        // AL-01, AL-02, AL-03: Verify email & PIN hash
        if (normalizedEmail === 'admin@parshwaplatinum.com' && pinHash === ADMIN_PIN_HASH) {
          APP.pinAttempts = 0;
          APP.pinLockoutUntil = 0;
          APP.currentUser = { ...ADMIN_ACCOUNT };
          localStorage.setItem('parshwa_session', JSON.stringify(APP.currentUser));
          playTone(420, 'sine', 0.04, 0); // AL-01: Keypad click plays
          showAlert('success', 'Admin Access Granted', 'Welcome back, Society Administrator');
          goToScreen('admin');
          broadcastStateUpdate();
          return;
        }

        // AL-08, AL-09, AL-12, AL-16, AL-20, AL-21, AL-22: Invalid credentials
        APP.pinAttempts = (APP.pinAttempts || 0) + 1;
        playChime('sos');
        if (APP.pinAttempts >= 5) {
          APP.pinLockoutUntil = Date.now() + 300000;
          showAlert('error', 'Account Locked', '5 consecutive failed attempts. System locked for 300 seconds.');
        } else {
          showAlert('error', 'Invalid Credentials', 'Invalid email or PIN. Please try again.');
        }
        return;
      }

      if (APP.loginRole === 'RESIDENT') {
        const cleanPhone = email.replace(/\\D/g, '');
        // Check pending requests
        const isPending = APP.pendingRegistrations && APP.pendingRegistrations.some(r => r.role === 'RESIDENT' && (r.phone.replace(/\\D/g, '') === cleanPhone || r.email === email));
        if (isPending) {
          playChime('sos');
          showAlert('warning', 'Pending Approval', 'Your registration is pending approval by the Society Administrator.');
          goToScreen('pending');
          return;
        }
        // Check rejected requests
        const isRejected = APP.rejectedUsers && APP.rejectedUsers.some(r => r.role === 'RESIDENT' && (r.phone.replace(/\\D/g, '') === cleanPhone || r.email === email));
        if (isRejected) {
          playChime('sos');
          showAlert('error', 'Registration Rejected', 'Your registration was rejected by the Society Administrator.');
          return;
        }
        // Check registered users
        const resident = APP.registeredUsers && APP.registeredUsers.find(r => r.role === 'RESIDENT' && (r.phone.replace(/\\D/g, '') === cleanPhone || r.email === email));
        if (resident && resident.isApproved) {
          APP.currentUser = resident;
          localStorage.setItem('parshwa_session', JSON.stringify(APP.currentUser));
          playChime('success');
          showAlert('success', 'Signed In', \`Welcome back, \${resident.name}!\`);
          goToScreen('resident');
          broadcastStateUpdate();
          return;
        }
        playChime('sos');
        showAlert('error', 'Invalid Credentials', 'Resident not found or invalid credentials.');
        return;
      }

      if (APP.loginRole === 'GUARD') {
        const cleanPhone = email.replace(/\\D/g, '');
        // Check pending requests
        const isPending = APP.pendingRegistrations && APP.pendingRegistrations.some(r => r.role === 'GUARD' && (r.phone.replace(/\\D/g, '') === cleanPhone || r.email === email));
        if (isPending) {
          playChime('sos');
          showAlert('warning', 'Pending Approval', 'Your guard registration is pending approval by the Society Administrator.');
          goToScreen('pending');
          return;
        }
        // Check rejected requests
        const isRejected = APP.rejectedUsers && APP.rejectedUsers.some(r => r.role === 'GUARD' && (r.phone.replace(/\\D/g, '') === cleanPhone || r.email === email));
        if (isRejected) {
          playChime('sos');
          showAlert('error', 'Registration Rejected', 'Your guard registration was rejected.');
          return;
        }
        // Check registered guards
        const guard = APP.registeredUsers && APP.registeredUsers.find(r => r.role === 'GUARD' && (r.phone.replace(/\\D/g, '') === cleanPhone || r.email === email));
        if (guard && guard.isApproved) {
          APP.currentUser = guard;
          localStorage.setItem('parshwa_session', JSON.stringify(APP.currentUser));
          playChime('success');
          showAlert('success', 'Signed In', \`Welcome, Guard \${guard.name}!\`);
          goToScreen('guard');
          broadcastStateUpdate();
          return;
        }
        playChime('sos');
        showAlert('error', 'Invalid Credentials', 'Guard not found or invalid credentials.');
        return;
      }
    }
`;

// Also ensure label id="login-label-password" exists in renderLoginScreen
html = html.replace(
  '<label class="block text-[11px] font-bold text-slate-700">Password</label>',
  '<label class="block text-[11px] font-bold text-slate-700" id="login-label-password">Password</label>'
);

// Replace setLoginRole and handleLoginSubmit
const startIdx = html.indexOf('function setLoginRole(role) {');
const endIdx = html.indexOf('function handleGoogleSignIn() {');

if (startIdx !== -1 && endIdx !== -1) {
  html = html.slice(0, startIdx) + newLoginLogic + '\n' + html.slice(endIdx);
  fs.writeFileSync('web_preview/index.html', html, 'utf8');
  console.log('Successfully upgraded setLoginRole & handleLoginSubmit in index.html!');
} else {
  console.error('Could not find slice indices:', { startIdx, endIdx });
}
