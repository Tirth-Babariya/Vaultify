#!/usr/bin/env node
/**
 * End-to-end runner.
 *
 * Builds the app against a fake Supabase URL (a Playwright request interceptor in
 * mock-supabase.js plays the backend), serves it, and runs each browser suite.
 * Nothing here ever talks to a real Supabase project.
 *
 *   npm run test:e2e                     all suites
 *   E2E_ONLY=local,cloud npm run test:e2e   just some
 *   E2E_SKIP_BUILD=1 npm run test:e2e       reuse the previous e2e build
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const PORT = process.env.E2E_PORT || '3100';
const BASE_URL = `http://localhost:${PORT}`;
const RESULTS = path.join(ROOT, 'test-results');
const ALL = ['local', 'theme-tabs', 'fit', 'cloud', 'export'];
const suites = process.env.E2E_ONLY ? process.env.E2E_ONLY.split(',').map((s) => s.trim()) : ALL;

// Process env wins over .env.local, so a developer's real keys are never used.
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'https://mock-vaultify.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock',
  NEXT_DIST_DIR: '.next-e2e', // keep the normal .next build untouched
};

let server;
const stopServer = () => {
  if (!server?.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/f', '/t'], { stdio: 'ignore' });
  else {
    try { process.kill(-server.pid); } catch { /* already gone */ }
  }
  server = null;
};
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopServer(); process.exit(130); });

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(`${BASE_URL}/lock`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server did not start on ${BASE_URL}`);
}

async function main() {
  fs.mkdirSync(RESULTS, { recursive: true });

  if (!process.env.E2E_SKIP_BUILD) {
    console.log('> Building the app against a mock backend...');
    const build = spawnSync('npm', ['run', 'build'], { cwd: ROOT, env, stdio: 'inherit', shell: true });
    if (build.status !== 0) throw new Error('Build failed');
  }

  console.log(`> Starting the app on ${BASE_URL}...`);
  server = spawn('npx', ['next', 'start', '-p', PORT], { cwd: ROOT, env, shell: true, stdio: 'ignore', detached: process.platform !== 'win32' });
  await waitForServer();

  const failed = [];
  for (const name of suites) {
    console.log(`\n=== ${name} ===`);
    const run = spawnSync(process.execPath, [path.join(__dirname, `${name}.js`)], {
      cwd: RESULTS, // screenshots land here
      env: { ...process.env, BASE_URL },
      stdio: 'inherit',
    });
    if (run.status !== 0) failed.push(name);
  }

  console.log(failed.length ? `\nFAILED suites: ${failed.join(', ')}` : '\nAll end-to-end suites passed.');
  return failed.length ? 1 : 0;
}

main()
  .then((code) => { stopServer(); process.exit(code); })
  .catch((err) => { console.error(err.message); stopServer(); process.exit(1); });
