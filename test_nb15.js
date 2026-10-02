const { chromium } = require('C:/Users/BL0080/.gemini/antigravity/scratch/pixel-perfect-validator/node_modules/playwright');
(async () => {
  console.log('Starting test...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  console.log('1. Page loaded');

  // Login as admin
  await page.evaluate(() => {
    window.setLoginRole('ADMIN');
    document.getElementById('login-email').value = 'admin@parshwaplatinum.com';
    document.getElementById('login-password').value = '5829';
    window.handleLoginSubmit(new Event('submit'));
  });
  console.log('2. Logged in');

  // NB-14
  let scriptExecuted = false;
  try {
    await page.exposeFunction('onXssFired', () => { scriptExecuted = true; });
  } catch (e) {
    console.log('exposeFunction notice:', e.message);
  }
  console.log('3. Exposed function');

  await page.evaluate(() => {
    document.getElementById('notice-cat').value = 'General';
    document.getElementById('notice-title').value = '<img src=x onerror=alert(1)>';
    document.getElementById('notice-content').value = 'Security test body';
    window.handlePublishNoticeSubmit(new Event('submit'));
    window.goToScreen('notices');
  });
  console.log('4. NB-14 evaluated');

  // NB-15
  const multiLangTitle = '🚧 Lift રીપેરિંગ कार्य';
  const multiLangBody = 'Line 1: 10:00 AM\nLine 2: 02:00 PM';
  console.log('5. Before NB-15 evaluate');
  await page.evaluate(({ t, b }) => {
    document.getElementById('notice-cat').value = 'General';
    document.getElementById('notice-title').value = t;
    document.getElementById('notice-content').value = b;
    window.handlePublishNoticeSubmit(new Event('submit'));
  }, { t: multiLangTitle, b: multiLangBody });
  console.log('6. After NB-15 evaluate');

  const nb15Notice = await page.evaluate((t) => window.APP.notices.find(n => n.title === t), multiLangTitle);
  console.log('7. NB-15 notice found:', !!nb15Notice);

  await browser.close();
  console.log('Test completed successfully!');
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
