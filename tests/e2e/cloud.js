const { chromium } = require('playwright'); // run via: npm run test:e2e
const { createState, install, mintSession } = require('./mock-supabase');

const BASE = process.env.BASE_URL || 'http://localhost:3100';
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
  if (!cond) failures++;
};
const openCreate = async (page) => { await page.locator('button', { hasText: /^Create account$/ }).click(); await page.waitForSelector('text=Create your account'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, label, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await sleep(150); }
  throw new Error('timeout waiting for: ' + label);
};

const EMAIL = 'alice@example.com';
const PW1 = 'Cloud-Master-Pass-1';
const PW2 = 'Changed-Master-Pass-2';
const PW3 = 'Recovered-Master-Pass-3';

(async () => {
  const browser = await chromium.launch();
  const state = createState({ autoconfirm: false });
  const pageErrors = [];

  const device = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await install(ctx, state);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => pageErrors.push(`${name}: ${e.message}`));
    return { ctx, page };
  };
  const focusSync = async (page) => { await page.evaluate(() => window.dispatchEvent(new Event('focus'))); };
  const hasEntry = (page, name) => page.locator(`h3:has-text("${name}")`).count().then((n) => n > 0);
  const addEntry = async (page, site, user, pw) => {
    await page.fill('#site', site);
    await page.fill('#username', user);
    await page.fill('#password', pw);
    await page.click('button:has-text("Save Password")');
    await page.waitForSelector(`h3:has-text("${site}")`);
  };
  const vaultVersion = () => state.vaults.get(state.users.get(EMAIL)?.id)?.version ?? 0;
  const signInForm = async (page, email, pw) => {
    await page.locator('button', { hasText: /^Sign in$/ }).first().click();
    await page.fill('#email', email);
    await page.fill('#master-password', pw);
    await page.click('button[type=submit]');
  };

  // ============ Device A: sign up ============
  const A = await device('A');
  await A.page.goto(`${BASE}/lock`);
  await A.page.waitForSelector('text=Sign in to Vaultify');
  await openCreate(A.page);
  await A.page.click('button:has-text("Sync across devices")');
  await A.page.waitForSelector('#email');
  check('step 2 (cloud) asks for email + password + confirm', (await A.page.locator('#email').count()) === 1 && (await A.page.locator('#confirm-password').count()) === 1);

  await A.page.fill('#email', EMAIL);
  await A.page.fill('#master-password', PW1);
  await A.page.fill('#confirm-password', PW1);
  await A.page.click('button[type=submit]');
  await A.page.waitForSelector('text=Check your inbox');
  check('sign-up requires email confirmation (matches your Supabase setting)', true);
  check('account exists but unconfirmed', state.users.get(EMAIL)?.confirmed === false);

  await A.page.click('button:has-text("Continue to sign in")');
  check('password field cleared for sign-in step', (await A.page.inputValue('#master-password')) === '');
  await A.page.fill('#master-password', PW1);
  await A.page.click('button[type=submit]');
  await A.page.waitForSelector('text=Confirm your email first');
  check('sign-in blocked until email is confirmed', true);

  state.users.get(EMAIL).confirmed = true; // user clicks the link in their inbox
  await A.page.click('button[type=submit]');
  await A.page.waitForSelector('[role=dialog]');
  const recoveryKey = (await A.page.locator('[role=dialog] .font-mono').innerText()).trim();
  check('recovery key shown after first sign-in', /^[A-Z2-7]{4}(-[A-Z2-7]{4}){7}$/.test(recoveryKey), recoveryKey);
  check('continue is disabled until the key is acknowledged', await A.page.locator('[role=dialog] button:has-text("Continue to vault")').isDisabled());
  await A.page.check('[role=dialog] input[type=checkbox]');
  await A.page.click('[role=dialog] button:has-text("Continue to vault")');
  await A.page.waitForURL(`${BASE}/`);
  await A.page.waitForSelector('#site');
  await A.page.waitForSelector('aside >> text=Synced');
  check('dashboard shows email + Synced badge', (await A.page.locator(`aside >> text=${EMAIL}`).count()) === 1);

  const row0 = state.vaults.get(state.users.get(EMAIL).id);
  check('cloud vault row created with wrapped keys + recovery wrap', !!row0 && row0.wrapped_dek_pw.startsWith('w1:') && row0.wrapped_dek_recovery.startsWith('w1:'));
  const authSecretOnServer = state.users.get(EMAIL).secret;
  const wrappedPw0 = row0.wrapped_dek_pw; // capture: row0 is a live reference into the mock
  check('server auth secret is derived, NOT the master password', authSecretOnServer !== PW1 && /^[0-9a-f]{64}$/.test(authSecretOnServer));

  await addEntry(A.page, 'Netflix', 'me@x.com', 'nf-secret-Pass#1');
  await waitFor(() => vaultVersion() >= 2, 'A first push');
  const rowA = state.vaults.get(state.users.get(EMAIL).id);
  check('cloud data is ciphertext (no plaintext)', rowA.data.startsWith('v2:') && !rowA.data.includes('Netflix') && !rowA.data.includes('nf-secret'));

  // ============ Device B: sign in on a fresh device ============
  const B = await device('B');
  await B.page.goto(`${BASE}/lock`);
  await B.page.waitForSelector('text=Sign in to Vaultify');
  await signInForm(B.page, EMAIL, 'definitely-wrong');
  await B.page.waitForSelector('text=Incorrect email or master password');
  check('wrong password rejected on new device', true);
  await B.page.fill('#master-password', PW1);
  await B.page.click('button[type=submit]');
  await B.page.waitForURL(`${BASE}/`, { timeout: 20000 });
  await B.page.waitForSelector('h3:has-text("Netflix")');
  check('device B pulls the vault after signing in (no recovery prompt)', (await B.page.locator('[role=dialog]').count()) === 0);

  // ============ Cross-device sync ============
  await addEntry(B.page, 'GitHub', 'octo', 'gh-secret-Pass#2');
  await waitFor(() => vaultVersion() >= 3, 'B push');
  await focusSync(A.page);
  await waitFor(() => hasEntry(A.page, 'GitHub'), 'A receives GitHub');
  check('B -> A sync', true);

  // ============ Simultaneous edits (conflict merge) ============
  await Promise.all([
    addEntry(A.page, 'AlphaSite', 'a', 'alpha-pass-1'),
    addEntry(B.page, 'BetaSite', 'b', 'beta-pass-1'),
  ]);
  await sleep(2500);
  await focusSync(A.page); await focusSync(B.page);
  await sleep(2500);
  await focusSync(A.page); await focusSync(B.page);
  try {
    await waitFor(async () => (await hasEntry(A.page, 'BetaSite')) && (await hasEntry(B.page, 'AlphaSite')), 'both merged', 15000);
  } catch (e) {
    for (const [n, d] of [['A', A], ['B', B]]) {
      const info = await d.page.evaluate(() => ({ meta: JSON.parse(localStorage.getItem('vault_meta')), titles: [...document.querySelectorAll('h3')].map((h) => h.textContent), badge: (document.querySelector('aside')?.innerText || '').replace(/\n/g, ' | ') }));
      console.log('DIAG', n, JSON.stringify({ remoteVersion: info.meta.remoteVersion, dirty: info.meta.dirty, titles: info.titles, badge: info.badge }));
    }
    console.log('DIAG server version', vaultVersion());
    throw e;
  }
  check('simultaneous edits on two devices merge without loss', (await hasEntry(A.page, 'AlphaSite')) && (await hasEntry(B.page, 'BetaSite')));

  // ============ Deletion propagates (tombstone) ============
  await A.page.locator('div.card:has(h3:has-text("GitHub")) button[aria-label="Delete entry"]').click({ force: true });
  await waitFor(async () => !(await hasEntry(A.page, 'GitHub')), 'A deletes');
  await sleep(1500);
  await focusSync(B.page);
  await waitFor(async () => !(await hasEntry(B.page, 'GitHub')), 'B sees deletion', 20000);
  await sleep(1500); await focusSync(A.page); await sleep(1500);
  check('deleted entry disappears on the other device and is not resurrected', !(await hasEntry(A.page, 'GitHub')) && !(await hasEntry(B.page, 'GitHub')));

  // ============ Offline edits ============
  state.offline = true;
  await addEntry(A.page, 'OfflineSite', 'o', 'offline-pass-1');
  await A.page.waitForSelector('aside >> text=/Offline|Syncing/', { timeout: 15000 });
  await waitFor(async () => (await A.page.locator('aside >> text=Offline').count()) > 0, 'A shows offline', 20000);
  check('offline edit saved locally and badge shows Offline', true);
  state.offline = false;
  await focusSync(A.page);
  await A.page.waitForSelector('aside >> text=Synced', { timeout: 20000 });
  await focusSync(B.page);
  await waitFor(() => hasEntry(B.page, 'OfflineSite'), 'B gets offline edit', 20000);
  check('offline edit syncs after reconnecting', true);

  // ============ Activity ============
  await A.page.click('.sidebar-link:has-text("Settings")');
  await A.page.click('[role=tab]:has-text("Activity")');
  await A.page.waitForSelector('text=Recent activity');
  await waitFor(async () => (await A.page.locator('text=Signed in').count()) > 0, 'activity loads');
  check('activity shows sign-in with "This device" marker', (await A.page.locator('text=This device').count()) > 0);
  check('server received the login events', state.events.some((e) => e.event === 'sign_in') && state.events.length >= 2);

  // ============ Change master password ============
  await A.page.click('[role=tab]:has-text("Security")');
  await A.page.fill('#cur-pw', 'not-the-current-one');
  await A.page.fill('#new-pw', PW2);
  await A.page.fill('#new-pw2', PW2);
  await A.page.click('button:has-text("Update master password")');
  await A.page.waitForSelector('text=Incorrect master password');
  check('change password requires the correct current password', true);
  await A.page.fill('#cur-pw', PW1);
  await A.page.click('button:has-text("Update master password")');
  await A.page.waitForSelector('text=Master password updated');
  await waitFor(() => state.users.get(EMAIL).secret !== authSecretOnServer, 'auth secret rotated');
  await waitFor(() => state.vaults.get(state.users.get(EMAIL).id).wrapped_dek_pw !== wrappedPw0, 'wrapped key re-uploaded');
  check('master password changed: auth secret + wrapped key rotated on server', true);
  const dataBefore = rowA.data;

  await focusSync(B.page);
  await sleep(3000);
  await B.page.click('button:has-text("Lock Vault")');
  await B.page.waitForSelector('text=Welcome back');
  await B.page.fill('#master-password', PW1);
  await B.page.click('button[type=submit]');
  await B.page.waitForSelector('text=Incorrect master password');
  check('device B: old password no longer unlocks after sync', true);
  await B.page.fill('#master-password', PW2);
  await B.page.click('button[type=submit]');
  await B.page.waitForSelector('h3:has-text("Netflix")');
  check('device B: new password unlocks the cached vault', true);

  // ============ Sign out clears the device ============
  await B.page.click('.sidebar-link:has-text("Settings")');
  await B.page.click('button:has-text("Sign out of this device")');
  await B.page.locator('button', { hasText: /^Sign out$/ }).click();
  await B.page.waitForURL(`${BASE}/lock`);
  await B.page.waitForSelector('text=Sign in to Vaultify');
  const leftovers = await B.page.evaluate(() => ({ meta: localStorage.getItem('vault_meta'), data: localStorage.getItem('vault_data'), dek: sessionStorage.getItem('vault_dek') }));
  check('sign out removes the local vault copy from that device', !leftovers.meta && !leftovers.data && !leftovers.dek);
  await signInForm(B.page, EMAIL, PW2);
  await B.page.waitForSelector('h3:has-text("Netflix")', { timeout: 20000 });
  check('signing back in restores everything from the cloud', await hasEntry(B.page, 'OfflineSite'));

  // ============ Recovery via reset-email session ============
  const R = await device('R');
  await R.page.goto(`${BASE}/lock`);
  const session = mintSession(state, EMAIL);
  await R.page.evaluate((s) => localStorage.setItem('sb-mock-vaultify-auth-token', JSON.stringify(s)), session);
  await R.page.goto(`${BASE}/recover`);
  await R.page.waitForSelector(`text=Set a new master password for ${EMAIL}`);
  await R.page.fill('#recovery-key', 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH');
  await R.page.fill('#new-master', PW3);
  await R.page.fill('#new-master-2', PW3);
  await R.page.click('button[type=submit]');
  await R.page.waitForSelector('text=recovery key is not correct');
  check('wrong recovery key is rejected', true);
  await R.page.fill('#recovery-key', recoveryKey.toLowerCase());
  await R.page.click('button[type=submit]');
  await R.page.waitForURL(`${BASE}/`, { timeout: 20000 });
  await R.page.waitForSelector('h3:has-text("Netflix")');
  check('recovery key restores access and sets a new master password', await hasEntry(R.page, 'OfflineSite'));

  const D = await device('D');
  await D.page.goto(`${BASE}/lock`);
  await signInForm(D.page, EMAIL, PW2);
  await D.page.waitForSelector('text=Incorrect email or master password');
  await D.page.fill('#master-password', PW3);
  await D.page.click('button[type=submit]');
  await D.page.waitForSelector('h3:has-text("Netflix")', { timeout: 20000 });
  check('after recovery: old password fails, new password signs in', true);

  // ============ Enable cloud sync from a local vault ============
  const L = await device('L');
  await L.page.goto(`${BASE}/lock`);
  await openCreate(L.page);
  await L.page.click('button:has-text("This device only")');
  await L.page.fill('#master-password', 'Local-To-Cloud-Pass-1');
  await L.page.fill('#confirm-password', 'Local-To-Cloud-Pass-1');
  await L.page.click('button[type=submit]');
  await L.page.waitForSelector('#site');
  await addEntry(L.page, 'LocalOnlySite', 'l', 'local-pass-1');
  await L.page.click('.sidebar-link:has-text("Settings")');
  await L.page.click('button:has-text("Enable cloud sync")');
  await L.page.fill('#enable-email', 'bob@example.com');
  await L.page.fill('#enable-pw', 'wrong-local-password');
  await L.page.click('button:has-text("Enable sync")');
  await L.page.waitForSelector('text=Incorrect master password');
  check('enabling sync verifies the current master password', true);
  await L.page.fill('#enable-pw', 'Local-To-Cloud-Pass-1');
  await L.page.click('button:has-text("Enable sync")');
  await L.page.waitForSelector('text=verification link');
  check('enable sync asks the user to confirm their email first', true);
  state.users.get('bob@example.com').confirmed = true;
  await L.page.click('button:has-text("Enable sync")');
  await L.page.waitForSelector('[role=dialog]');
  await L.page.check('[role=dialog] input[type=checkbox]');
  await L.page.click('[role=dialog] button:has-text("Continue to vault")');
  await waitFor(async () => (await L.page.locator('text=Cloud sync').count()) > 0, 'account panel updates');
  const bobRow = state.vaults.get(state.users.get('bob@example.com').id);
  check('local vault upgraded to cloud; entry uploaded encrypted', !!bobRow && !bobRow.data.includes('LocalOnlySite'));

  const F = await device('F');
  await F.page.goto(`${BASE}/lock`);
  await signInForm(F.page, 'bob@example.com', 'Local-To-Cloud-Pass-1');
  await F.page.waitForSelector('h3:has-text("LocalOnlySite")', { timeout: 20000 });
  check('a second device sees the upgraded local entries', true);

  // ============ Switch back to local-only ============
  await L.page.click('button:has-text("Switch to local-only")');
  await L.page.fill('#disable-pw', 'Local-To-Cloud-Pass-1');
  await L.page.check('text=Also delete the encrypted copy from the cloud');
  await L.page.locator('button', { hasText: 'Turn off sync' }).last().click();
  await waitFor(() => !state.vaults.has(state.users.get('bob@example.com').id), 'remote deleted');
  await waitFor(async () => (await L.page.locator('text=This device only').count()) > 0, 'panel shows local');
  check('switching to local-only deletes the cloud copy and keeps data on device', true);
  await L.page.click('button:has-text("Lock Vault")');
  await L.page.waitForSelector('text=Welcome back');
  await L.page.fill('#master-password', 'Local-To-Cloud-Pass-1');
  await L.page.click('button[type=submit]');
  await L.page.waitForSelector('h3:has-text("LocalOnlySite")');
  check('local-only vault still unlocks with the same password', true);

  // ============ Duplicate email ============
  const E = await device('E');
  await E.page.goto(`${BASE}/lock`);
  await openCreate(E.page);
  await E.page.click('button:has-text("Sync across devices")');
  await E.page.fill('#email', EMAIL);
  await E.page.fill('#master-password', 'Another-Long-Password-9');
  await E.page.fill('#confirm-password', 'Another-Long-Password-9');
  await E.page.click('button[type=submit]');
  await E.page.waitForSelector('text=already exists');
  check('registering an existing email is rejected clearly', true);

  // ============ What the server ever saw ============
  const seen = state.bodies.join('\n');
  const leaked = [PW1, PW2, PW3, 'Local-To-Cloud-Pass-1', 'nf-secret-Pass#1', 'gh-secret', 'Netflix', 'OfflineSite', 'LocalOnlySite', recoveryKey].filter((needle) => seen.includes(needle));
  check('server never received any master password, recovery key, or plaintext entry', leaked.length === 0, leaked.join(', '));

  check('no page errors across all devices', pageErrors.length === 0, pageErrors.join(' | '));

  await browser.close();
  console.log(failures === 0 ? '\nALL CLOUD CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('\nTEST ABORTED:', e.message); process.exit(1); });
