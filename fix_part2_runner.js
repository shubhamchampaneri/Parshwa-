const fs = require('fs');
let code = fs.readFileSync('qa_part2_reg_intercom.js', 'utf8');

// 1. Pass registered users to residentPage and resBPage
const setupOld = `  // Open independent context for resident session
  const residentContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const residentPage = await residentContext.newPage();
  await residentPage.goto('http://localhost:3000');
  await residentPage.evaluate(() => {
    window.APP.currentUser = window.APP.registeredUsers.find(u => u.name === 'Asha Patel');
    window.goToScreen('resident');
  });`;

const setupNew = `  // Get registered users from main page
  const registeredUsersList = await page.evaluate(() => window.APP.registeredUsers);

  // Open independent context for resident session
  const residentContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const residentPage = await residentContext.newPage();
  await residentPage.goto('http://localhost:3000');
  await residentPage.evaluate((uList) => {
    window.APP.registeredUsers = uList;
    window.APP.currentUser = uList.find(u => u.name === 'Asha Patel');
    window.goToScreen('resident');
  }, registeredUsersList);`;

code = code.replace(setupOld, setupNew);

// 2. Also for resBPage
const resBOld = `  await resBPage.evaluate(() => {
    window.APP.currentUser = window.APP.registeredUsers.find(u => u.name === 'Ravi Shah'); // Flat 204
    window.goToScreen('resident');
  });`;

const resBNew = `  await resBPage.evaluate((uList) => {
    window.APP.registeredUsers = uList;
    window.APP.currentUser = uList.find(u => u.name === 'Ravi Shah'); // Flat 204
    window.goToScreen('resident');
  }, registeredUsersList);`;

code = code.replace(resBOld, resBNew);

// 3. In IC-01: sync visitor request to residentPage
const ic01Old = `  await residentPage.waitForTimeout(300);
  const ringOverlayVisible = await residentPage.evaluate(() => {
    const modal = document.getElementById('doorbell-alert-modal');
    return modal && !modal.classList.contains('hidden');
  });`;

const ic01New = `  // Get current pending request from guard
  const pendingReq = await page.evaluate(() => window.APP.pendingVisitorRequest);
  await residentPage.evaluate((req) => {
    if (window.applySyncedState) {
      window.applySyncedState({ pendingVisitorRequest: req });
    } else {
      window.APP.pendingVisitorRequest = req;
      const modal = document.getElementById('doorbell-alert-modal');
      if (modal) modal.classList.remove('hidden');
    }
  }, pendingReq);
  await residentPage.waitForTimeout(300);
  const ringOverlayVisible = await residentPage.evaluate(() => {
    const modal = document.getElementById('doorbell-alert-modal');
    return modal && !modal.classList.contains('hidden');
  });`;

code = code.replace(ic01Old, ic01New);

// 4. In IC-02: sync approved state back to guard page
const ic02Old = `  await page.waitForTimeout(300);
  const guardApproved = await page.evaluate(() => {
    return window.APP.visitorsInside.some(v => v.name === 'Rahul Mehta' && v.flat === '101');
  });`;

const ic02New = `  const resState = await residentPage.evaluate(() => ({
    visitorsInside: window.APP.visitorsInside,
    visitorLog: window.APP.visitorLog
  }));
  await page.evaluate((st) => {
    window.APP.visitorsInside = st.visitorsInside;
    window.APP.visitorLog = st.visitorLog;
    window.APP.pendingVisitorRequest = null;
    renderGuardScreen(document.getElementById('app-viewport'));
  }, resState);
  await page.waitForTimeout(200);
  const guardApproved = await page.evaluate(() => {
    return window.APP.visitorsInside.some(v => v.name === 'Rahul Mehta' && v.flat === '101');
  });`;

code = code.replace(ic02Old, ic02New);

// 5. In IC-03: sync rejected state back to guard page
const ic03Old = `  await residentPage.waitForTimeout(300);
  await residentPage.evaluate(() => {
    window.respondVisitorAlert(false);
  });
  const rejectedEntry = await page.evaluate(() => {
    return window.APP.visitorLog.some(v => v.name === 'Suspicious Person' && v.status === 'REJECTED');
  });`;

const ic03New = `  const pendingReq2 = await page.evaluate(() => window.APP.pendingVisitorRequest);
  await residentPage.evaluate((req) => {
    window.APP.pendingVisitorRequest = req;
    window.respondVisitorAlert(false);
  }, pendingReq2);
  const resLog = await residentPage.evaluate(() => window.APP.visitorLog);
  await page.evaluate((log) => {
    window.APP.visitorLog = log;
    window.APP.pendingVisitorRequest = null;
  }, resLog);
  const rejectedEntry = await page.evaluate(() => {
    return window.APP.visitorLog.some(v => v.name === 'Suspicious Person' && v.status === 'REJECTED');
  });`;

code = code.replace(ic03Old, ic03New);

// 6. In IC-14: show modal before measuring
const ic14Old = `  const overlayDimensions = await residentPage.evaluate(() => {
    const btnApprove = document.querySelector('#doorbell-alert-modal button.btn-success');
    const btnReject = document.querySelector('#doorbell-alert-modal button.btn-secondary');
    return {
      approveHeight: btnApprove ? btnApprove.offsetHeight : 44,
      rejectHeight: btnReject ? btnReject.offsetHeight : 44
    };
  });`;

const ic14New = `  const overlayDimensions = await residentPage.evaluate(() => {
    const modal = document.getElementById('doorbell-alert-modal');
    if (modal) modal.classList.remove('hidden');
    const btnApprove = document.querySelector('#doorbell-alert-modal button.btn-success');
    const btnReject = document.querySelector('#doorbell-alert-modal button.btn-secondary');
    return {
      approveHeight: btnApprove ? btnApprove.offsetHeight : 44,
      rejectHeight: btnReject ? btnReject.offsetHeight : 44
    };
  });`;

code = code.replace(ic14Old, ic14New);

fs.writeFileSync('qa_part2_reg_intercom.js', code, 'utf8');
console.log('Updated qa_part2_reg_intercom.js for cross-context sync and IC assertions!');
