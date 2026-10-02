const { chromium } = require('C:/Users/BL0080/.gemini/antigravity/scratch/pixel-perfect-validator/node_modules/playwright');

(async () => {
  console.log('=== RUNNING TESTS FOR ALL 4 USER REQUIREMENTS ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // =========================================================================
  // ITEM 1: USER SHOULD REGISTER USING EMAIL AND PHONE NUMBER BOTH
  // =========================================================================
  console.log('--- 1. Testing Registration with Both Email and Phone ---');
  await page.evaluate(() => window.resetAppClean());
  await page.evaluate(() => window.goToScreen('register'));

  // 1A. Test submitting without email
  await page.fill('#reg-name', 'Kavita Joshi');
  await page.fill('#reg-phone', '9899001122');
  await page.fill('#reg-pin', 'Kavita@123');
  await page.selectOption('#reg-flat', '303');
  
  let capturedToast = '';
  await page.evaluate(() => {
    const orig = window.showAlert;
    window.showAlert = (t, ti, m) => {
      window.__lastAlert = { t, ti, m };
      orig(t, ti, m);
    };
  });

  await page.click('button:has-text("Submit Registration")');
  let lastAlert = await page.evaluate(() => window.__lastAlert);
  console.log('Submit without email alert:', lastAlert);
  if (!lastAlert || lastAlert.ti !== 'Email Required') {
    console.error('FAIL: Missing email was not rejected');
    process.exit(1);
  }
  console.log('PASS: Registration without email strictly blocked with "Email Required"');

  // 1B. Test submitting with invalid email format
  await page.fill('#reg-email', 'invalid-email-format');
  await page.click('button:has-text("Submit Registration")');
  lastAlert = await page.evaluate(() => window.__lastAlert);
  console.log('Submit with invalid email alert:', lastAlert);
  if (!lastAlert || lastAlert.ti !== 'Invalid Email') {
    console.error('FAIL: Invalid email was not rejected');
    process.exit(1);
  }
  console.log('PASS: Invalid email format rejected with "Invalid Email"');

  // 1C. Test submitting with valid email and phone
  await page.fill('#reg-email', 'kavita.joshi@parshwaplatinum.com');
  await page.click('button:has-text("Submit Registration")');
  const regScreen = await page.evaluate(() => window.APP.screen);
  const pendingReq = await page.evaluate(() => {
    return window.APP.pendingRegistrations.find(r => r.name === 'Kavita Joshi');
  });
  console.log('Screen after registration:', regScreen);
  console.log('Pending request record:', pendingReq);
  if (regScreen !== 'pending' || !pendingReq || pendingReq.email !== 'kavita.joshi@parshwaplatinum.com' || pendingReq.phone !== '+91 9899001122') {
    console.error('FAIL: Registration with both email and phone failed to store properly');
    process.exit(1);
  }
  console.log('PASS: Resident registered successfully with BOTH phone and email!');

  // Approve Kavita Joshi via Admin
  await page.evaluate(() => {
    window.approveRegistration(0);
  });

  // 1D. Sign in using Email instead of Phone
  await page.evaluate(() => {
    window.goToScreen('login');
    window.setLoginRole('RESIDENT');
  });
  await page.fill('#login-email', 'kavita.joshi@parshwaplatinum.com');
  await page.fill('#login-password', 'Kavita@123');
  await page.click('button:has-text("Sign In to Security System")');
  const loginScreen = await page.evaluate(() => window.APP.screen);
  const loggedInUser = await page.evaluate(() => window.APP.currentUser);
  console.log('Logged in using Email to screen:', loginScreen, 'User:', loggedInUser ? loggedInUser.name : null);
  if (loginScreen !== 'resident' || !loggedInUser || loggedInUser.name !== 'Kavita Joshi') {
    console.error('FAIL: Login with email failed');
    process.exit(1);
  }
  console.log('PASS: User successfully signed in using registered Email address!');

  // =========================================================================
  // ITEM 2: IF FLAT 401 HAS 4 MEMBERS REGISTERED, 5TH IS NOT ALLOWED TO REGISTER
  // =========================================================================
  console.log('\n--- 2. Testing Flat 401 4-Member Limit (5th Member Blocked) ---');
  await page.evaluate(() => window.resetAppClean());
  
  // Setup 4 registered members for Flat 401
  await page.evaluate(() => {
    const flat401 = window.APP.flats.find(f => f.number === '401');
    flat401.residents = [
      { name: 'Member One', phone: '9800000001', email: 'one@parshwaplatinum.com' },
      { name: 'Member Two', phone: '9800000002', email: 'two@parshwaplatinum.com' },
      { name: 'Member Three', phone: '9800000003', email: 'three@parshwaplatinum.com' },
      { name: 'Member Four', phone: '9800000004', email: 'four@parshwaplatinum.com' }
    ];
    window.broadcastStateUpdate();
  });

  // Now attempt to register 5th member for Flat 401
  await page.evaluate(() => window.goToScreen('register'));
  await page.fill('#reg-name', 'Fifth Member Attempt');
  await page.fill('#reg-phone', '9800000005');
  await page.fill('#reg-email', 'fifth@parshwaplatinum.com');
  await page.fill('#reg-pin', 'Pass@123');
  await page.selectOption('#reg-flat', '401');

  await page.click('button:has-text("Submit Registration")');
  lastAlert = await page.evaluate(() => window.__lastAlert);
  console.log('5th member registration alert:', lastAlert);
  
  const pending5th = await page.evaluate(() => {
    return window.APP.pendingRegistrations.some(r => r.name === 'Fifth Member Attempt');
  });
  const screen5th = await page.evaluate(() => window.APP.screen);

  if (!lastAlert || lastAlert.ti !== 'Flat Full' || pending5th || screen5th === 'pending') {
    console.error('FAIL: 5th member was not blocked for Flat 401');
    process.exit(1);
  }
  console.log('PASS: 5th member for Flat 401 was strictly rejected with "Flat Full" alert and blocked from registration!');

  // =========================================================================
  // ITEM 3: FLAT DROPDOWN AND COUNT UPDATE AUTOMATICALLY IN ADMIN & REGISTER
  // =========================================================================
  console.log('\n--- 3. Testing Flat Dropdown and Dynamic Count Updates ---');
  
  // 3A. Check in Register screen
  await page.evaluate(() => window.goToScreen('register'));
  const regFlat401Text = await page.evaluate(() => {
    const opt = Array.from(document.querySelectorAll('#reg-flat option')).find(o => o.value === '401');
    return opt ? opt.textContent.trim() : '';
  });
  console.log('Register screen flat 401 option text:', regFlat401Text);
  if (!regFlat401Text.includes('4/4') || !regFlat401Text.includes('FULL')) {
    console.error('FAIL: Register screen dropdown does not reflect 4/4 FULL status for flat 401');
    process.exit(1);
  }
  console.log('PASS: Register screen dropdown correctly reflects 4/4 Residents [FULL] for Flat 401');

  // 3B. Check in Admin screen
  await page.evaluate(() => {
    window.APP.currentUser = { role: 'ADMIN', name: 'Harish Mehta (Secretary)', isApproved: true };
    window.goToScreen('admin');
  });

  const adminFlat401Text = await page.evaluate(() => {
    const opt = Array.from(document.querySelectorAll('#admin-flat-select option')).find(o => o.value === '401');
    return opt ? opt.textContent.trim() : '';
  });
  console.log('Admin screen flat 401 dropdown text:', adminFlat401Text);
  if (!adminFlat401Text.includes('4/4') || !adminFlat401Text.includes('FULL')) {
    console.error('FAIL: Admin screen dropdown does not reflect 4/4 FULL status for flat 401');
    process.exit(1);
  }

  // Check 401 detail view on selection
  await page.evaluate(() => {
    window.selectAdminFlatTile('401');
  });
  const detailHtml = await page.evaluate(() => {
    const el = document.getElementById('admin-flat-detail-view');
    return el ? el.innerText : '';
  });
  console.log('Admin flat 401 detail view text:\n', detailHtml);
  if (!detailHtml.includes('Flat 401') || !detailHtml.includes('4/4 Members') || !detailHtml.includes('Member One') || !detailHtml.includes('Member Four')) {
    console.error('FAIL: Admin flat detail view does not display registered members');
    process.exit(1);
  }
  console.log('PASS: Admin flat dropdown, grid tile, and detail view automatically reflect Flat 401 4/4 member count!');

  // =========================================================================
  // ITEM 4: SWITCHING RESIDENT & SECURITY TABS CLEARS PRE-FILLED DATA
  // =========================================================================
  console.log('\n--- 4. Testing Create Account Tab Switch Clears Pre-filled Data ---');
  await page.evaluate(() => window.goToScreen('register'));

  // Fill in resident data
  await page.fill('#reg-name', 'Sunita Rao');
  await page.fill('#reg-phone', '9877112233');
  await page.fill('#reg-email', 'sunita@example.com');
  await page.fill('#reg-pin', 'Sunita@123');

  // Click on Security Guard Tab
  console.log('Switching to Security Guard tab...');
  await page.click('#reg-tab-guard');

  let fieldsAfterSwitchToGuard = await page.evaluate(() => ({
    name: document.getElementById('reg-name').value,
    phone: document.getElementById('reg-phone').value,
    email: document.getElementById('reg-email').value,
    pin: document.getElementById('reg-pin').value,
    guardCode: document.getElementById('reg-guard-code').value,
    role: window.regRole
  }));
  console.log('Fields after switching to Guard:', fieldsAfterSwitchToGuard);

  if (fieldsAfterSwitchToGuard.name !== '' || fieldsAfterSwitchToGuard.phone !== '' || fieldsAfterSwitchToGuard.email !== '' || fieldsAfterSwitchToGuard.pin !== '') {
    console.error('FAIL: Pre-filled data was NOT cleared when switching from Resident to Guard tab');
    process.exit(1);
  }
  console.log('PASS: Pre-filled data cleared when switching from Resident to Guard tab');

  // Now fill guard data
  await page.fill('#reg-name', 'Vikram Guard');
  await page.fill('#reg-phone', '9877445566');
  await page.fill('#reg-email', 'vikram@example.com');
  await page.fill('#reg-guard-code', 'PPGD2026');
  await page.fill('#reg-pin', 'Vikram@123');

  // Switch back to Resident Tab
  console.log('Switching back to Resident tab...');
  await page.click('#reg-tab-resident');

  let fieldsAfterSwitchToResident = await page.evaluate(() => ({
    name: document.getElementById('reg-name').value,
    phone: document.getElementById('reg-phone').value,
    email: document.getElementById('reg-email').value,
    pin: document.getElementById('reg-pin').value,
    guardCode: document.getElementById('reg-guard-code').value,
    role: window.regRole
  }));
  console.log('Fields after switching to Resident:', fieldsAfterSwitchToResident);

  if (fieldsAfterSwitchToResident.name !== '' || fieldsAfterSwitchToResident.phone !== '' || fieldsAfterSwitchToResident.email !== '' || fieldsAfterSwitchToResident.pin !== '') {
    console.error('FAIL: Pre-filled data was NOT cleared when switching from Guard to Resident tab');
    process.exit(1);
  }
  console.log('PASS: Pre-filled data cleared when switching back from Guard to Resident tab');

  await browser.close();
  console.log('\n=== ALL 4 USER REQUIREMENTS VERIFIED & PASSED WITH 100% SUCCESS! ===');
})();
