const { chromium } = require('playwright'); // run via: npm run test:e2e
const fs = require('node:fs');
const { createState, install } = require('./mock-supabase');

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const PW = 'Local-Vault-Pass-1';
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
  if (!cond) failures++;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  await install(ctx, createState());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`${BASE}/lock`);
  await page.locator('button', { hasText: /^Create account$/ }).click();
  await page.click('button:has-text("This device only")');
  await page.fill('#master-password', PW);
  await page.fill('#confirm-password', PW);
  await page.click('button[type=submit]');
  await page.waitForSelector('#site');
  await page.fill('#site', 'GitHub');
  await page.fill('#username', 'octo');
  await page.fill('#password', 'gh-secret-Pass!9');
  await page.click('button:has-text("Save Password")');
  await page.waitForSelector('h3:has-text("GitHub")');

  // Export never downloads before the password is confirmed
  let downloads = 0;
  page.on('download', () => downloads++);
  await page.click('button:has-text("Export")');
  await page.waitForSelector('text=Export your vault');
  check('export opens a password prompt instead of downloading', downloads === 0);

  await page.fill('#prompt-password', 'not-the-password');
  await page.click('button[type=submit]:has-text("Export")');
  await page.waitForSelector('text=Incorrect master password');
  check('wrong password is rejected and nothing downloads', downloads === 0);

  // Encrypted backup (default)
  await page.fill('#prompt-password', PW);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button[type=submit]:has-text("Export")')]);
  const backupPath = 'export-backup.vaultify';
  await dl.saveAs(backupPath);
  const backup = fs.readFileSync(backupPath, 'utf8');
  check('default export is an encrypted .vaultify file', dl.suggestedFilename().endsWith('.vaultify'));
  check('encrypted backup contains no plaintext', !backup.includes('GitHub') && !backup.includes('gh-secret') && !backup.includes('octo'));

  // Plain JSON still needs the password
  await page.click('button:has-text("Export")');
  await page.waitForSelector('text=Export your vault');
  await page.click('text=Plain JSON');
  await page.fill('#prompt-password', PW);
  const [plain] = await Promise.all([page.waitForEvent('download'), page.click('button[type=submit]:has-text("Export")')]);
  await plain.saveAs('export-plain.json');
  check('plain JSON export works after confirming the password', JSON.parse(fs.readFileSync('export-plain.json', 'utf8'))[0].password === 'gh-secret-Pass!9');

  // Lockout after repeated wrong passwords
  await page.click('button:has-text("Export")');
  await page.waitForSelector('text=Export your vault');
  for (let i = 0; i < 5; i++) {
    await page.fill('#prompt-password', 'wrong-' + i);
    await page.click('button[type=submit]:has-text("Export")');
    await page.waitForFunction(() => !document.body.innerText.includes('Checking') && document.querySelector('[role=alert]'));
  }
  await page.waitForSelector('text=Too many attempts');
  check('five wrong attempts pause the prompt', await page.locator('button[type=submit]:has-text("Export")').isDisabled());
  await page.keyboard.press('Escape');

  // Import the encrypted backup back in (needs its password; wrong one is refused)
  await page.locator('input[type=file][accept*=vaultify]').setInputFiles(backupPath);
  await page.waitForSelector('text=Unlock this backup');
  await page.fill('#prompt-password', 'wrong-backup-pw');
  await page.click('button[type=submit]:has-text("Import")');
  await page.waitForSelector('text=Wrong password');
  await page.fill('#prompt-password', PW);
  await page.click('button[type=submit]:has-text("Import")');
  await page.waitForSelector('text=Imported 1 entries');
  check('encrypted backup imports with its password', (await page.locator('h3:has-text("GitHub")').count()) === 2);

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
