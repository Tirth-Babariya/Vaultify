const { chromium } = require('playwright'); // run via: npm run test:e2e
const { createState, install } = require('./mock-supabase');

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const SIZES = [
  ['laptop 1366x657', 1366, 657],
  ['desktop 1920x969', 1920, 969],
  ['small laptop 1280x600', 1280, 600],
  ['phone 390x664', 390, 664],
  ['small phone 360x560', 360, 560],
];
let failures = 0;

(async () => {
  const browser = await chromium.launch();
  const state = createState();

  const measure = (page) => page.evaluate(() => {
    const c = document.querySelector('.fixed.inset-0.overflow-y-auto');
    return { scrolls: c.scrollHeight > c.clientHeight + 1, over: c.scrollHeight - c.clientHeight, doc: document.documentElement.scrollHeight > innerHeight + 1 };
  });

  for (const [label, w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await install(ctx, state);
    const page = await ctx.newPage();
    const shots = label.startsWith('laptop') || label.startsWith('phone');
    const results = [];
    const snap = async (name) => {
      const m = await measure(page);
      results.push([name, m]);
      if (m.scrolls || m.doc) failures++;
      if (shots) await page.screenshot({ path: `fit-${label.split(' ')[0]}-${name.replace(/\W+/g, '_')}.png` });
    };

    await page.goto(`${BASE}/lock`);
    await page.waitForSelector('text=Sign in to Vaultify');
    await snap('0 sign in (default)');
    await page.locator('button', { hasText: /^Create account$/ }).click();
    await page.waitForSelector('text=Create your account');
    await snap('1 choose');
    await page.click('button:has-text("Sync across devices")');
    await page.waitForSelector('#email');
    await page.fill('#master-password', 'Some-Long-Password-1'); // strength meter visible
    await snap('2 cloud details');
    await page.click('button:has-text("Back")');
    await page.click('button:has-text("This device only")');
    await page.waitForSelector('#master-password');
    await snap('2 local details');
    await page.fill('#master-password', 'x');
    await page.fill('#confirm-password', 'y');
    await page.click('button[type=submit]');
    await page.waitForSelector('text=at least 10 characters');
    await snap('2 local with error');
    await page.locator('button', { hasText: /^Sign in$/ }).first().click();
    await snap('sign in');
    await page.click('text=Forgot your password?');
    await snap('forgot');

    // unlock screen (local vault)
    await page.goto(`${BASE}/lock`);
    await page.locator('button', { hasText: /^Create account$/ }).click();
    await page.click('button:has-text("This device only")');
    await page.fill('#master-password', 'Fit-Test-Password-1');
    await page.fill('#confirm-password', 'Fit-Test-Password-1');
    await page.click('button[type=submit]');
    await page.waitForSelector('#site');
    await page.click('button:has-text("Lock Vault")').catch(async () => { await page.evaluate(() => sessionStorage.removeItem('vault_dek')); });
    await page.goto(`${BASE}/lock`);
    await page.waitForSelector('text=Welcome back');
    await snap('unlock');
    await page.click('text=Reset vault');
    await snap('unlock reset-confirm');

    console.log(`\n${label}`);
    for (const [name, m] of results) console.log(`  ${m.scrolls || m.doc ? 'SCROLLS ' : 'fits    '} ${name}${m.scrolls ? `  (+${m.over}px)` : ''}`);
    await ctx.close();
  }

  await browser.close();
  console.log(failures === 0 ? '\nEVERY AUTH SCREEN FITS WITHOUT SCROLLING' : `\n${failures} screen(s) scroll`);
})().catch((e) => { console.error(e); process.exit(1); });
