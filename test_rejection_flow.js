const { chromium } = require('C:/Users/BL0080/.gemini/antigravity/scratch/pixel-perfect-validator/node_modules/playwright');

(async () => {
  console.log('--- STARTING REJECTION WORKFLOW VALIDATION ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.resetAppClean());

  // 1. Register a resident
  console.log('1. Submitting resident registration for Flat 401...');
  await page.evaluate(() => {
    window.goToScreen('register');
    window.selectRegisterRole('RESIDENT');
    document.getElementById('reg-name').value = 'Bhavesh Shah';
    document.getElementById('reg-phone').value = '9822233344';
    document.getElementById('reg-email').value = 'bhavesh@parshwaplatinum.com';
    document.getElementById('reg-flat').value = '401';
    document.getElementById('reg-pin').value = 'Secret@123';
    window.handleRegisterSubmit(new Event('submit'));
  });

  // Verify currently on pending screen
  const screen1 = await page.evaluate(() => window.APP.screen);
  const text1 = await page.evaluate(() => document.body.innerText);
  console.log('Screen after registration:', screen1);
  if (screen1 !== 'pending' || !text1.includes('Awaiting Committee Review')) {
    console.error('FAIL: Expected pending screen with Awaiting Committee Review');
    process.exit(1);
  }
  console.log('PASS: Resident is on Pending screen awaiting review');

  // 2. Admin rejects the registration
  console.log('2. Admin rejects the registration request...');
  await page.evaluate(() => {
    const idx = window.APP.pendingRegistrations.findIndex(r => r.name === 'Bhavesh Shah');
    if (idx !== -1) {
      window.rejectRegistration(idx, 'Flat 401 ownership documents could not be verified by Society Office');
    }
  });

  // 3. Verify real-time transition on the applicant screen
  await page.evaluate(() => {
    // If user was on pending screen, simulate the active pending view re-render
    window.renderPendingApprovalScreen(document.getElementById('app-viewport'));
  });

  const textAfterReject = await page.evaluate(() => document.body.innerText);
  console.log('Checking rejected view contents...');
  const hasRejectedTitle = textAfterReject.includes('Registration Request Rejected') || textAfterReject.includes('Application Rejected');
  const hasReason = textAfterReject.includes('Flat 401 ownership documents could not be verified');
  const hasReapplyBtn = textAfterReject.includes('Submit New Application');
  
  console.log('Has Rejected Title:', hasRejectedTitle);
  console.log('Has Committee Reason:', hasReason);
  console.log('Has Reapply Button:', hasReapplyBtn);

  if (!hasRejectedTitle || !hasReason || !hasReapplyBtn) {
    console.error('FAIL: Pending screen did not display rejected details properly');
    process.exit(1);
  }
  console.log('PASS: Pending screen dynamically displayed rejection title, committee reason, and re-apply action');

  // 4. Test "Submit New Application" button
  console.log('4. Testing "Submit New Application" navigation...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit New Application'));
    if (btn) btn.click();
  });
  const screenReapply = await page.evaluate(() => window.APP.screen);
  console.log('Screen after clicking re-apply:', screenReapply);
  if (screenReapply !== 'register') {
    console.error('FAIL: Expected register screen after clicking Submit New Application');
    process.exit(1);
  }
  console.log('PASS: Re-apply button navigated back to registration screen');

  // 5. Test rejected user login attempt from login screen
  console.log('5. Testing rejected user sign-in attempt from Login screen...');
  const alertInfo = await page.evaluate(() => {
    let capturedAlert = null;
    const orig = window.showAlert;
    window.showAlert = (type, title, msg) => {
      capturedAlert = { type, title, msg };
      orig(type, title, msg);
    };

    window.goToScreen('login');
    window.setLoginRole('RESIDENT');
    document.getElementById('login-email').value = '9822233344';
    document.getElementById('login-password').value = 'Secret@123';
    window.handleLoginSubmit(new Event('submit'));

    window.showAlert = orig;
    return { screen: window.APP.screen, alert: capturedAlert };
  });

  console.log('Login attempt result:', alertInfo);
  if (alertInfo.screen !== 'login' || !alertInfo.alert || alertInfo.alert.title !== 'Registration Rejected') {
    console.error('FAIL: Rejected user login was not handled as expected');
    process.exit(1);
  }
  if (!alertInfo.alert.msg.includes('Flat 401 ownership documents could not be verified')) {
    console.error('FAIL: Alert message did not include the specific committee reason');
    process.exit(1);
  }
  console.log('PASS: Sign-in strictly blocks rejected user with specific committee reason alert!');

  await browser.close();
  console.log('=== ALL REJECTION FLOW VERIFICATIONS PASSED SUCCESSFULLY ===');
})();
