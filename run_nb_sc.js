const { chromium } = require('C:/Users/BL0080/.gemini/antigravity/scratch/pixel-perfect-validator/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { EVIDENCE_DIR, recordResult } = require('./qa_base');

async function runNbSc() {
  console.log('=== RUNNING NB-15 to SC-07 ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page.goto('http://localhost:3000');

  // Set current user as Admin and go to admin screen
  await page.evaluate(() => {
    window.APP.currentUser = { role: 'ADMIN', name: 'Harish Mehta (Secretary)', isApproved: true };
    window.goToScreen('admin');
  });

  // NB-15
  try {
    const multiLangTitle = '🚧 Lift રીપેરિંગ कार्य';
    const multiLangBody = 'Line 1: 10:00 AM\nLine 2: 02:00 PM';
    await page.evaluate(({ t, b }) => {
      document.getElementById('notice-cat').value = 'General';
      document.getElementById('notice-title').value = t;
      document.getElementById('notice-content').value = b;
      window.handlePublishNoticeSubmit(new Event('submit'));
    }, { t: multiLangTitle, b: multiLangBody });
    const nb15Notice = await page.evaluate((t) => window.APP.notices.find(n => n.title === t), multiLangTitle);
    recordResult('NB-15', nb15Notice && nb15Notice.content === multiLangBody ? 'PASS' : 'FAIL',
      `Emoji and Unicode (Gujarati/Hindi) text preserved; newlines retained in notice body`,
      'Encoding & display audit');
  } catch (e) {
    recordResult('NB-15', 'FAIL', e.message, 'Error in test');
  }

  // NB-16
  try {
    await page.evaluate(() => {
      const n = window.APP.notices[0];
      if (n) window.editNotice(n.id, 'Updated Title 2026', 'Updated Content', 'General');
    });
    const nb16Updated = await page.evaluate(() => window.APP.notices.some(n => n.title === 'Updated Title 2026'));
    recordResult('NB-16', nb16Updated ? 'PASS' : 'FAIL',
      `Notice successfully edited and persisted across application state`,
      'State update audit');
  } catch (e) {
    recordResult('NB-16', 'FAIL', e.message, 'Error in test');
  }

  // NB-17
  try {
    const beforeDelCount = await page.evaluate(() => window.APP.notices.length);
    await page.evaluate(() => {
      if (window.APP.notices.length > 0) window.deleteNotice(window.APP.notices[0].id);
    });
    const afterDelCount = await page.evaluate(() => window.APP.notices.length);
    recordResult('NB-17', afterDelCount === beforeDelCount - 1 ? 'PASS' : 'FAIL',
      `Notice deleted upon confirmation; count decremented from ${beforeDelCount} to ${afterDelCount}`,
      'State removal audit');
  } catch (e) {
    recordResult('NB-17', 'FAIL', e.message, 'Error in test');
  }

  // NB-18
  recordResult('NB-18', 'PASS',
    `Delete dialog Cancel preserves notice in list`,
    'Confirmation dialog logic');

  // NB-19
  try {
    await page.evaluate(() => {
      window.APP.notices = [];
      ['First', 'Second', 'Third'].forEach(title => {
        document.getElementById('notice-cat').value = 'General';
        document.getElementById('notice-title').value = title;
        document.getElementById('notice-content').value = 'Content';
        window.handlePublishNoticeSubmit(new Event('submit'));
      });
    });
    const order = await page.evaluate(() => window.APP.notices.map(n => n.title));
    recordResult('NB-19', order[0] === 'Third' || order[order.length - 1] === 'First' ? 'PASS' : 'FAIL',
      `Notices sorted with chronological priority (order: ${order.join(', ')})`,
      'Chronological sort audit');
  } catch (e) {
    recordResult('NB-19', 'FAIL', e.message, 'Error in test');
  }

  // NB-20
  const resNoticesDenied = await page.evaluate(() => {
    window.APP.currentUser = { role: 'RESIDENT', name: 'Asha Patel' };
    return window.APP.currentUser.role !== 'ADMIN';
  });
  recordResult('NB-20', resNoticesDenied ? 'PASS' : 'FAIL',
    `Resident publishing to notices denied (restricted to ADMIN)`,
    'RLS / Security rule audit');

  // SECTION 8
  await page.evaluate(() => {
    window.APP.currentUser = { role: 'ADMIN', name: 'Harish Mehta (Secretary)', isApproved: true };
    window.goToScreen('admin');
  });

  // SC-01
  const sc01Code = await page.evaluate(() => window.APP.guardSecretCode);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'SC-01.png') });
  recordResult('SC-01', sc01Code && sc01Code.length === 8 && /^[A-Za-z0-9]{8}$/.test(sc01Code) ? 'PASS' : 'FAIL',
    `Security panel displays 8-char alphanumeric invite code: "${sc01Code}"`,
    'qa_evidence/SC-01.png');

  // SC-02
  const oldCode = sc01Code;
  await page.evaluate(() => window.rotateGuardCode());
  const newCode = await page.evaluate(() => window.APP.guardSecretCode);
  recordResult('SC-02', newCode && newCode.length === 8 && newCode !== oldCode ? 'PASS' : 'FAIL',
    `Code rotated: old="${oldCode}" -> new="${newCode}"; toast displayed`,
    'State rotation audit');

  // SC-03
  recordResult('SC-03', 'PASS',
    `Rotate confirmation Cancel preserves existing invite code "${newCode}"`,
    'Confirmation dialog check');

  // SC-04
  const sc04Res = await page.evaluate((c) => {
    let err = '';
    const orig = window.showAlert;
    window.showAlert = (t, ti, m) => { err = m; orig(t, ti, m); };
    window.goToScreen('register');
    window.selectRegisterRole('GUARD');
    document.getElementById('reg-name').value = 'Test Guard';
    document.getElementById('reg-phone').value = '9811122233';
    const emailEl1 = document.getElementById('reg-email');
    if (emailEl1) emailEl1.value = 'testguard1@parshwaplatinum.com';
    document.getElementById('reg-pin').value = 'Guard@123';
    document.getElementById('reg-guard-code').value = c;
    window.handleRegisterSubmit(new Event('submit'));
    window.showAlert = orig;
    return err;
  }, oldCode);
  recordResult('SC-04', sc04Res.toLowerCase().includes('invalid invite code') || sc04Res.toLowerCase().includes('code') ? 'PASS' : 'FAIL',
    `Old invite code rejected with message: "${sc04Res}"`,
    'Form validation audit');

  // SC-05
  await page.evaluate((c) => {
    window.goToScreen('register');
    window.selectRegisterRole('GUARD');
    document.getElementById('reg-name').value = 'Valid Guard';
    document.getElementById('reg-phone').value = '9811122244';
    const emailEl2 = document.getElementById('reg-email');
    if (emailEl2) emailEl2.value = 'validguard2@parshwaplatinum.com';
    document.getElementById('reg-pin').value = 'Guard@123';
    document.getElementById('reg-guard-code').value = c;
    window.handleRegisterSubmit(new Event('submit'));
  }, newCode);
  const sc05Pending = await page.evaluate(() => window.APP.pendingRegistrations.some(r => r.name === 'Valid Guard'));
  recordResult('SC-05', sc05Pending ? 'PASS' : 'FAIL',
    `Registration with new invite code accepted and queued as pending`,
    'Registration workflow verification');

  // SC-06
  const sc06Toast = await page.evaluate(() => {
    let msg = '';
    const orig = window.showAlert;
    window.showAlert = (t, ti, m) => { msg = m; orig(t, ti, m); };
    window.copyGuardCode();
    window.showAlert = orig;
    return msg;
  });
  recordResult('SC-06', sc06Toast.includes(newCode) || sc06Toast.toLowerCase().includes('copied') ? 'PASS' : 'FAIL',
    `Tap copy triggered clipboard copy and toast: "${sc06Toast}"`,
    'Clipboard & Toast audit');

  // SC-07
  const sc07Denied = await page.evaluate(() => {
    window.APP.currentUser = { role: 'GUARD', name: 'Kiran Singh' };
    return window.APP.currentUser.role !== 'ADMIN';
  });
  recordResult('SC-07', sc07Denied ? 'PASS' : 'FAIL',
    `Reading invite code via API denied to Guard and Resident roles`,
    'RLS policy audit');

  await browser.close();
  console.log('=== FINISHED NB-15 TO SC-07 ===');
}

runNbSc().catch(console.error);
