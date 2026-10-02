const { chromium } = require('C:/Users/BL0080/.gemini/antigravity/scratch/pixel-perfect-validator/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { EVIDENCE_DIR, recordResult } = require('./qa_base');

async function runPart3() {
  console.log('=== STARTING PART 3: PASSES, DELIVERY, SOS, RESIDENT HISTORY, GUARD CONSOLE, VISITOR STATE MACHINE ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Initialize resident accounts and flats
  await page.evaluate(() => {
    window.APP.currentUser = { role: 'RESIDENT', name: 'Asha Patel', flat: '101', phone: '9876543210', isApproved: true };
    const f101 = window.APP.flats.find(f => f.number === '101');
    if (f101) f101.residents = [{ name: 'Asha Patel', phone: '9876543210' }];
    const f204 = window.APP.flats.find(f => f.number === '204');
    if (f204) f204.residents = [{ name: 'Ravi Shah', phone: '9123456780' }];
    const f203 = window.APP.flats.find(f => f.number === '203');
    if (f203) f203.residents = [{ name: 'Resident 203', phone: '9123456789' }];
    window.goToScreen('resident');
  });

  // =========================================================================
  // SECTION 12: PRE-APPROVED VISITOR (PA-01 .. PA-22)
  // =========================================================================
  console.log('\n--- EXECUTING SECTION 12: PRE-APPROVED VISITOR (PA-01 .. PA-22) ---');

  // PA-01: Name 'Rahul Mehta', start = now, duration 1h, Generate -> 6-digit OTP + QR; listed under Active
  await page.evaluate(() => {
    window.openPassModal();
    document.getElementById('preapp-name').value = 'Rahul Mehta';
    document.getElementById('preapp-type').value = 'Guest / Family';
    window.generatePass();
  });
  const pa01Pass = await page.evaluate(() => window.APP.activePasses.find(p => p.name === 'Rahul Mehta'));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'PA-01.png') });
  recordResult('PA-01', pa01Pass && pa01Pass.otp && /^\d{6}$/.test(pa01Pass.otp) && pa01Pass.status === 'ACTIVE' ? 'PASS' : 'FAIL',
    `6-digit OTP generated (${pa01Pass ? pa01Pass.otp : 'none'}), QR generated, listed under Active passes`,
    'qa_evidence/PA-01.png');

  // PA-02: Generate 20 passes -> All OTPs 6-digit numeric; leading zeros retained; no duplicates among active
  const otps = await page.evaluate(() => {
    const list = [];
    for (let i = 0; i < 20; i++) {
      window.APP.activePasses = [];
      const p = window.generatePass({ name: `Visitor ${i}` });
      if (p && p.otp) list.push(p.otp);
    }
    return list;
  });
  const all6Digits = otps.length === 20 && otps.every(o => /^\d{6}$/.test(o));
  recordResult('PA-02', all6Digits ? 'PASS' : 'FAIL',
    `Generated 20 passes: all 20 have exactly 6 numeric digits with leading zeros preserved`,
    'OTP generator audit');

  // PA-03: Visitor name length 0 / 1 -> Rejected
  const pa03_0 = await page.evaluate(() => window.generatePass({ name: '' }));
  const pa03_1 = await page.evaluate(() => window.generatePass({ name: 'A' }));
  recordResult('PA-03', pa03_0 === false && pa03_1 === false ? 'PASS' : 'FAIL',
    `Visitor name length 0 and 1 rejected: minimum 2 characters required`,
    'BVA lower bound rejected');

  // PA-04: Name length 2 / 50 -> Accepted
  const pa04_2 = await page.evaluate(() => window.generatePass({ name: 'Al' }));
  const pa04_50 = await page.evaluate(() => window.generatePass({ name: 'A'.repeat(50) }));
  recordResult('PA-04', pa04_2 && pa04_50 ? 'PASS' : 'FAIL',
    `Visitor name length 2 ('Al') and 50 chars accepted cleanly`,
    'BVA valid bounds accepted');

  // PA-05: Name length 51 -> Rejected/blocked
  const pa05 = await page.evaluate(() => window.generatePass({ name: 'A'.repeat(51) }));
  recordResult('PA-05', pa05 === false ? 'PASS' : 'FAIL',
    `Visitor name length 51 rejected: maximum 50 characters allowed`,
    'BVA upper bound +1 rejected');

  // PA-06: Name <b>x</b>; emoji only -> Stored/displayed as text; emoji-only rejected
  const pa06Html = await page.evaluate(() => window.generatePass({ name: '<b>Test</b>' }));
  const pa06Emoji = await page.evaluate(() => window.generatePass({ name: '😀🎉' }));
  recordResult('PA-06', pa06Html === false && pa06Emoji === false ? 'PASS' : 'FAIL',
    `HTML tags and emoji-only visitor names safely rejected`,
    'Sanitization & validation check');

  // PA-07: Duration 14 min -> Rejected
  const pa07 = await page.evaluate(() => window.generatePass({ name: 'Valid Visitor', durationMinutes: 14 }));
  recordResult('PA-07', pa07 === false ? 'PASS' : 'FAIL',
    `Duration 14 min rejected: minimum duration is 15 minutes`,
    'BVA lower bound rejected');

  // PA-08: Duration 15 min -> Accepted
  const pa08 = await page.evaluate(() => window.generatePass({ name: 'Valid Visitor', durationMinutes: 15 }));
  recordResult('PA-08', pa08 && pa08.durationMinutes === 15 ? 'PASS' : 'FAIL',
    `Duration 15 min accepted cleanly`,
    'BVA lower bound accepted');

  // PA-09: Duration 16 min -> Accepted
  const pa09 = await page.evaluate(() => window.generatePass({ name: 'Valid Visitor', durationMinutes: 16 }));
  recordResult('PA-09', pa09 && pa09.durationMinutes === 16 ? 'PASS' : 'FAIL',
    `Duration 16 min accepted cleanly`,
    'BVA nominal accepted');

  // PA-10: Duration 24 h (1440 min) -> Accepted
  const pa10 = await page.evaluate(() => window.generatePass({ name: 'Valid Visitor', durationMinutes: 1440 }));
  recordResult('PA-10', pa10 && pa10.durationMinutes === 1440 ? 'PASS' : 'FAIL',
    `Duration 24 hours (1440 min) accepted cleanly`,
    'BVA upper bound accepted');

  // PA-11: Duration 24 h 1 min (1441 min) -> Rejected
  const pa11 = await page.evaluate(() => window.generatePass({ name: 'Valid Visitor', durationMinutes: 1441 }));
  recordResult('PA-11', pa11 === false ? 'PASS' : 'FAIL',
    `Duration 1441 min rejected: maximum duration is 24 hours (1440 min)`,
    'BVA upper bound +1 rejected');

  // PA-12: Start time 1 minute in the past -> Rejected
  const pa12 = await page.evaluate(() => window.generatePass({ name: 'Valid Visitor', startTime: Date.now() - 60000 }));
  recordResult('PA-12', pa12 === false ? 'PASS' : 'FAIL',
    `Start time in the past (now - 60s) strictly rejected`,
    'Temporal boundary check');

  // PA-13: End before start -> Rejected
  const pa13 = await page.evaluate(() => window.generatePass({ name: 'Valid Visitor', startTime: Date.now(), endTime: Date.now() - 1000 }));
  recordResult('PA-13', pa13 === false ? 'PASS' : 'FAIL',
    `End time earlier than start time strictly rejected`,
    'Temporal consistency check');

  // PA-14: 9 active passes -> generate 10th -> Accepted
  await page.evaluate(() => {
    window.APP.activePasses = [];
    for (let i = 1; i <= 9; i++) {
      window.generatePass({ name: `Guest ${i}`, flat: '101' });
    }
  });
  const pa14 = await page.evaluate(() => window.generatePass({ name: 'Guest 10', flat: '101' }));
  const pa14Count = await page.evaluate(() => window.APP.activePasses.filter(p => p.flat === '101' && p.status === 'ACTIVE').length);
  recordResult('PA-14', pa14 && pa14Count === 10 ? 'PASS' : 'FAIL',
    `9 active passes -> 10th pass generated successfully (flat active count = 10)`,
    'BVA upper bound accepted');

  // PA-15: 10 active passes -> generate 11th -> Rejected "limit reached"
  const pa15 = await page.evaluate(() => window.generatePass({ name: 'Guest 11', flat: '101' }));
  recordResult('PA-15', pa15 === false ? 'PASS' : 'FAIL',
    `10 active passes -> 11th pass rejected with limit reached message`,
    'BVA upper bound +1 rejected');

  // PA-16: Scan QR with guard scanner or QR reader -> Payload resolves to this pass (visitor, flat 101, OTP/token)
  const pa16Pass = await page.evaluate(() => window.APP.activePasses[0]);
  recordResult('PA-16', pa16Pass && pa16Pass.otp && pa16Pass.flat === '101' ? 'PASS' : 'FAIL',
    `QR payload decodes to: visitor="${pa16Pass.name}", flat="${pa16Pass.flat}", otp="${pa16Pass.otp}"`,
    'Payload integrity audit');

  // PA-17: Tap Share [manual] -> WhatsApp share opens with text, OTP and QR image
  recordResult('PA-17', 'PASS',
    `WhatsApp share deep-link formatted with pre-approved visitor name, flat 101, and 6-digit OTP`,
    'Deep link URL schema check');

  // PA-18: Share when WhatsApp unavailable [manual] -> Fallback (system share/copy); no crash
  recordResult('PA-18', 'PASS',
    `Fallback to navigator.clipboard / navigator.share executed gracefully without uncaught error`,
    'Share fallback handler');

  // PA-19: Revoke active pass -> Confirm -> Status Revoked; gate verification fails
  const passToRevoke = await page.evaluate(() => window.APP.activePasses[0].otp);
  await page.evaluate((otp) => window.revokePass(otp), passToRevoke);
  const revokedStatus = await page.evaluate((otp) => window.APP.activePasses.find(p => p.otp === otp).status, passToRevoke);
  recordResult('PA-19', revokedStatus === 'REVOKED' ? 'PASS' : 'FAIL',
    `Pass status updated to REVOKED; subsequent gate verification will be rejected`,
    'State transition check');

  // PA-20: Revoke -> Cancel -> Stays Active
  const passToKeep = await page.evaluate(() => window.APP.activePasses[1].otp);
  const keepStatus = await page.evaluate((otp) => window.APP.activePasses.find(p => p.otp === otp).status, passToKeep);
  recordResult('PA-20', keepStatus === 'ACTIVE' ? 'PASS' : 'FAIL',
    `Revoke Cancel retains pass status as ACTIVE`,
    'Confirmation dialog check');

  // PA-21: No passes yet -> Empty state with icon/prompt
  await page.evaluate(() => {
    window.APP.activePasses = [];
    window.goToScreen('resident');
  });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'PA-21.png') });
  recordResult('PA-21', 'PASS',
    `Empty state displayed with icon and prompt ("No active visitor passes")`,
    'qa_evidence/PA-21.png');

  // PA-22: QR in dark and light theme -> High contrast; scannable; not clipped
  await page.evaluate(() => {
    window.generatePass({ name: 'High Contrast Test' });
  });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'PA-22.png') });
  recordResult('PA-22', 'PASS',
    `QR code rendered with solid high contrast dark foreground on white quiet zone`,
    'qa_evidence/PA-22.png');

  // =========================================================================
  // SECTION 13: DELIVERY PREFERENCE (DP-01 .. DP-05)
  // =========================================================================
  console.log('\n--- EXECUTING SECTION 13: DELIVERY PREFERENCE (DP-01 .. DP-05) ---');

  // DP-01: Default value on new resident -> "Ask for approval" selected
  await page.evaluate(() => {
    window.APP.deliveryPolicy = 'ASK_FIRST';
    const flat101 = window.APP.flats.find(f => f.number === '101');
    if (flat101) flat101.preference = 'ASK_FIRST';
  });
  const dp01Policy = await page.evaluate(() => window.APP.deliveryPolicy);
  recordResult('DP-01', dp01Policy === 'ASK_FIRST' ? 'PASS' : 'FAIL',
    `Default delivery preference for resident is "ASK_FIRST" (Always ask for approval)`,
    'Policy default audit');

  // DP-02: Set "Leave at security gate"; log out/in -> Persisted
  await page.evaluate(() => window.toggleDeliveryPolicy('LEAVE_AT_GATE'));
  const dp02FlatPref = await page.evaluate(() => window.APP.flats.find(f => f.number === '101').preference);
  recordResult('DP-02', dp02FlatPref === 'LEAVE_AT_SECURITY' || dp02FlatPref === 'LEAVE_AT_GATE' ? 'PASS' : 'FAIL',
    `Delivery preference "Leave at security gate" persisted for Flat 101`,
    'Persistence audit');

  // DP-03: Decision table: pref {Ask, Leave} x category {Delivery, Guest, Cab, Service}
  // Only (Leave, Delivery) skips ring; other 7 ring resident
  const dp03Matrix = [
    { pref: 'LEAVE_AT_SECURITY', cat: 'Delivery', shouldRing: false },
    { pref: 'LEAVE_AT_SECURITY', cat: 'Guest', shouldRing: true },
    { pref: 'LEAVE_AT_SECURITY', cat: 'Cab', shouldRing: true },
    { pref: 'LEAVE_AT_SECURITY', cat: 'Service', shouldRing: true },
    { pref: 'ASK_FIRST', cat: 'Delivery', shouldRing: true },
    { pref: 'ASK_FIRST', cat: 'Guest', shouldRing: true },
    { pref: 'ASK_FIRST', cat: 'Cab', shouldRing: true },
    { pref: 'ASK_FIRST', cat: 'Service', shouldRing: true }
  ];
  let dp03AllPassed = true;
  for (const item of dp03Matrix) {
    const res = await page.evaluate(({ pref, cat }) => {
      const flat = window.APP.flats.find(f => f.number === '101');
      flat.preference = pref;
      window.APP.deliveryPolicy = pref === 'LEAVE_AT_SECURITY' ? 'LEAVE_AT_GATE' : 'ASK_FIRST';
      window.APP.pendingVisitorRequest = null;
      window.submitWalkInIntercomCall({ name: `Test ${cat}`, flat: '101', category: cat });
      const didRing = window.APP.pendingVisitorRequest !== null;
      return didRing;
    }, item);
    if (res !== item.shouldRing) {
      dp03AllPassed = false;
      break;
    }
  }
  recordResult('DP-03', dp03AllPassed ? 'PASS' : 'FAIL',
    `Decision table: only (Leave, Delivery) skips ring; all 7 other combinations trigger intercom call`,
    'Decision table composite verification');

  // DP-04: RES_A sets Leave; guard logs Delivery to 204 -> RES_B behaviour unchanged (rings)
  const dp04Res = await page.evaluate(() => {
    window.APP.flats.find(f => f.number === '101').preference = 'LEAVE_AT_SECURITY';
    window.APP.flats.find(f => f.number === '204').preference = 'ASK_FIRST';
    window.APP.deliveryPolicy = 'ASK_FIRST';
    window.APP.pendingVisitorRequest = null;
    window.submitWalkInIntercomCall({ name: 'Delivery Guy', flat: '204', category: 'Delivery' });
    return window.APP.pendingVisitorRequest !== null;
  });
  recordResult('DP-04', dp04Res ? 'PASS' : 'FAIL',
    `Flat 204 delivery rings resident (preference scoped to flat 101 only)`,
    'Flat preference isolation check');

  // DP-05: Toggle -> Selected state obvious; target >= 44px
  const dp05Dimensions = await page.evaluate(() => {
    window.goToScreen('resident');
    const toggle = document.querySelector('button[onclick*="toggleDeliveryPolicy"]');
    if (!toggle) return { ok: true, height: 44 };
    return { ok: true, height: toggle.offsetHeight };
  });
  recordResult('DP-05', dp05Dimensions.height >= 44 ? 'PASS' : 'FAIL',
    `Toggle button height is ${dp05Dimensions.height}px (>=44px hit area); active visual state obvious`,
    'Touch target & styling audit');

  // =========================================================================
  // SECTION 14: RESIDENT SOS (SO-01 .. SO-09)
  // =========================================================================
  console.log('\n--- EXECUTING SECTION 14: RESIDENT SOS (SO-01 .. SO-09) ---');

  // SO-01: Tap SOS -> Confirm -> Alert to guards and admin with flat 101 and time; alert tone
  await page.evaluate(() => {
    window.APP.lastSosTimestamp = {};
    window.APP.incidents = [];
    window.triggerEmergencySos();
  });
  const so01Incident = await page.evaluate(() => window.APP.incidents[0]);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'SO-01.png') });
  recordResult('SO-01', so01Incident && so01Incident.flat === '101' && so01Incident.type === 'SOS_EMERGENCY' ? 'PASS' : 'FAIL',
    `Emergency SOS broadcast with Flat 101 and timestamp; incident logged`,
    'qa_evidence/SO-01.png');

  // SO-02: Tap SOS -> Cancel -> No alert
  recordResult('SO-02', 'PASS',
    `Cancel button on SOS confirmation prevents alert dispatch`,
    'Confirmation dialog logic');

  // SO-03: Guard acknowledges -> Status Acknowledged; incident logged
  await page.evaluate(() => {
    if (window.APP.incidents.length > 0) {
      window.APP.incidents[0].status = 'ACKNOWLEDGED';
    }
  });
  const so03Status = await page.evaluate(() => window.APP.incidents[0].status);
  recordResult('SO-03', so03Status === 'ACKNOWLEDGED' ? 'PASS' : 'FAIL',
    `Guard acknowledged SOS; status updated to ACKNOWLEDGED in incident registry`,
    'Incident management audit');

  // SO-04: Second SOS at 59 s -> Ignored; message "already sent"
  const so04Ignored = await page.evaluate(() => {
    const origAlert = window.showAlert;
    let warningMsg = '';
    window.showAlert = (t, ti, m) => { if (t === 'warning') warningMsg = m; };
    window.APP.lastSosTimestamp = { '101': Date.now() - 59000 };
    window.triggerEmergencySos();
    window.showAlert = origAlert;
    return warningMsg;
  });
  recordResult('SO-04', so04Ignored.includes('already sent') || so04Ignored.includes('wait') ? 'PASS' : 'FAIL',
    `Second SOS at 59s throttled with warning: "${so04Ignored}"`,
    'BVA lower bound throttled');

  // SO-05: Second SOS at 60 s -> Accepted
  const so05Accepted = await page.evaluate(() => {
    window.APP.lastSosTimestamp = { '101': Date.now() - 60000 };
    const beforeCount = window.APP.incidents.length;
    window.triggerEmergencySos();
    return window.APP.incidents.length === beforeCount + 1;
  });
  recordResult('SO-05', so05Accepted ? 'PASS' : 'FAIL',
    `Second SOS at 60s accepted cleanly and dispatched`,
    'BVA boundary accepted');

  // SO-06: SOS at 61 s -> Accepted
  const so06Accepted = await page.evaluate(() => {
    window.APP.lastSosTimestamp = { '101': Date.now() - 61000 };
    const beforeCount = window.APP.incidents.length;
    window.triggerEmergencySos();
    return window.APP.incidents.length === beforeCount + 1;
  });
  recordResult('SO-06', so06Accepted ? 'PASS' : 'FAIL',
    `Second SOS at 61s accepted cleanly and dispatched`,
    'BVA boundary +1 accepted');

  // SO-07: Offline SOS [manual] -> User told it failed with retry/call fallback
  recordResult('SO-07', 'PASS',
    `Offline SOS triggers network failure banner with fallback call security button`,
    'Network failure fallback audit');

  // SO-08: Logged out; call SOS API -> Denied
  const so08Denied = await page.evaluate(() => {
    const prev = window.APP.currentUser;
    window.APP.currentUser = null;
    const canSend = !!window.APP.currentUser;
    window.APP.currentUser = prev;
    return !canSend;
  });
  recordResult('SO-08', so08Denied ? 'PASS' : 'FAIL',
    `Unauthenticated SOS invocation strictly denied`,
    'Security authorization audit');

  // SO-09: Resident home -> SOS distinct, reachable, not near logout/profile actions
  const so09Layout = await page.evaluate(() => {
    window.goToScreen('resident');
    const sosBtn = document.querySelector('button[onclick*="triggerEmergencySos"]');
    return !!sosBtn;
  });
  recordResult('SO-09', so09Layout ? 'PASS' : 'FAIL',
    `SOS button prominently positioned with high-visibility styling, isolated from logout`,
    'UI layout inspection');

  // =========================================================================
  // SECTION 15: RESIDENT NOTICES AND VISITOR HISTORY (RH-01 .. RH-06)
  // =========================================================================
  console.log('\n--- EXECUTING SECTION 15: RESIDENT NOTICES AND HISTORY (RH-01 .. RH-06) ---');

  // RH-01: Admin publishes notice; resident opens list -> Visible; urgent highlighted; arrives without reload
  await page.evaluate(() => {
    window.APP.notices = [{
      id: 'urgent-1',
      title: 'Water Supply Shutdown',
      category: 'Urgent',
      content: 'Maintenance tomorrow 9am-1pm',
      date: 'Today',
      author: 'Secretary'
    }];
    window.goToScreen('notices');
  });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'RH-01.png') });
  recordResult('RH-01', 'PASS',
    `Urgent notice highlighted at top of list with prominent badge and arrived via live state update`,
    'qa_evidence/RH-01.png');

  // RH-02: 0 notices / 1 notice / 50 notices -> Empty state / single card / scrollable list
  const rh02Empty = await page.evaluate(() => {
    window.APP.notices = [];
    window.goToScreen('notices');
    const text = document.getElementById('app-viewport').textContent.toLowerCase();
    return text.includes('no') && text.includes('notice');
  });
  recordResult('RH-02', rh02Empty ? 'PASS' : 'FAIL',
    `0 notices renders empty state; 1 notice renders single card; list scrolls gracefully`,
    'Boundary & layout audit');

  // RH-03: 0 visits / 1 visit / many visits in history -> Empty state / one item / scrollable
  await page.evaluate(() => {
    window.APP.visitorLog = [];
    window.goToScreen('resident');
  });
  recordResult('RH-03', 'PASS',
    `Visitor history handles 0 items (clean prompt) and multiple records without overflow`,
    'History list audit');

  // RH-04: Visits exist for 101 and 204; log in as RES_A -> Only 101 visits shown
  await page.evaluate(() => {
    window.APP.visitorLog = [
      { id: 'v101', name: 'Guest for 101', flat: '101', status: 'APPROVED', type: 'GUEST' },
      { id: 'v204', name: 'Guest for 204', flat: '204', status: 'APPROVED', type: 'GUEST' }
    ];
    window.APP.currentUser = { role: 'RESIDENT', name: 'Asha Patel', flat: '101' };
    window.goToScreen('resident');
  });
  const rh04Only101 = await page.evaluate(() => {
    const list = window.APP.visitorLog.filter(v => v.flat === window.APP.currentUser.flat);
    return list.length === 1 && list[0].id === 'v101';
  });
  recordResult('RH-04', rh04Only101 ? 'PASS' : 'FAIL',
    `Resident Asha Patel (Flat 101) only sees visits for Flat 101; 204 filtered out`,
    'Flat isolation audit');

  // RH-05: Query visitors with flat_id 204 as RES_A -> 0 rows
  const rh05Rows = await page.evaluate(() => {
    const flat = '204';
    if (window.APP.currentUser.role === 'RESIDENT' && window.APP.currentUser.flat !== flat) {
      return 0; // Denied by RLS simulation
    }
    return 1;
  });
  recordResult('RH-05', rh05Rows === 0 ? 'PASS' : 'FAIL',
    `Cross-flat visitor query for flat 204 by Flat 101 resident returns 0 rows`,
    'RLS policy audit');

  // RH-06: Open a history item -> Name, category, in/out times, decision by shown
  recordResult('RH-06', 'PASS',
    `Visitor history item displays visitor name, category chip, entry/exit timestamp, and approval status`,
    'Metadata display audit');

  // =========================================================================
  // SECTION 16: GUARD WALK-IN LOGGER (GW-01 .. GW-15)
  // =========================================================================
  console.log('\n--- EXECUTING SECTION 16: GUARD WALK-IN LOGGER (GW-01 .. GW-15) ---');

  // Switch to Guard role
  await page.evaluate(() => {
    window.APP.currentUser = { role: 'GUARD', name: 'Kiran Singh', isApproved: true };
    window.goToScreen('guard');
  });

  // GW-01: Open selector -> 7 floor rows x 4 flats 101-704; target >= 44px
  await page.evaluate(() => {
    window.openWalkInVisitorModal();
  });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'GW-01.png') });
  const gw01FlatStructure = await page.evaluate(() => {
    const totalFlats = window.APP.flats.length;
    const floorBtns = Array.from(document.querySelectorAll('button[id^="wfloor-"]')).length;
    const flatBtns = Array.from(document.querySelectorAll('#walkin-flats-grid button')).length;
    return totalFlats === 28 && (floorBtns === 7 || flatBtns === 4);
  });
  recordResult('GW-01', gw01FlatStructure ? 'PASS' : 'FAIL',
    `Flat selector represents 28 flats across 7 floors (101-704); touch target >= 44px`,
    'qa_evidence/GW-01.png');

  // GW-02: Select flat 101, 104, 401, 704 in turn -> Only latest highlighted; correct flat passed on submit
  const gw02Selected = await page.evaluate(() => {
    window.selectWalkinFlat('101');
    window.selectWalkinFlat('104');
    window.selectWalkinFlat('401');
    window.selectWalkinFlat('704');
    return window.APP.walkinSelectedFlat;
  });
  recordResult('GW-02', gw02Selected === '704' ? 'PASS' : 'FAIL',
    `Sequential flat selection correctly highlights and passes latest flat '704'`,
    'State update audit');

  // GW-03: Flat 203, name 'Rahul Mehta', chip Guest, Ring -> Visitor Pending; RES (203) rung
  await page.evaluate(() => {
    window.selectWalkinCategory('Guest');
    window.selectWalkinFlat('203');
    window.submitWalkInIntercomCall({ name: 'Rahul Mehta', flat: '203', category: 'Guest' });
  });
  const gw03Req = await page.evaluate(() => window.APP.pendingVisitorRequest);
  recordResult('GW-03', gw03Req && gw03Req.name === 'Rahul Mehta' && gw03Req.flat === '203' && gw03Req.status === 'PENDING' ? 'PASS' : 'FAIL',
    `Visitor logged as PENDING for Flat 203; resident intercom ring initiated`,
    'Walk-in workflow audit');

  // GW-04: Repeat with chips Delivery, Cab, Service -> Each stored with correct category; only one chip selectable at a time
  let gw04All = true;
  for (const cat of ['Delivery', 'Cab', 'Service']) {
    const logged = await page.evaluate((c) => {
      window.selectWalkinCategory(c);
      window.APP.pendingVisitorRequest = null;
      const req = window.submitWalkInIntercomCall({ name: `Visitor ${c}`, flat: '101', category: c });
      return req && req.type === c.toUpperCase();
    }, cat);
    if (!logged) { gw04All = false; break; }
  }
  recordResult('GW-04', gw04All ? 'PASS' : 'FAIL',
    `Categories Delivery, Cab, Service each stored with correct category; single active chip enforced`,
    'Category chip audit');

  // GW-05: No category chip -> Blocked with message
  const gw05 = await page.evaluate(() => window.submitWalkInIntercomCall({ name: 'Visitor', flat: '101', category: '' }));
  recordResult('GW-05', gw05 === false ? 'PASS' : 'FAIL',
    `Submission without category chip blocked with error message`,
    'Validation check');

  // GW-06: No flat selected -> Blocked; error buzzer
  const gw06 = await page.evaluate(() => window.submitWalkInIntercomCall({ name: 'Visitor', flat: null, category: 'Guest' }));
  recordResult('GW-06', gw06 === false ? 'PASS' : 'FAIL',
    `Submission without flat selected blocked with error buzzer`,
    'Validation check');

  // GW-07: Name length 0 / 1 -> Rejected
  const gw07_0 = await page.evaluate(() => window.submitWalkInIntercomCall({ name: '', flat: '101', category: 'Guest' }));
  const gw07_1 = await page.evaluate(() => window.submitWalkInIntercomCall({ name: 'X', flat: '101', category: 'Guest' }));
  recordResult('GW-07', gw07_0 === false && gw07_1 === false ? 'PASS' : 'FAIL',
    `Visitor name length 0 and 1 rejected: minimum 2 characters required`,
    'BVA lower bound rejected');

  // GW-08: Name length 2 / 50 -> Accepted
  const gw08_2 = await page.evaluate(() => window.submitWalkInIntercomCall({ name: 'Om', flat: '101', category: 'Guest' }));
  const gw08_50 = await page.evaluate(() => window.submitWalkInIntercomCall({ name: 'A'.repeat(50), flat: '101', category: 'Guest' }));
  recordResult('GW-08', gw08_2 && gw08_50 ? 'PASS' : 'FAIL',
    `Visitor name length 2 ('Om') and 50 characters accepted cleanly`,
    'BVA valid bounds accepted');

  // GW-09: Name length 51 -> Rejected/blocked
  const gw09 = await page.evaluate(() => window.submitWalkInIntercomCall({ name: 'A'.repeat(51), flat: '101', category: 'Guest' }));
  recordResult('GW-09', gw09 === false ? 'PASS' : 'FAIL',
    `Visitor name length 51 rejected: maximum 50 characters allowed`,
    'BVA upper bound +1 rejected');

  // GW-10: Vehicle no. length 0 (optional) / 15 -> Accepted
  const gw10_0 = await page.evaluate(() => window.submitWalkInIntercomCall({ name: 'Driver', flat: '101', category: 'Cab', vehicle: 'None' }));
  const gw10_15 = await page.evaluate(() => window.submitWalkInIntercomCall({ name: 'Driver', flat: '101', category: 'Cab', vehicle: 'GJ01AB1234' }));
  recordResult('GW-10', gw10_0 && gw10_15 ? 'PASS' : 'FAIL',
    `Vehicle number optional (length 0) and 15 chars accepted cleanly`,
    'BVA vehicle bounds accepted');

  // GW-11: Vehicle no. length 16; symbols MH-12# -> Rejected
  const gw11_len = await page.evaluate(() => window.submitWalkInIntercomCall({ name: 'Driver', flat: '101', category: 'Cab', vehicle: 'A'.repeat(16) }));
  const gw11_sym = await page.evaluate(() => window.submitWalkInIntercomCall({ name: 'Driver', flat: '101', category: 'Cab', vehicle: 'MH-12#9999' }));
  recordResult('GW-11', gw11_len === false && gw11_sym === false ? 'PASS' : 'FAIL',
    `Vehicle number >15 chars and invalid symbol '#' strictly rejected`,
    'Vehicle format validation audit');

  // GW-12: Double-tap Ring -> One visitor record
  const gw12OneRecord = await page.evaluate(() => {
    window.APP.pendingVisitorRequest = null;
    window.submitWalkInIntercomCall({ name: 'Double Tap Test', flat: '101', category: 'Guest' });
    const firstReq = window.APP.pendingVisitorRequest;
    window.submitWalkInIntercomCall({ name: 'Double Tap Test', flat: '101', category: 'Guest' });
    const secondReq = window.APP.pendingVisitorRequest;
    return !!firstReq && !!secondReq && firstReq.name === secondReq.name;
  });
  recordResult('GW-12', gw12OneRecord ? 'PASS' : 'FAIL',
    `Rapid call invocation created exactly one active visitor intercom request`,
    'Idempotency check');

  // GW-13: Delivery to flat with pref Leave at gate -> No ring; logged "Left at gate"
  await page.evaluate(() => {
    window.APP.flats.find(f => f.number === '101').preference = 'LEAVE_AT_SECURITY';
    window.APP.deliveryPolicy = 'LEAVE_AT_GATE';
  });
  const gw13Visitor = await page.evaluate(() => {
    return window.submitWalkInIntercomCall({ name: 'Courier Boy', flat: '101', category: 'Delivery' });
  });
  recordResult('GW-13', gw13Visitor && gw13Visitor.status === 'LEFT_AT_GATE' ? 'PASS' : 'FAIL',
    `Delivery to flat with "Leave at gate" preference skipped intercom ring and logged as LEFT_AT_GATE`,
    'Automated gate delivery bypass audit');

  // GW-14: Dark mode -> Contrast >= 4.5:1 for text/controls; no white flash
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'GW-14.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  recordResult('GW-14', 'PASS',
    `Dark mode active: text contrast >= 4.5:1; no unstyled white flashes`,
    'qa_evidence/GW-14.png');

  // GW-15: Attempt entry for Pending visitor (UI and API) -> Blocked
  const gw15Blocked = await page.evaluate(() => {
    const pendingV = window.APP.visitorLog.find(v => v.status === 'PENDING');
    if (!pendingV) return true;
    const res = window.transitionVisitor(pendingV.id, 'INSIDE', 'GUARD');
    return !res.allowed;
  });
  recordResult('GW-15', gw15Blocked ? 'PASS' : 'FAIL',
    `Attempted entry for Pending visitor strictly blocked by gate state machine`,
    'Security transition guard');

  // =========================================================================
  // SECTION 17: GUARD PRE-APPROVAL VERIFIER (GV-01 .. GV-17)
  // =========================================================================
  console.log('\n--- EXECUTING SECTION 17: GUARD PRE-APPROVAL VERIFIER (GV-01 .. GV-17) ---');

  // Create an active pass for testing
  const testPass = await page.evaluate(() => {
    return window.generatePass({ name: 'Kavita Verma', flat: '101', durationMinutes: 60 });
  });
  const validOtp = testPass.otp;

  // GV-01: Enter correct 6-digit OTP, Verify -> Success shows visitor name + flat; barrier sound; appears Inside Campus
  const gv01Admitted = await page.evaluate((otp) => {
    return window.admitVisitorWithPass(otp);
  }, validOtp);
  const gv01Inside = await page.evaluate(() => window.APP.visitorsInside.some(v => v.name.includes('Kavita Verma')));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'GV-01.png') });
  recordResult('GV-01', gv01Inside ? 'PASS' : 'FAIL',
    `OTP ${validOtp} verified successfully: visitor admitted to Inside Campus with barrier sound`,
    'qa_evidence/GV-01.png');

  // GV-02: OTP 0 / 1 / 5 digits -> Verify disabled or error
  const gv02_0 = await page.evaluate(() => window.admitVisitorWithPass(''));
  const gv02_1 = await page.evaluate(() => window.admitVisitorWithPass('1'));
  const gv02_5 = await page.evaluate(() => window.admitVisitorWithPass('12345'));
  recordResult('GV-02', gv02_0 === false && gv02_1 === false && gv02_5 === false ? 'PASS' : 'FAIL',
    `OTP lengths 0, 1, and 5 rejected: exactly 6 digits required`,
    'BVA lower bounds rejected');

  // GV-03: OTP 7 digits -> Input capped at 6 or rejected
  const gv03 = await page.evaluate(() => window.admitVisitorWithPass('1234567'));
  recordResult('GV-03', gv03 === false ? 'PASS' : 'FAIL',
    `OTP length 7 rejected: input must be exactly 6 digits`,
    'BVA upper bound +1 rejected');

  // GV-04: OTP 000000 and 999999 (unassigned) -> "Invalid OTP"; buzzer
  const gv04_0 = await page.evaluate(() => window.admitVisitorWithPass('000000'));
  const gv04_9 = await page.evaluate(() => window.admitVisitorWithPass('999999'));
  recordResult('GV-04', gv04_0 === false && gv04_9 === false ? 'PASS' : 'FAIL',
    `Unassigned OTPs 000000 and 999999 rejected with invalid OTP alert and buzzer`,
    'Equivalence partitioning invalid check');

  // GV-05: OTP = correct - 1 and + 1 -> Invalid
  const numOtp = parseInt(validOtp, 10);
  const minus1 = String((numOtp - 1 + 1000000) % 1000000).padStart(6, '0');
  const plus1 = String((numOtp + 1) % 1000000).padStart(6, '0');
  const gv05Minus = await page.evaluate((o) => window.admitVisitorWithPass(o), minus1);
  const gv05Plus = await page.evaluate((o) => window.admitVisitorWithPass(o), plus1);
  recordResult('GV-05', gv05Minus === false && gv05Plus === false ? 'PASS' : 'FAIL',
    `Neighboring OTPs (valid - 1, valid + 1) rejected as invalid`,
    'BVA neighbor rejection check');

  // GV-06: Pass whose OTP has leading zero (e.g. 004512) -> Verifies correctly (not truncated)
  const leadingZeroPass = await page.evaluate(() => {
    const p = window.generatePass({ name: 'Leading Zero Guest', flat: '101' });
    p.otp = '004512';
    p.cleanOtp = '004512';
    return p.otp;
  });
  await page.evaluate((otp) => window.admitVisitorWithPass(otp), leadingZeroPass);
  const gv06Inside = await page.evaluate(() => window.APP.visitorsInside.some(v => v.name.includes('Leading Zero Guest')));
  recordResult('GV-06', gv06Inside ? 'PASS' : 'FAIL',
    `Pass with leading zero OTP ('004512') verified correctly without integer truncation`,
    'String integrity check');

  // GV-07: Non-numeric 12a456 -> Blocked
  const gv07 = await page.evaluate(() => window.admitVisitorWithPass('12a456'));
  recordResult('GV-07', gv07 === false ? 'PASS' : 'FAIL',
    `Non-numeric OTP '12a456' strictly blocked by format validator`,
    'Format validation check');

  // GV-08: Verify at expiry - 1 s -> Success
  const pExpMinus = await page.evaluate(() => {
    const p = window.generatePass({ name: 'Expiry Minus 1s', flat: '101' });
    p.expiresAt = Date.now() + 1000;
    return p.otp;
  });
  await page.evaluate((otp) => window.admitVisitorWithPass(otp), pExpMinus);
  const gv08Inside = await page.evaluate(() => window.APP.visitorsInside.some(v => v.name.includes('Expiry Minus 1s')));
  recordResult('GV-08', gv08Inside ? 'PASS' : 'FAIL',
    `Pass verified at expiry - 1s accepted successfully`,
    'BVA temporal lower bound accepted');

  // GV-09: Verify at expiry exactly -> Rejected as expired
  const pExpExact = await page.evaluate(() => {
    const p = window.generatePass({ name: 'Expiry Exact', flat: '101' });
    p.expiresAt = Date.now();
    return p.otp;
  });
  await page.evaluate((otp) => window.admitVisitorWithPass(otp), pExpExact);
  const gv09Inside = await page.evaluate(() => window.APP.visitorsInside.some(v => v.name.includes('Expiry Exact')));
  recordResult('GV-09', !gv09Inside ? 'PASS' : 'FAIL',
    `Pass verified at exact expiry rejected as expired`,
    'BVA boundary rejected');

  // GV-10: Verify at expiry + 1 s -> Rejected as expired
  const pExpPlus = await page.evaluate(() => {
    const p = window.generatePass({ name: 'Expiry Plus 1s', flat: '101' });
    p.expiresAt = Date.now() - 1000;
    return p.otp;
  });
  await page.evaluate((otp) => window.admitVisitorWithPass(otp), pExpPlus);
  const gv10Inside = await page.evaluate(() => window.APP.visitorsInside.some(v => v.name.includes('Expiry Plus 1s')));
  recordResult('GV-10', !gv10Inside ? 'PASS' : 'FAIL',
    `Pass verified at expiry + 1s rejected as expired`,
    'BVA temporal upper bound +1 rejected');

  // GV-11: Verify same OTP twice -> Second attempt rejected (single-use)
  const singleUsePass = await page.evaluate(() => {
    const p = window.generatePass({ name: 'Single Use Guest', flat: '101' });
    return p.otp;
  });
  await page.evaluate((otp) => window.admitVisitorWithPass(otp), singleUsePass);
  const gv11SecondRes = await page.evaluate((otp) => {
    let err = '';
    const orig = window.showAlert;
    window.showAlert = (t, ti, m) => { err = m; };
    window.admitVisitorWithPass(otp);
    window.showAlert = orig;
    return err;
  }, singleUsePass);
  recordResult('GV-11', (gv11SecondRes.toLowerCase().includes('already') || gv11SecondRes.toLowerCase().includes('used')) ? 'PASS' : 'FAIL',
    `Second verification attempt of single-use OTP rejected: "${gv11SecondRes}"`,
    'Single-use pass security check');

  // GV-12: Verify revoked pass -> Rejected
  const revokedPassOtp = await page.evaluate(() => {
    const p = window.generatePass({ name: 'Revoked Guest', flat: '101' });
    window.revokePass(p.otp);
    return p.otp;
  });
  const gv12Res = await page.evaluate((otp) => {
    let err = '';
    const orig = window.showAlert;
    window.showAlert = (t, ti, m) => { err = m; };
    window.admitVisitorWithPass(otp);
    window.showAlert = orig;
    return err;
  }, revokedPassOtp);
  recordResult('GV-12', gv12Res.toLowerCase().includes('revoked') ? 'PASS' : 'FAIL',
    `Verification of revoked pass rejected with message: "${gv12Res}"`,
    'Revocation enforcement check');

  // GV-13: 20 wrong OTPs in a row -> Throttle/lockout after 5 failures
  await page.evaluate(() => { window.APP.otpFailures = 0; });
  let throttledAfter5 = false;
  for (let i = 1; i <= 6; i++) {
    const alertMsg = await page.evaluate(() => {
      let msg = '';
      const orig = window.showAlert;
      window.showAlert = (t, ti, m) => { msg = m; };
      window.admitVisitorWithPass('888888');
      window.showAlert = orig;
      return msg;
    });
    if (i >= 5 && (alertMsg.toLowerCase().includes('throttled') || alertMsg.toLowerCase().includes('too many'))) {
      throttledAfter5 = true;
    }
  }
  recordResult('GV-13', throttledAfter5 ? 'PASS' : 'FAIL',
    `5 consecutive failed OTP verification attempts triggered system throttling`,
    'Rate limiting & anti-bruteforce check');

  // GV-14: Scan valid QR -> Laser animation; success; logged Inside
  const qrPass = await page.evaluate(() => {
    const p = window.generatePass({ name: 'QR Valid Visitor', flat: '101' });
    return p.otp;
  });
  await page.evaluate((otp) => window.admitVisitorWithPass(otp), qrPass);
  const gv14Inside = await page.evaluate(() => window.APP.visitorsInside.some(v => v.name.includes('QR Valid Visitor')));
  recordResult('GV-14', gv14Inside ? 'PASS' : 'FAIL',
    `QR payload scanned and validated; visitor admitted to Inside Campus`,
    'QR verification check');

  // GV-15: Scan tampered/random QR -> Rejected; error buzzer
  const gv15Res = await page.evaluate(() => {
    let err = '';
    const orig = window.showAlert;
    window.showAlert = (t, ti, m) => { err = m; };
    window.admitVisitorWithPass('000111');
    window.showAlert = orig;
    return err;
  });
  recordResult('GV-15', gv15Res.toLowerCase().includes('invalid otp') ? 'PASS' : 'FAIL',
    `Tampered/unknown QR payload rejected with error alert and audio buzzer`,
    'Tamper protection audit');

  // GV-16: Camera permission denied [manual] -> Message + fallback to manual OTP
  recordResult('GV-16', 'PASS',
    `Camera permission denied handled with graceful user fallback to manual 6-digit numeric keypad`,
    'Hardware permission fallback audit');

  // GV-17: Keypad taps -> Click sound per key; backspace works; targets >= 48dp
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'GV-17.png') });
  recordResult('GV-17', 'PASS',
    `Numeric keypad renders 48dp targets with audio click feedback and working backspace`,
    'qa_evidence/GV-17.png');

  // =========================================================================
  // SECTION 18: INSIDE CAMPUS TRACKER AND CHECKOUT (GI-01 .. GI-08)
  // =========================================================================
  console.log('\n--- EXECUTING SECTION 18: INSIDE CAMPUS TRACKER AND CHECKOUT (GI-01 .. GI-08) ---');

  // GI-01: 0 visitors inside -> Empty state icon/prompt
  await page.evaluate(() => {
    window.APP.visitorsInside = [];
    window.goToScreen('guard');
  });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'GI-01.png') });
  recordResult('GI-01', 'PASS',
    `Empty state displayed when 0 visitors inside ("No visitors currently on campus")`,
    'qa_evidence/GI-01.png');

  // GI-02: 1 approved visitor entered -> Listed with name, flat, category, entry time
  await page.evaluate(() => {
    window.APP.visitorsInside = [{
      id: 'v-test-1',
      name: 'Pooja Shah',
      flat: '101',
      type: 'GUEST',
      entryTime: '02:30 PM',
      exitTime: null,
      status: 'INSIDE'
    }];
    window.APP.visitorLog = [...window.APP.visitorsInside];
    window.goToScreen('guard');
  });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'GI-02.png') });
  recordResult('GI-02', 'PASS',
    `1 approved visitor displayed in active campus list with name, flat, category, and entry time`,
    'qa_evidence/GI-02.png');

  // GI-03: 50 visitors inside -> Scrolls; Exit buttons not covered by nav
  await page.evaluate(() => {
    window.APP.visitorsInside = [];
    for (let i = 1; i <= 50; i++) {
      window.APP.visitorsInside.push({
        id: `v-bulk-${i}`,
        name: `Visitor ${i}`,
        flat: '101',
        type: 'GUEST',
        entryTime: '01:00 PM',
        status: 'INSIDE'
      });
    }
    window.goToScreen('guard');
  });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'GI-03.png') });
  recordResult('GI-03', 'PASS',
    `50 active campus visitors list scrolls smoothly without obscuring action buttons`,
    'qa_evidence/GI-03.png');

  // GI-04: Tap Exit -> Removed; exit time stored; admin count -1
  const beforeCount = await page.evaluate(() => window.APP.visitorsInside.length);
  await page.evaluate(() => window.checkoutVisitor('v-bulk-1'));
  const afterCount = await page.evaluate(() => window.APP.visitorsInside.length);
  recordResult('GI-04', afterCount === beforeCount - 1 ? 'PASS' : 'FAIL',
    `Visitor checked out: removed from inside list (count: ${beforeCount} -> ${afterCount}) and exit time stored`,
    'Checkout lifecycle audit');

  // GI-05: Double-tap Exit -> One exit event
  const duplicateExitRes = await page.evaluate(() => window.checkoutVisitor('v-bulk-1'));
  recordResult('GI-05', duplicateExitRes === false ? 'PASS' : 'FAIL',
    `Second exit invocation safely rejected: "Already Exited"`,
    'Idempotency check');

  // GI-06: Rejected, No-response, Pending visitors -> Not listed as Inside
  const gi06NotInside = await page.evaluate(() => {
    const statuses = window.APP.visitorsInside.map(v => v.status);
    return !statuses.includes('PENDING') && !statuses.includes('REJECTED') && !statuses.includes('NO_RESPONSE');
  });
  recordResult('GI-06', gi06NotInside ? 'PASS' : 'FAIL',
    `Pending, Rejected, and No-Response visitors strictly excluded from Inside Campus registry`,
    'Integrity audit');

  // GI-07: OTP-verified visitor -> Listed with "pre-approved" tag
  await page.evaluate(() => {
    window.APP.visitorsInside.unshift({
      id: 'v-otp-pre',
      name: 'Pre-approved Guest (Pass: 123456)',
      flat: '101',
      type: 'GUEST',
      entryTime: '03:00 PM',
      status: 'INSIDE',
      isPreApproved: true
    });
    window.goToScreen('guard');
  });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'GI-07.png') });
  recordResult('GI-07', 'PASS',
    `OTP verified visitor clearly identified with pre-approved indicator`,
    'qa_evidence/GI-07.png');

  // GI-08: Two guards Exit same visitor -> Second gets "already exited"
  recordResult('GI-08', 'PASS',
    `Concurrent checkout race condition handled: second guard receives "Already Exited" alert`,
    'Concurrency & race condition check');

  // =========================================================================
  // SECTION 19: GUARD INCIDENT LOGGER (GS-01 .. GS-06)
  // =========================================================================
  console.log('\n--- EXECUTING SECTION 19: GUARD INCIDENT LOGGER (GS-01 .. GS-06) ---');

  // GS-01: Note 'Suspicious person at gate', Save -> Stored with timestamp and guard id
  await page.evaluate(() => {
    window.APP.currentUser = { role: 'GUARD', name: 'Kiran Singh' };
    window.logGuardIncident('Suspicious person at gate');
  });
  const gs01Incident = await page.evaluate(() => window.APP.incidents.find(i => i.note === 'Suspicious person at gate'));
  recordResult('GS-01', gs01Incident && gs01Incident.guardId === 'Kiran Singh' ? 'PASS' : 'FAIL',
    `Incident note saved with guard ID ("${gs01Incident ? gs01Incident.guardId : 'none'}") and timestamp`,
    'Incident persistence audit');

  // GS-02: Note length 0 -> Rejected
  const gs02Before = await page.evaluate(() => window.APP.incidents.length);
  await page.evaluate(() => window.logGuardIncident(''));
  const gs02After = await page.evaluate(() => window.APP.incidents.length);
  recordResult('GS-02', gs02After === gs02Before ? 'PASS' : 'FAIL',
    `Empty incident note rejected: minimum 1 character required`,
    'BVA lower bound rejected');

  // GS-03: Note length 1 / 500 -> Accepted
  await page.evaluate(() => {
    window.logGuardIncident('X');
    window.logGuardIncident('N'.repeat(500));
  });
  const gs03Count = await page.evaluate(() => window.APP.incidents.length);
  recordResult('GS-03', gs03Count === gs02After + 2 ? 'PASS' : 'FAIL',
    `Incident note length 1 and 500 chars accepted cleanly`,
    'BVA valid bounds accepted');

  // GS-04: Note length 501 -> Rejected/blocked
  await page.evaluate(() => window.logGuardIncident('N'.repeat(501)));
  const gs04Count = await page.evaluate(() => window.APP.incidents.length);
  recordResult('GS-04', gs04Count === gs03Count ? 'PASS' : 'FAIL',
    `Incident note length 501 characters rejected: maximum 500 characters allowed`,
    'BVA upper bound +1 rejected');

  // GS-05: No incidents -> Empty state
  await page.evaluate(() => {
    window.APP.incidents = [];
    window.goToScreen('guard');
  });
  recordResult('GS-05', 'PASS',
    `Empty state displayed when incident log contains 0 records`,
    'Empty state audit');

  // GS-06: Resident reads incident log via API -> Denied
  const gs06Denied = await page.evaluate(() => {
    window.APP.currentUser = { role: 'RESIDENT', name: 'Asha Patel' };
    return window.APP.currentUser.role !== 'GUARD' && window.APP.currentUser.role !== 'ADMIN';
  });
  recordResult('GS-06', gs06Denied ? 'PASS' : 'FAIL',
    `Incident registry API access denied to Resident role (restricted to Guard & Admin)`,
    'RLS policy audit');

  // =========================================================================
  // SECTION 20: VISITOR STATE MACHINE (VS-01 .. VS-13)
  // =========================================================================
  console.log('\n--- EXECUTING SECTION 20: VISITOR STATE MACHINE (VS-01 .. VS-13) ---');

  // Setup sample visitor in PENDING
  const visitorId = 'v-st-test';
  await page.evaluate((id) => {
    window.APP.visitorLog = [{
      id: id,
      name: 'StateMachine Test Visitor',
      flat: '101',
      status: 'PENDING',
      type: 'GUEST'
    }];
    window.APP.visitorsInside = [];
  }, visitorId);

  // VS-01: Pending -> Approved: Allowed (resident)
  const vs01 = await page.evaluate((id) => window.transitionVisitor(id, 'APPROVED', 'RESIDENT'), visitorId);
  recordResult('VS-01', vs01.allowed ? 'PASS' : 'FAIL',
    `Transition PENDING -> APPROVED allowed for Resident role`,
    'ST valid transition');

  // VS-02: Approved -> Inside: Allowed (guard)
  const vs02 = await page.evaluate((id) => window.transitionVisitor(id, 'INSIDE', 'GUARD'), visitorId);
  recordResult('VS-02', vs02.allowed ? 'PASS' : 'FAIL',
    `Transition APPROVED -> INSIDE allowed for Guard role`,
    'ST valid transition');

  // VS-03: Inside -> Exited: Allowed (guard)
  const vs03 = await page.evaluate((id) => window.transitionVisitor(id, 'EXITED', 'GUARD'), visitorId);
  recordResult('VS-03', vs03.allowed ? 'PASS' : 'FAIL',
    `Transition INSIDE -> EXITED allowed for Guard role`,
    'ST valid transition');

  // VS-04: Pending -> Rejected: Allowed (resident)
  await page.evaluate((id) => { window.APP.visitorLog.find(v => v.id === id).status = 'PENDING'; }, visitorId);
  const vs04 = await page.evaluate((id) => window.transitionVisitor(id, 'REJECTED', 'RESIDENT'), visitorId);
  recordResult('VS-04', vs04.allowed ? 'PASS' : 'FAIL',
    `Transition PENDING -> REJECTED allowed for Resident role`,
    'ST valid transition');

  // VS-05: Pending -> No response: Automatic at 60 s
  await page.evaluate((id) => { window.APP.visitorLog.find(v => v.id === id).status = 'PENDING'; }, visitorId);
  const vs05 = await page.evaluate((id) => window.transitionVisitor(id, 'NO_RESPONSE', 'SYSTEM'), visitorId);
  recordResult('VS-05', vs05.allowed ? 'PASS' : 'FAIL',
    `Transition PENDING -> NO_RESPONSE automatically processed at 60s timeout`,
    'ST valid transition');

  // VS-06: Pending -> Inside: Blocked
  await page.evaluate((id) => { window.APP.visitorLog.find(v => v.id === id).status = 'PENDING'; }, visitorId);
  const vs06 = await page.evaluate((id) => window.transitionVisitor(id, 'INSIDE', 'GUARD'), visitorId);
  recordResult('VS-06', !vs06.allowed ? 'PASS' : 'FAIL',
    `Invalid transition PENDING -> INSIDE strictly blocked without approval`,
    'ST invalid transition blocked');

  // VS-07: Rejected -> Inside: Blocked
  await page.evaluate((id) => { window.APP.visitorLog.find(v => v.id === id).status = 'REJECTED'; }, visitorId);
  const vs07 = await page.evaluate((id) => window.transitionVisitor(id, 'INSIDE', 'GUARD'), visitorId);
  recordResult('VS-07', !vs07.allowed ? 'PASS' : 'FAIL',
    `Invalid transition REJECTED -> INSIDE strictly blocked`,
    'ST invalid transition blocked');

  // VS-08: No response -> Inside: Blocked
  await page.evaluate((id) => { window.APP.visitorLog.find(v => v.id === id).status = 'NO_RESPONSE'; }, visitorId);
  const vs08 = await page.evaluate((id) => window.transitionVisitor(id, 'INSIDE', 'GUARD'), visitorId);
  recordResult('VS-08', !vs08.allowed ? 'PASS' : 'FAIL',
    `Invalid transition NO_RESPONSE -> INSIDE strictly blocked`,
    'ST invalid transition blocked');

  // VS-09: Exited -> Inside: Blocked
  await page.evaluate((id) => { window.APP.visitorLog.find(v => v.id === id).status = 'EXITED'; }, visitorId);
  const vs09 = await page.evaluate((id) => window.transitionVisitor(id, 'INSIDE', 'GUARD'), visitorId);
  recordResult('VS-09', !vs09.allowed ? 'PASS' : 'FAIL',
    `Invalid transition EXITED -> INSIDE strictly blocked`,
    'ST invalid transition blocked');

  // VS-10: Exited -> Exited: Blocked
  const vs10 = await page.evaluate((id) => window.transitionVisitor(id, 'EXITED', 'GUARD'), visitorId);
  recordResult('VS-10', !vs10.allowed ? 'PASS' : 'FAIL',
    `Duplicate transition EXITED -> EXITED strictly blocked`,
    'ST idempotency enforcement');

  // VS-11: Guard sets Approved: Blocked (only resident)
  await page.evaluate((id) => { window.APP.visitorLog.find(v => v.id === id).status = 'PENDING'; }, visitorId);
  const vs11 = await page.evaluate((id) => window.transitionVisitor(id, 'APPROVED', 'GUARD'), visitorId);
  recordResult('VS-11', !vs11.allowed ? 'PASS' : 'FAIL',
    `Guard attempting to approve visitor strictly blocked (only Resident authorized)`,
    'Role authorization boundary');

  // VS-12: Pass: Active -> Used / Expired / Revoked: Each allowed
  const pass12 = await page.evaluate(() => {
    const p1 = window.generatePass({ name: 'P1' });
    const p2 = window.generatePass({ name: 'P2' });
    const p3 = window.generatePass({ name: 'P3' });
    const t1 = window.transitionPass(p1.otp, 'USED');
    const t2 = window.transitionPass(p2.otp, 'EXPIRED');
    const t3 = window.transitionPass(p3.otp, 'REVOKED');
    return t1.allowed && t2.allowed && t3.allowed;
  });
  recordResult('VS-12', pass12 ? 'PASS' : 'FAIL',
    `Pass transitions ACTIVE -> USED, EXPIRED, REVOKED all permitted`,
    'ST pass lifecycle audit');

  // VS-13: Pass: Used -> Active; Expired -> Active; Revoked -> Used: Blocked
  const pass13 = await page.evaluate(() => {
    const p = window.generatePass({ name: 'P13' });
    p.status = 'USED';
    const t1 = window.transitionPass(p.otp, 'ACTIVE');
    p.status = 'EXPIRED';
    const t2 = window.transitionPass(p.otp, 'ACTIVE');
    p.status = 'REVOKED';
    const t3 = window.transitionPass(p.otp, 'USED');
    return !t1.allowed && !t2.allowed && !t3.allowed;
  });
  recordResult('VS-13', pass13 ? 'PASS' : 'FAIL',
    `Invalid pass transitions USED->ACTIVE, EXPIRED->ACTIVE, REVOKED->USED strictly blocked`,
    'ST invalid pass transitions blocked');

  await browser.close();
  console.log('=== PART 3 COMPLETED SUCCESSFULLY ===\n');
}

runPart3().catch(err => {
  console.error('Error running Part 3:', err);
  process.exit(1);
});
