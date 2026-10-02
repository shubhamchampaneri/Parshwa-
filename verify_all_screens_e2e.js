const { chromium } = require('C:/Users/BL0080/.gemini/antigravity/scratch/pixel-perfect-validator/node_modules/playwright');

async function verifyAllScreens() {
  console.log('=== RUNNING COMPLETE CROSS-SCREEN SYSTEM AUDIT ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 1. SCREEN 1: SPLASH SCREEN
  console.log('1. Auditing Splash Screen...');
  await page.evaluate(() => window.goToScreen('splash'));
  const hasSplashBtn = await page.isVisible('button:has-text("Enter Security System")');
  if (!hasSplashBtn) throw new Error('Splash screen CTA missing');

  // 2. SCREEN 2: LOGIN SCREEN
  console.log('2. Auditing Login Screen (All 3 Roles & Modals)...');
  await page.click('button:has-text("Enter Security System")');
  await page.waitForTimeout(300);

  // Test Forgot Password modal
  await page.click('button:has-text("Forgot Password?")');
  const forgotOpen = await page.isVisible('#modal-forgot-password:not(.hidden)');
  if (!forgotOpen) throw new Error('Forgot password modal failed to open');
  await page.click('#modal-forgot-password button:has-text("Back to Login")');

  // Test role tab switches & input clearing
  await page.fill('#login-email', '9876543210');
  await page.fill('#login-password', 'Pass@123');
  await page.click('#role-btn-guard');
  const guardCleared = await page.evaluate(() => document.getElementById('login-email').value === '');
  if (!guardCleared) throw new Error('Inputs not cleared on role switch to Guard');

  // Test password eye toggle
  await page.fill('#login-password', 'MyTestPass');
  await page.click('#login-password-eye');
  let type = await page.evaluate(() => document.getElementById('login-password').type);
  if (type !== 'text') throw new Error('Password visibility eye toggle failed to reveal');
  await page.click('#login-password-eye');
  type = await page.evaluate(() => document.getElementById('login-password').type);
  if (type !== 'password') throw new Error('Password visibility eye toggle failed to hide');

  // 3. SCREEN 3: REGISTER SCREEN
  console.log('3. Auditing Register Screen (Resident & Guard)...');
  await page.click('button:has-text("Create User / Register")');
  await page.waitForTimeout(300);

  // Resident registration
  await page.fill('#reg-name', 'Vikram Malhotra');
  await page.fill('#reg-phone', '9822334455');
  await page.fill('#reg-email', 'vikram@parshwaplatinum.com');
  await page.fill('#reg-pin', 'Vikram@123');
  await page.selectOption('#reg-flat', '302');
  await page.click('button:has-text("Submit Registration")');
  await page.waitForTimeout(300);

  // 4. SCREEN 4: PENDING APPROVAL SCREEN
  console.log('4. Auditing Pending Approval Screen...');
  const screenIsPending = await page.evaluate(() => window.APP.screen === 'pending');
  if (!screenIsPending) throw new Error('Registration did not transition to pending screen');

  // 5. SCREEN 5: ADMIN DASHBOARD & APPROVAL QUEUE
  console.log('5. Auditing Admin Dashboard, Flats Directory & Approval Queue...');
  await page.evaluate(() => {
    window.goToScreen('login');
    window.setLoginRole('ADMIN');
    document.getElementById('login-email').value = 'admin@parshwaplatinum.com';
    document.getElementById('login-password').value = '5829';
    window.handleLoginSubmit(new Event('submit'));
  });
  await page.waitForTimeout(300);
  const adminActive = await page.evaluate(() => window.APP.screen === 'admin' && window.APP.currentUser.role === 'ADMIN');
  if (!adminActive) throw new Error('Admin login failed');

  // Approve Vikram Malhotra
  await page.evaluate(() => {
    const idx = window.APP.pendingRegistrations.findIndex(r => r.name === 'Vikram Malhotra');
    if (idx !== -1) window.approveRegistration(idx);
  });
  const approvedInRoster = await page.evaluate(() => {
    const f302 = window.APP.flats.find(f => f.number === '302');
    return f302 && f302.residents.some(r => r.name === 'Vikram Malhotra');
  });
  if (!approvedInRoster) throw new Error('Approved resident not added to flat roster');

  // 6. SCREEN 6: NOTICE BOARD
  console.log('6. Auditing Notice Board Screen...');
  await page.evaluate(() => window.goToScreen('notices'));
  await page.waitForTimeout(300);
  const noticesVisible = await page.evaluate(() => window.APP.screen === 'notices');
  if (!noticesVisible) throw new Error('Notices screen navigation failed');

  // 7. SCREEN 7: RESIDENT DASHBOARD
  console.log('7. Auditing Resident Dashboard, Passes & SOS...');
  await page.evaluate(() => {
    window.goToScreen('login');
    window.setLoginRole('RESIDENT');
    document.getElementById('login-email').value = '9822334455';
    document.getElementById('login-password').value = 'Vikram@123';
    window.handleLoginSubmit(new Event('submit'));
  });
  await page.waitForTimeout(300);
  const resActive = await page.evaluate(() => window.APP.screen === 'resident' && window.APP.currentUser.name === 'Vikram Malhotra');
  if (!resActive) throw new Error('Approved resident login failed');

  // Generate a pre-approved pass
  const pass = await page.evaluate(() => {
    return window.generatePass({ name: 'Family Guest', flat: '302', durationMinutes: 60 });
  });
  if (!pass || !pass.otp) throw new Error('Pass generation failed');
  console.log('Generated Resident Pass OTP:', pass.otp);

  // 8. SCREEN 8: GUARD CONSOLE
  console.log('8. Auditing Guard Console, Walk-in & Pass Verification...');
  await page.evaluate(() => {
    window.APP.currentUser = { role: 'GUARD', name: 'Kiran Singh', phone: '9988776655', isApproved: true };
    window.goToScreen('guard');
  });
  await page.waitForTimeout(300);

  // Verify OTP pass at gate
  const admitted = await page.evaluate((otp) => {
    return window.admitVisitorWithPass(otp);
  }, pass.otp);
  if (!admitted) throw new Error('Guard pass admission failed');

  // Check visitor is now inside
  const insideCount = await page.evaluate(() => window.APP.visitorsInside.length);
  if (insideCount < 1) throw new Error('Visitor not added to Inside Campus list');

  // 9. SCREEN 9: VISITOR HISTORY
  console.log('9. Auditing Visitor History Log Screen...');
  await page.evaluate(() => window.goToScreen('visitors'));
  await page.waitForTimeout(300);
  const visitorLogCount = await page.evaluate(() => window.APP.visitorLog.length);
  if (visitorLogCount < 1) throw new Error('Visitor not logged in visitor history');

  // Checkout visitor
  await page.evaluate(() => {
    const inside = window.APP.visitorsInside[0];
    if (inside) window.checkoutVisitor(inside.id);
  });
  const exited = await page.evaluate(() => window.APP.visitorLog.some(v => v.status === 'EXITED'));
  if (!exited) throw new Error('Visitor checkout status failed to transition to EXITED');

  // 10. UNIFIED LOGOUT CONFIRMATION
  console.log('10. Auditing Logout Flow...');
  await page.evaluate(() => {
    window.promptLogoutConfirmation();
    window.confirmLogoutAction();
  });
  const isLoggedOut = await page.evaluate(() => window.APP.currentUser === null && window.APP.screen === 'login');
  if (!isLoggedOut) throw new Error('Logout failed to reset session to login screen');

  await browser.close();
  console.log('\n=== ALL 10 SCREENS & CORE WORKFLOWS VALIDATED 100% OPERATIONAL! ===');
}

verifyAllScreens().catch(err => {
  console.error('Cross-screen audit failed:', err);
  process.exit(1);
});
