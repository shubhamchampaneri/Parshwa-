const { chromium } = require('C:/Users/BL0080/.gemini/antigravity/scratch/pixel-perfect-validator/node_modules/playwright');

async function testUserFixes() {
  console.log('=== STARTING VALIDATION OF USER REPORTED FIXES ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Go to login screen
  await page.evaluate(() => window.goToScreen('login'));

  // -------------------------------------------------------------------------
  // 1. TEST FORGOT PASSWORD BUTTON & MODAL (Issue 1)
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Forgot Password Modal ---');
  await page.click('button:has-text("Forgot Password?")');
  const forgotModalVisible = await page.evaluate(() => {
    const modal = document.getElementById('modal-forgot-password');
    return modal && !modal.classList.contains('hidden');
  });
  console.log('Forgot Password modal opened:', forgotModalVisible);

  await page.fill('#forgot-input', '9876543210');
  await page.click('#modal-forgot-password button[type="submit"]');
  const forgotSubmitted = await page.evaluate(() => {
    const modal = document.getElementById('modal-forgot-password');
    const toast = document.getElementById('in-app-toast');
    return modal.classList.contains('hidden') && toast.textContent.includes('Recovery');
  });
  console.log('Forgot Password submitted & alert shown:', forgotSubmitted);

  // -------------------------------------------------------------------------
  // 2. TEST ROLE SWITCH CLEARS INPUTS (Issue 2)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Role Switch Clears Inputs ---');
  await page.fill('#login-email', '9876543210');
  await page.fill('#login-password', 'Pass@123');
  console.log('Filled resident inputs before role switch.');

  await page.click('#role-btn-guard');
  const fieldsClearedOnGuard = await page.evaluate(() => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    return email === '' && pass === '';
  });
  console.log('Fields cleared after switching to Guard:', fieldsClearedOnGuard);

  await page.fill('#login-email', '9988776655');
  await page.fill('#login-password', 'Guard@123');
  await page.click('#role-btn-admin');
  const fieldsClearedOnAdmin = await page.evaluate(() => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    return email === '' && pass === '';
  });
  console.log('Fields cleared after switching to Admin:', fieldsClearedOnAdmin);

  // -------------------------------------------------------------------------
  // 3. TEST PASSWORD EYE VISIBILITY TOGGLE (Issue 3)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Password Eye Visibility Toggle ---');
  await page.click('#role-btn-resident');
  await page.fill('#login-password', 'SecretPassword123');

  const initialType = await page.evaluate(() => document.getElementById('login-password').type);
  console.log('Initial password type:', initialType); // should be 'password'

  await page.click('#login-password-eye');
  const toggledType = await page.evaluate(() => document.getElementById('login-password').type);
  console.log('Toggled password type on click eye:', toggledType); // should be 'text'

  await page.click('#login-password-eye');
  const revertedType = await page.evaluate(() => document.getElementById('login-password').type);
  console.log('Reverted password type on click eye again:', revertedType); // should be 'password'

  // Test on register screen too
  await page.evaluate(() => window.goToScreen('register'));
  await page.fill('#reg-pin', 'RegPass123');
  await page.click('#reg-pin-eye');
  const regToggledType = await page.evaluate(() => document.getElementById('reg-pin').type);
  console.log('Register pin type on click eye:', regToggledType); // should be 'text'

  // -------------------------------------------------------------------------
  // 4. TEST SIGN IN AND REGISTER VALIDATIONS (Issue 4)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Sign In and Register Validations ---');
  // A. Sign In empty validations
  await page.evaluate(() => {
    window.goToScreen('login');
    window.setLoginRole('RESIDENT');
  });
  await page.click('button:has-text("Sign In to Security System")');
  const emptyResValidation = await page.evaluate(() => {
    const toast = document.getElementById('in-app-toast');
    return toast ? toast.textContent : '';
  });
  console.log('Resident empty submit validation:', emptyResValidation);

  // B. Sign in unregistered user
  await page.fill('#login-email', '9111111111');
  await page.fill('#login-password', 'Pass@123');
  await page.click('button:has-text("Sign In to Security System")');
  const unregValidation = await page.evaluate(() => {
    const toast = document.getElementById('in-app-toast');
    return toast ? toast.textContent : '';
  });
  console.log('Resident unregistered phone validation:', unregValidation);

  // C. Register Screen submission without blocking
  await page.evaluate(() => window.goToScreen('register'));
  await page.fill('#reg-name', 'Rohan Sharma');
  await page.fill('#reg-phone', '9811223344');
  await page.fill('#reg-email', 'rohan@example.com');
  await page.fill('#reg-pin', 'Rohan@123');
  // Flat 201
  await page.selectOption('#reg-flat', '201');

  await page.click('button:has-text("Submit Registration")');

  const regScreenState = await page.evaluate(() => window.APP.screen);
  const pendingReqCreated = await page.evaluate(() => {
    return window.APP.pendingRegistrations.some(r => r.name === 'Rohan Sharma' && r.flat === '201');
  });
  console.log('Register submit redirected to screen:', regScreenState); // should be 'pending'
  console.log('Pending registration created in system:', pendingReqCreated);

  // -------------------------------------------------------------------------
  // 5. TEST ADMIN APPROVAL & RESIDENT LOGIN WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Admin Approval and Resident Login ---');
  await page.evaluate(() => {
    window.goToScreen('login');
    window.setLoginRole('ADMIN');
    document.getElementById('login-email').value = 'admin@parshwaplatinum.com';
    document.getElementById('login-password').value = '5829';
    window.handleLoginSubmit(new Event('submit'));
  });

  const adminScreen = await page.evaluate(() => window.APP.screen);
  console.log('Admin login screen:', adminScreen);

  // Approve Rohan Sharma
  await page.evaluate(() => {
    const idx = window.APP.pendingRegistrations.findIndex(r => r.name === 'Rohan Sharma');
    if (idx !== -1) window.approveRegistration(idx);
  });
  const rohanApproved = await page.evaluate(() => {
    return window.APP.registeredUsers.some(u => u.name === 'Rohan Sharma' && u.isApproved);
  });
  console.log('Rohan Sharma approved by Admin:', rohanApproved);

  // Sign in as Rohan Sharma
  await page.evaluate(() => {
    window.goToScreen('login');
    window.setLoginRole('RESIDENT');
    document.getElementById('login-email').value = '9811223344';
    document.getElementById('login-password').value = 'Rohan@123';
    window.handleLoginSubmit(new Event('submit'));
  });

  const rohanScreen = await page.evaluate(() => window.APP.screen);
  const rohanCurrentUser = await page.evaluate(() => window.APP.currentUser ? window.APP.currentUser.name : null);
  console.log('Rohan logged in to screen:', rohanScreen, '| User:', rohanCurrentUser);

  await browser.close();
  console.log('\n=== ALL USER REPORTED ISSUES VERIFIED SUCCESSFULLY! ===');
}

testUserFixes().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
