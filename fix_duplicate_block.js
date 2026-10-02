const fs = require('fs');
let html = fs.readFileSync('web_preview/index.html', 'utf8');

const targetStr = `      return true;
    }
      if (APP.screen === 'guard') {
        renderGuardScreen(document.getElementById('app-viewport'));
      } else if (APP.screen === 'visitors') {
        renderVisitorsScreen(document.getElementById('app-viewport'));
      } else {
        renderResidentScreen(document.getElementById('app-viewport'));
      }
    }`;

const replaceStr = `      return true;
    }`;

if (html.includes(targetStr)) {
  html = html.replace(targetStr, replaceStr);
  fs.writeFileSync('web_preview/index.html', html, 'utf8');
  console.log('Fixed duplicate block successfully!');
} else {
  console.log('Target string not found');
}
