const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

const oldRespond = `    function respondVisitorAlert(allowed) {
      if (APP.intercomRingTimer) clearTimeout(APP.intercomRingTimer);
      document.getElementById('doorbell-alert-modal').classList.add('hidden');
      const req = APP.pendingVisitorRequest;
      const now = new Date();`;

const newRespond = `    function respondVisitorAlert(allowed) {
      if (APP.intercomRingTimer) clearTimeout(APP.intercomRingTimer);
      document.getElementById('doorbell-alert-modal').classList.add('hidden');
      const req = APP.pendingVisitorRequest;
      if (!req) {
        showAlert('warning', 'Call Expired', 'This intercom call has already expired or ended.');
        return;
      }
      const now = new Date();`;

if (html.includes(oldRespond)) {
  html = html.replace(oldRespond, newRespond);
}

fs.writeFileSync('web_preview/index.html', html, 'utf8');
console.log('Added !req check to respondVisitorAlert in index.html!');
