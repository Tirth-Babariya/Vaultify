const { chromium } = require('playwright'); // run via: npm run test:e2e
const { createState, install } = require('./mock-supabase');

const BASE = process.env.BASE_URL || 'http://localhost:3100';
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
  if (!cond) failures++;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, colorScheme: 'dark' });
  await install(ctx, createState());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));

  // create a local vault with some data so screens are populated
  await page.goto(`${BASE}/lock`);
  await page.locator('button', { hasText: /^Create account$/ }).click();
  await page.click('button:has-text("This device only")');
  await page.fill('#master-password', 'Theme-Test-Password-1');
  await page.fill('#confirm-password', 'Theme-Test-Password-1');
  await page.click('button[type=submit]');
  await page.waitForSelector('#site');
  check('default theme is dark', await isDark());

  await page.click('.sidebar-link:has-text("Groups")');
  await page.fill('input[placeholder="e.g. Work, Family, Finance"]', 'Work');
  await page.click('button:has-text("Create Group")');
  await page.click('.sidebar-link:has-text("Vault")');
  for (const [s, u, p] of [['GitHub', 'octo', 'Str0ng!Pass#1'], ['Netflix', 'me@x.com', 'weak']]) {
    await page.fill('#site', s); await page.fill('#username', u); await page.fill('#password', p);
    await page.click('button:has-text("Save Password")');
    await page.waitForSelector(`h3:has-text("${s}")`);
  }

  // ---------- settings tabs ----------
  await page.click('.sidebar-link:has-text("Settings")');
  await page.waitForSelector('[role=tablist]');
  const tabNames = await page.locator('[role=tab]').allInnerTexts();
  check('settings has dedicated horizontal tabs', JSON.stringify(tabNames) === JSON.stringify(['Account', 'Security', 'Activity', 'Appearance', 'General']), tabNames.join(', '));
  check('Account tab shows only account panels', (await page.locator('text=Master password').count()) === 0 && (await page.locator('text=Enable cloud sync').count()) > 0);
  await page.screenshot({ path: 'tabs-account-dark.png' });

  await page.click('[role=tab]:has-text("Security")');
  check('Security tab shows master password panel only', (await page.locator('#cur-pw').count()) === 1 && (await page.locator('text=Recent activity').count()) === 0);
  await page.click('[role=tab]:has-text("Activity")');
  check('Activity tab shows activity feed', (await page.locator('text=Recent activity').count()) === 1 && (await page.locator('#cur-pw').count()) === 0);

  await page.locator('[role=tab][aria-selected=true]').focus();
  await page.keyboard.press('ArrowRight');
  check('ArrowRight moves to the next tab', (await page.locator('[role=tab][aria-selected=true]').innerText()) === 'Appearance');
  await page.keyboard.press('ArrowRight');
  check('tabs cycle with the keyboard', (await page.locator('[role=tab][aria-selected=true]').innerText()) === 'General');
  await page.screenshot({ path: 'tabs-general-dark.png' });
  await page.keyboard.press('ArrowRight');
  check('arrow navigation wraps from the last tab to the first', (await page.locator('[role=tab][aria-selected=true]').innerText()) === 'Account');
  await page.click('[role=tab]:has-text("Appearance")');
  const tabBarScrolls = await page.locator('[role=tablist]').evaluate((el) => ({ v: el.scrollHeight > el.clientHeight, h: el.scrollWidth > el.clientWidth }));
  check('tab bar has no scrollbar on desktop (no vertical or horizontal overflow)', !tabBarScrolls.v && !tabBarScrolls.h, JSON.stringify(tabBarScrolls));
  await page.screenshot({ path: 'tabs-appearance-dark.png' });

  // ---------- theme switching ----------
  await page.click('[role=radio]:has-text("Light")');
  check('Light theme applies immediately', !(await isDark()));
  await page.screenshot({ path: 'tabs-appearance-light.png' });
  await page.reload();
  await page.waitForSelector('#site');
  check('light theme persists across reload', !(await isDark()));

  // first paint must already be light (no dark flash): inspect right at DOMContentLoaded
  const paintCheck = await ctx.newPage();
  await paintCheck.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { window.__darkAtDCL = document.documentElement.classList.contains('dark'); }));
  await paintCheck.goto(`${BASE}/lock`);
  check('theme class is set before first paint (no flash)', (await paintCheck.evaluate(() => window.__darkAtDCL)) === false);
  await paintCheck.close();

  // light-mode visual sweep
  await page.click('.sidebar-link:has-text("Vault")');
  await page.waitForSelector('h3:has-text("GitHub")');
  await page.screenshot({ path: 'light-vault.png' });
  await page.click('.sidebar-link:has-text("Groups")');
  await page.waitForSelector('text=New Group');
  await page.screenshot({ path: 'light-groups.png' });
  await page.click('.sidebar-link:has-text("Generator")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'light-generator.png' });
  await page.click('.sidebar-link:has-text("Security")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'light-security.png' });
  await page.click('.sidebar-link:has-text("Settings")');
  await page.click('[role=tab]:has-text("Security")');
  await page.screenshot({ path: 'light-settings-security.png' });

  // ---------- system mode follows the OS live ----------
  await page.click('[role=tab]:has-text("Appearance")');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.click('[role=radio]:has-text("System")');
  check('System + OS light => light', !(await isDark()));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  check('System theme follows the OS switching to dark, live', await isDark());
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(300);
  check('...and back to light', !(await isDark()));

  // dark again + auth screens in light
  await page.click('[role=radio]:has-text("Dark")');
  check('Dark theme restores', await isDark());

  await page.click('[role=radio]:has-text("Light")');
  await page.click('button:has-text("Lock Vault")');
  await page.waitForSelector('text=Welcome back');
  await page.screenshot({ path: 'light-unlock.png' });
  await page.click('text=Reset vault');
  await page.locator('button', { hasText: 'Yes, delete everything' }).click();
  await page.waitForSelector('text=Create your account');
  await page.screenshot({ path: 'light-choose.png' });

  check('no page errors / console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failures === 0 ? '\nALL THEME + TAB CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('ABORTED:', e.message); process.exit(1); });
