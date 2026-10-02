const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

const funcsToHook = [
  { target: "APP.pendingRegistrations.splice(idx, 1);", insert: "\n        broadcastStateUpdate();" },
  { target: "APP.activePasses.unshift(newPass);", insert: "\n      broadcastStateUpdate();" },
  { target: "pass.status = 'REVOKED';", insert: "\n        broadcastStateUpdate();" },
  { target: "APP.notices.splice(idx, 1);", insert: "\n        broadcastStateUpdate();" },
  { target: "APP.guardSecretCode = code;", insert: "\n      broadcastStateUpdate();" },
  { target: "localStorage.clear();\n      sessionStorage.clear();", insert: "\n      broadcastStateUpdate();" }
];

funcsToHook.forEach(({ target, insert }) => {
  if (html.includes(target) && !html.includes(target + insert)) {
    html = html.replace(target, target + insert);
  }
});

fs.writeFileSync('web_preview/index.html', html, 'utf8');
console.log('Hooked broadcastStateUpdate into state mutations!');
