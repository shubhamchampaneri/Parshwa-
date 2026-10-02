const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

// 1. Upgrade admitVisitorWithPass to validate OTP format before lookup
const oldAdmit = `    function admitVisitorWithPass(otpCode) {
      const cleanInput = otpCode.replace(/\\D/g, '');
      const pass = APP.activePasses.find(p => p.otp === otpCode || p.cleanOtp === cleanInput);`;

const newAdmit = `    function admitVisitorWithPass(otpCode) {
      if (!otpCode) {
        playChime('sos');
        showAlert('error', 'OTP Required', 'Please enter a 6-digit OTP');
        return false;
      }
      // Check for non-numeric characters (GV-07)
      if (/[a-zA-Z]/.test(otpCode)) {
        playChime('sos');
        showAlert('error', 'Invalid OTP Format', 'OTP must contain numeric digits only');
        return false;
      }
      const cleanInput = otpCode.replace(/\\D/g, '');
      if (cleanInput.length !== 6) {
        playChime('sos');
        showAlert('error', 'Invalid OTP Length', 'OTP must be exactly 6 digits');
        return false;
      }
      const pass = APP.activePasses.find(p => p.otp === otpCode || p.cleanOtp === cleanInput);`;

if (html.includes(oldAdmit)) {
  html = html.replace(oldAdmit, newAdmit);
}

// 2. Upgrade generatePass to support opts parameter for testing boundaries
const oldGenPass = `    function generatePass() {
      const nameInput = document.getElementById('preapp-name');
      const name = nameInput ? nameInput.value.trim() : '';
      const type = document.getElementById('preapp-type') ? document.getElementById('preapp-type').value : 'Guest / Family';
      const flat = APP.currentUser ? APP.currentUser.flat : '101';

      // P16 / P3: Visitor name: 2–50 chars
      if (!name || name.length < 2) {
        playChime('sos');
        showAlert('error', 'Name Too Short', 'Visitor name must be at least 2 characters');
        return;
      }
      if (name.length > 50) {
        playChime('sos');
        showAlert('error', 'Name Too Long', 'Visitor name cannot exceed 50 characters');
        return;
      }
      // Check emoji-only or tags
      if (/^[\\p{Emoji}\\s]+$/u.test(name) || /<[^>]*>/.test(name)) {
        playChime('sos');
        showAlert('error', 'Invalid Name', 'Visitor name cannot be emoji-only or contain HTML tags');
        return;
      }

      // P9: Max 10 active passes per flat
      const activeForFlat = APP.activePasses.filter(p => p.flat === flat && p.status === 'ACTIVE');
      if (activeForFlat.length >= 10) {
        playChime('sos');
        showAlert('error', 'Limit Reached', 'Maximum 10 active passes allowed per flat. Please revoke an existing pass.');
        return;
      }`;

const newGenPass = `    function generatePass(opts = {}) {
      const nameInput = document.getElementById('preapp-name');
      const name = opts.name !== undefined ? opts.name.trim() : (nameInput ? nameInput.value.trim() : '');
      const type = opts.type || (document.getElementById('preapp-type') ? document.getElementById('preapp-type').value : 'Guest / Family');
      const flat = opts.flat || (APP.currentUser ? APP.currentUser.flat : '101');
      const durationMin = opts.durationMinutes !== undefined ? opts.durationMinutes : 60;
      const startTime = opts.startTime !== undefined ? opts.startTime : Date.now();
      const endTime = opts.endTime !== undefined ? opts.endTime : (startTime + durationMin * 60000);

      // P16 / P3: Visitor name: 2–50 chars
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
      // Check emoji-only or tags
      if (/^[\\p{Emoji}\\s]+$/u.test(name) || /<[^>]*>/.test(name)) {
        playChime('sos');
        showAlert('error', 'Invalid Name', 'Visitor name cannot be emoji-only or contain HTML tags');
        return false;
      }

      // PA-07..PA-11: Duration 15 min to 24 h (1440 min)
      if (durationMin < 15) {
        playChime('sos');
        showAlert('error', 'Duration Too Short', 'Pass duration must be at least 15 minutes');
        return false;
      }
      if (durationMin > 1440) {
        playChime('sos');
        showAlert('error', 'Duration Too Long', 'Pass duration cannot exceed 24 hours');
        return false;
      }

      // PA-12: Start time cannot be in past
      if (startTime < Date.now() - 5000) {
        playChime('sos');
        showAlert('error', 'Invalid Start Time', 'Start time cannot be in the past');
        return false;
      }

      // PA-13: End before start
      if (endTime <= startTime) {
        playChime('sos');
        showAlert('error', 'Invalid End Time', 'End time cannot be earlier than start time');
        return false;
      }

      // P9 / PA-15: Max 10 active passes per flat
      const activeForFlat = APP.activePasses.filter(p => p.flat === flat && p.status === 'ACTIVE');
      if (activeForFlat.length >= 10) {
        playChime('sos');
        showAlert('error', 'Limit Reached', 'Maximum 10 active passes allowed per flat. Please revoke an existing pass.');
        return false;
      }`;

if (html.includes(oldGenPass)) {
  html = html.replace(oldGenPass, newGenPass);
}

fs.writeFileSync('web_preview/index.html', html, 'utf8');
console.log('Upgraded generatePass & admitVisitorWithPass in index.html!');
