const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

// 1. Update notice-cat select options (P11)
const oldSelect = `<select id="notice-cat" class="w-full px-3 py-2 rounded-xl bg-sandstone-50 border border-sandstone-300 focus:border-terracotta-500 outline-none text-xs font-semibold">
            <option value="Maintenance">Maintenance & Repairs</option>
            <option value="Security">Security & Access</option>
            <option value="Water">Water & Utilities</option>
            <option value="General">General Society Announcement</option>
          </select>`;

const newSelect = `<select id="notice-cat" class="w-full px-3 py-2 rounded-xl bg-sandstone-50 border border-sandstone-300 focus:border-terracotta-500 outline-none text-xs font-semibold">
            <option value="General">General Society Announcement</option>
            <option value="Urgent">Urgent Alert</option>
            <option value="Maintenance">Maintenance & Repairs</option>
          </select>`;

if (html.includes(oldSelect)) {
  html = html.replace(oldSelect, newSelect);
}

// 2. Add copyGuardCode function and window bindings
const copyGuardCodeFunc = `
    function copyGuardCode() {
      const code = APP.guardSecretCode;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).catch(() => {});
        }
      } catch(_) {}
      playChime('success');
      showAlert('success', 'Code Copied', \`Guard invite code "\${code}" copied to clipboard\`);
      return code;
    }
    window.copyGuardCode = copyGuardCode;
    window.rotateGuardCode = rotateGuardCode;
`;

if (!html.includes('function copyGuardCode')) {
  html = html.replace('function rotateGuardCode() {', copyGuardCodeFunc + '\n    function rotateGuardCode() {');
}

// 3. Update Guard Invite Code UI with Copy button
const oldGuardCodeUi = `<button type="button" onclick="rotateGuardCode()" class="btn-base btn-secondary btn-sm">
              Rotate Code
            </button>`;

const newGuardCodeUi = `<div class="flex gap-2">
              <button type="button" onclick="copyGuardCode()" id="btn-copy-guard-code" class="btn-base btn-secondary btn-sm">
                Copy Code
              </button>
              <button type="button" onclick="rotateGuardCode()" id="btn-rotate-guard-code" class="btn-base btn-primary btn-sm">
                Rotate Code
              </button>
            </div>`;

if (html.includes(oldGuardCodeUi)) {
  html = html.replace(oldGuardCodeUi, newGuardCodeUi);
}

// 4. Update route protection in goToScreen
const routeGuardOld = `const isMainSession = ['resident', 'guard', 'admin', 'visitors', 'notices'].includes(screenName);`;
const routeGuardNew = `
      // AL-27 / NV-07 Route protection
      if (screenName === 'admin' && (!APP.currentUser || APP.currentUser.role !== 'ADMIN')) {
        goToScreen('login');
        return;
      }
      if (screenName === 'guard' && (!APP.currentUser || APP.currentUser.role !== 'GUARD')) {
        goToScreen('login');
        return;
      }
      if (screenName === 'resident' && (!APP.currentUser || APP.currentUser.role !== 'RESIDENT')) {
        goToScreen('login');
        return;
      }
      const isMainSession = ['resident', 'guard', 'admin', 'visitors', 'notices'].includes(screenName);
`;

if (!html.includes('AL-27 / NV-07 Route protection')) {
  html = html.replace(routeGuardOld, routeGuardNew);
}

// 5. Update session restoration on DOMContentLoaded
const sessionRestoreCode = `
    document.addEventListener('DOMContentLoaded', () => {
      try {
        const savedSession = localStorage.getItem('parshwa_session');
        if (savedSession) {
          const user = JSON.parse(savedSession);
          if (user && user.role) {
            APP.currentUser = user;
            if (user.role === 'ADMIN') goToScreen('admin');
            else if (user.role === 'GUARD') goToScreen('guard');
            else goToScreen('resident');
            return;
          }
        }
      } catch(_) {}
    });
`;

if (!html.includes('document.addEventListener(\'DOMContentLoaded\', () => {')) {
  html = html.replace('// ---------------------------------------------------------------------------', sessionRestoreCode + '\n// ---------------------------------------------------------------------------');
}

// 6. Update handlePublishNoticeSubmit for flexible category casing
const noticeSubmitOldStart = `function handlePublishNoticeSubmit(e) {`;
const noticeSubmitNewStart = `function handlePublishNoticeSubmit(e) {
      if (e && e.preventDefault) e.preventDefault();
      const rawTitle = document.getElementById('notice-title') ? document.getElementById('notice-title').value : '';
      const title = rawTitle.trim();
      const rawCat = document.getElementById('notice-cat') ? document.getElementById('notice-cat').value : '';
      const rawContent = document.getElementById('notice-content') ? document.getElementById('notice-content').value : '';
      const content = rawContent.trim();

      if (!rawCat) {
        playChime('sos');
        showAlert('error', 'Category Required', 'Please select a valid notice category');
        return;
      }
      const catUpper = rawCat.toUpperCase();
      let cat = 'General';
      if (catUpper === 'URGENT') cat = 'Urgent';
      else if (catUpper === 'MAINTENANCE') cat = 'Maintenance';
      else if (catUpper === 'GENERAL') cat = 'General';
      else {
        playChime('sos');
        showAlert('error', 'Category Required', 'Please select a valid notice category');
        return;
      }

      if (!title || title.length < 1) {
        playChime('sos');
        showAlert('error', 'Title Required', 'Notice title cannot be empty or whitespace only');
        return;
      }
      if (rawTitle.length > 100) {
        playChime('sos');
        showAlert('error', 'Title Too Long', 'Notice title cannot exceed 100 characters');
        return;
      }
      if (!content || content.length < 1) {
        playChime('sos');
        showAlert('error', 'Content Required', 'Notice body cannot be empty');
        return;
      }
      if (rawContent.length > 1000) {
        playChime('sos');
        showAlert('error', 'Content Too Long', 'Notice body cannot exceed 1000 characters');
        return;
      }

      const newNotice = {
        id: \`notice-\${Date.now()}-\${Math.floor(Math.random()*1000)}\`,
        title: title,
        category: cat,
        content: content,
        author: 'Managing Committee (Harish Mehta)',
        date: 'Just now',
        timestamp: Date.now()
      };

      if (cat === 'Urgent') {
        APP.notices.unshift(newNotice);
      } else {
        const firstNonUrgent = APP.notices.findIndex(n => n.category !== 'Urgent');
        if (firstNonUrgent === -1) APP.notices.push(newNotice);
        else APP.notices.splice(firstNonUrgent, 0, newNotice);
      }

      closeModal('modal-publish-notice');
      playChime('success');
      showAlert('success', 'Notice Published', \`"\${title}" has been broadcast to all 28 flats\`);
      broadcastStateUpdate();
      if (APP.screen === 'notices') renderNoticesScreen(document.getElementById('app-viewport'));
      return;
    }
    function _unusedOldNoticeSubmit() {
`;

if (html.includes(noticeSubmitOldStart) && !html.includes('_unusedOldNoticeSubmit')) {
  html = html.replace(noticeSubmitOldStart, noticeSubmitNewStart);
}

fs.writeFileSync('web_preview/index.html', html, 'utf8');
console.log('Applied Part 1 fixes to index.html!');
