const { chromium } = require('playwright'); // run via: npm run test:e2e
const { createState, install } = require('./mock-supabase');

const BASE = process.env.BASE_URL || 'http://localhost:3100';
let failures = 0;
const openCreate = async (page) => { await page.locator('button', { hasText: /^Create account$/ }).click(); await page.waitForSelector('text=Create your account'); };

const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
  if (!cond) failures++;
};

(async () => {
  const browser = await chromium.launch();
  const state = createState();

  // ---------- fresh local vault ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await install(ctx, state);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(`${BASE}/lock`);
    await page.waitForSelector('text=Sign in to Vaultify');
    check('auth screen opens on SIGN IN first, with Sign in as the first tab', (await page.locator('[class*=grid-cols-2] button').first().innerText()) === 'Sign in');
    await openCreate(page);
    check('step 1 shows both mode tiles and NO form fields yet', (await page.locator('#master-password').count()) === 0 && (await page.locator('#email').count()) === 0 && (await page.locator('text=Sync across devices').count()) >= 1 && (await page.locator('text=This device only').count()) >= 1);
    check('register screen shows both mode cards', (await page.locator('text=Sync across devices').count()) === 1 && (await page.locator('text=This device only').count()) === 1);

    await page.click('button:has-text("This device only")');
    await page.waitForSelector('#master-password');
    check('step 2 (local) asks for password only', (await page.locator('#email').count()) === 0 && (await page.locator('text=Back').count()) >= 1);
    check('email field hidden in local mode', (await page.locator('#email').count()) === 0);

    await page.fill('#master-password', 'short');
    await page.fill('#confirm-password', 'short');
    await page.click('button[type=submit]');
    await page.waitForSelector('text=at least 10 characters');
    check('short master password rejected', true);

    await page.fill('#master-password', 'Local-Vault-Pass-1');
    await page.fill('#confirm-password', 'different-pass-1');
    await page.click('button[type=submit]');
    await page.waitForSelector('text=Passwords do not match');
    check('mismatched confirmation rejected', true);

    await page.fill('#confirm-password', 'Local-Vault-Pass-1');
    await page.click('button[type=submit]');
    await page.waitForURL(`${BASE}/`, { timeout: 15000 });
    await page.waitForSelector('#site');
    check('local vault created and dashboard opened', true);

    await page.fill('#site', 'GitHub');
    await page.fill('#username', 'octo');
    await page.fill('#password', 'gh-secret-Pass!9');
    await page.click('button:has-text("Save Password")');
    await page.waitForSelector('h3:has-text("GitHub")');
    check('entry added', true);

    const stored = await page.evaluate(() => ({
      meta: JSON.parse(localStorage.getItem('vault_meta')),
      data: JSON.parse(localStorage.getItem('vault_data')),
      dek: sessionStorage.getItem('vault_dek'),
      legacy: ['master_hash', 'passwords', 'groups'].map((k) => localStorage.getItem(k)),
    }));
    check('vault meta is v2 local', stored.meta.v === 2 && stored.meta.mode === 'local' && !!stored.meta.wrappedDek);
    check('data at rest is ciphertext (no plaintext)', stored.data.startsWith('v2:') && !stored.data.includes('GitHub') && !stored.data.includes('gh-secret'));
    check('raw master password is NOT kept anywhere', !JSON.stringify(stored).includes('Local-Vault-Pass-1'));
    check('no legacy keys left', stored.legacy.every((v) => v === null));

    // reload keeps session (unlocked)
    await page.reload();
    await page.waitForSelector('h3:has-text("GitHub")');
    check('reload stays unlocked with data intact', true);

    // lock -> wrong password -> right password
    await page.click('button:has-text("Lock Vault")');
    await page.waitForURL(`${BASE}/lock`);
    await page.waitForSelector('text=Welcome back');
    await page.fill('#master-password', 'totally-wrong-pass');
    await page.click('button[type=submit]');
    await page.waitForSelector('text=Incorrect master password');
    check('wrong password rejected on unlock', true);

    await page.fill('#master-password', 'Local-Vault-Pass-1');
    const t0 = Date.now();
    await page.click('button[type=submit]');
    const label = await page.locator('button[type=submit]').innerText();
    check('button shows loading state while unlocking', /Processing/.test(label), label.trim());
    await page.waitForURL(`${BASE}/`, { timeout: 15000 });
    await page.waitForSelector('h3:has-text("GitHub")');
    check('unlock restores entries', true, `${Date.now() - t0}ms`);

    // activity log (local)
    await page.click('.sidebar-link:has-text("Settings")');
    await page.waitForSelector('[role=tablist]');
    check('settings shows local account panel', (await page.locator('text=Local vault').count()) > 0);
    check('enable cloud sync offered', (await page.locator('button:has-text("Enable cloud sync")').count()) === 1);
    await page.click('[role=tab]:has-text("Activity")');
    await page.waitForSelector('text=Recent activity');
    check('activity lists unlock event', (await page.locator('text=Vault unlocked').count()) > 0);
    await page.click('[role=tab]:has-text("Security")');

    // change master password (local)
    await page.fill('#cur-pw', 'Local-Vault-Pass-1');
    await page.fill('#new-pw', 'Brand-New-Master-Pass-2');
    await page.fill('#new-pw2', 'Brand-New-Master-Pass-2');
    await page.click('button:has-text("Update master password")');
    await page.waitForSelector('text=Master password updated');
    check('local master password changed', true);

    await page.click('button:has-text("Lock Vault")');
    await page.waitForSelector('text=Welcome back');
    await page.fill('#master-password', 'Local-Vault-Pass-1');
    await page.click('button[type=submit]');
    await page.waitForSelector('text=Incorrect master password');
    check('old password no longer works', true);
    await page.fill('#master-password', 'Brand-New-Master-Pass-2');
    await page.click('button[type=submit]');
    await page.waitForSelector('h3:has-text("GitHub")');
    check('new password unlocks and data survived', true);

    check('no page errors (fresh local)', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- legacy (v1) vault migration ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await install(ctx, state);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(`${BASE}/lock`);
    await page.waitForSelector('text=Sign in to Vaultify');

    // Seed exactly what the OLD app wrote: unsalted SHA-256 hash, PBKDF2(100k)+AES-GCM blobs.
    await page.evaluate(async (password) => {
      const enc = new TextEncoder();
      const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
      const encryptLegacy = async (data) => {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const pk = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, pk, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data))));
        const out = new Uint8Array(28 + ct.length);
        out.set(salt, 0); out.set(iv, 16); out.set(ct, 28);
        return b64(out);
      };
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(password)))).map((b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('master_hash', JSON.stringify(hash));
      localStorage.setItem('is_locked', JSON.stringify(true));
      localStorage.setItem('passwords', JSON.stringify(await encryptLegacy([
        { id: 1, site: 'Instagram', username: 'tirth_baba', password: 'tirth@123', groupId: 42 },
        { id: 2, site: 'Netflix', username: 'me@x.com', password: 'Str0ng!Netflix#1' },
      ])));
      localStorage.setItem('groups', JSON.stringify(await encryptLegacy([{ id: 42, name: 'Social', passcodeHash: null }])));
    }, 'legacy-master-pw');

    await page.goto(`${BASE}/lock`);
    await page.waitForSelector('text=Welcome back');
    check('legacy vault detected -> unlock screen', true);
    check('upgrade notice shown', (await page.locator('text=upgraded to stronger encryption').count()) === 1);

    await page.fill('#master-password', 'wrong-legacy-pw');
    await page.click('button[type=submit]');
    await page.waitForSelector('text=Incorrect master password');
    const legacyStillThere = await page.evaluate(() => localStorage.getItem('master_hash') !== null && localStorage.getItem('passwords') !== null);
    check('wrong password leaves legacy data untouched', legacyStillThere);

    await page.fill('#master-password', 'legacy-master-pw');
    await page.click('button[type=submit]');
    await page.waitForURL(`${BASE}/`, { timeout: 20000 });
    await page.waitForSelector('h3:has-text("Instagram")');
    check('legacy entries decrypted and shown', (await page.locator('h3:has-text("Netflix")').count()) === 1);
    check('legacy group preserved and entry still grouped', (await page.locator('h3:has-text("Social")').count()) === 1);

    const after = await page.evaluate(() => ({
      meta: JSON.parse(localStorage.getItem('vault_meta')),
      legacy: ['master_hash', 'passwords', 'groups', 'is_locked'].map((k) => localStorage.getItem(k)),
    }));
    check('migrated to v2 and legacy keys removed', after.meta?.v === 2 && after.legacy.every((v) => v === null));

    await page.click('button:has-text("Lock Vault")');
    await page.waitForSelector('text=Welcome back');
    await page.fill('#master-password', 'legacy-master-pw');
    await page.click('button[type=submit]');
    await page.waitForSelector('h3:has-text("Instagram")');
    check('migrated vault unlocks again with the same password', true);

    check('no page errors (legacy)', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  console.log(failures === 0 ? '\nALL LOCAL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
