// Unit tests for the Web Crypto layer. Run with: npm test  (Node 20.19+ / 22+)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../../src/lib/crypto.js';

const randomBytes = (n) => {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 65536) crypto.getRandomValues(out.subarray(i, Math.min(i + 65536, n)));
  return out;
};

test('base64 helpers round-trip large buffers', () => {
  const big = randomBytes(150000);
  assert.deepEqual(C.fromB64(C.toB64(big)), big);
});

test('key derivation is deterministic and separates the login secret from the wrapping key', async () => {
  const a1 = await C.deriveMasterKeys('correct horse battery staple', 'salt-1');
  const a2 = await C.deriveMasterKeys('correct horse battery staple', 'salt-1');
  assert.equal(a1.authSecret, a2.authSecret);
  assert.match(a1.authSecret, /^[0-9a-f]{64}$/);

  const otherSalt = await C.deriveMasterKeys('correct horse battery staple', 'salt-2');
  const otherPassword = await C.deriveMasterKeys('a completely different one', 'salt-1');
  assert.notEqual(a1.authSecret, otherSalt.authSecret);
  assert.notEqual(a1.authSecret, otherPassword.authSecret);

  // Same inputs => same wrapping key: a key wrapped on one device unwraps on another.
  const dek = await C.generateDek();
  const wrapped = await C.wrapDek(dek, a1.kek);
  const back = await C.unwrapDek(wrapped, a2.kek);
  assert.equal(await C.exportDek(back), await C.exportDek(dek));

  // Different password or salt => the wrapped key cannot be opened.
  await assert.rejects(C.unwrapDek(wrapped, otherPassword.kek));
  await assert.rejects(C.unwrapDek(wrapped, otherSalt.kek));
});

test('the cloud salt is derived from the email, case and whitespace insensitively', () => {
  assert.equal(C.cloudSalt('  Alice@Example.COM '), C.cloudSalt('alice@example.com'));
  assert.notEqual(C.cloudSalt('alice@example.com'), C.cloudSalt('bob@example.com'));
});

test('encryptJson / decryptJson round-trip unicode and use a fresh IV every time', async () => {
  const dek = await C.generateDek();
  const data = { entries: [{ id: 1, site: 'GitHub', password: 'pässwörd-✓-日本語' }], groups: [], tombstones: {} };
  const one = await C.encryptJson(data, dek);
  const two = await C.encryptJson(data, dek);
  assert.ok(one.startsWith('v2:'));
  assert.notEqual(one, two);
  assert.deepEqual(await C.decryptJson(one, dek), data);
  assert.ok(!one.includes('GitHub') && !one.includes('pässwörd'));
});

test('ciphertext is authenticated: tampering or the wrong key is rejected', async () => {
  const dek = await C.generateDek();
  const other = await C.generateDek();
  const payload = await C.encryptJson({ secret: 'value' }, dek);

  const mid = Math.floor(payload.length / 2);
  const tampered = payload.slice(0, mid) + (payload[mid] === 'A' ? 'B' : 'A') + payload.slice(mid + 1);
  await assert.rejects(C.decryptJson(tampered, dek));
  await assert.rejects(C.decryptJson(payload, other));
});

test('recovery keys have the documented format and unlock the vault key', async () => {
  const keys = new Set(Array.from({ length: 200 }, () => C.generateRecoveryKey()));
  assert.equal(keys.size, 200);
  for (const k of keys) assert.match(k, /^([A-Z2-7]{4}-){7}[A-Z2-7]{4}$/);

  const key = [...keys][0];
  const dek = await C.generateDek();
  const wrapped = await C.wrapDek(dek, await C.deriveRecoveryKek(key));

  // Users may type it lower-case, with spaces, or without dashes.
  for (const typed of [key.toLowerCase(), key.replaceAll('-', ''), key.replaceAll('-', ' ')]) {
    const back = await C.unwrapDek(wrapped, await C.deriveRecoveryKek(typed));
    assert.equal(await C.exportDek(back), await C.exportDek(dek));
  }
  await assert.rejects(C.unwrapDek(wrapped, await C.deriveRecoveryKek(C.generateRecoveryKey())));
});

test('legacy (v1) helpers still read vaults written by the old app', async () => {
  // SHA-256("abc") test vector
  assert.equal(await C.hashPassword('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

  // Encrypt exactly like the original app: PBKDF2(100k) + AES-GCM, base64(salt|iv|ciphertext).
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', enc.encode('old-master'), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify([{ id: 1, site: 'Old' }]))));
  const blob = new Uint8Array(28 + cipher.length);
  blob.set(salt, 0); blob.set(iv, 16); blob.set(cipher, 28);

  assert.deepEqual(await C.decryptLegacy(C.toB64(blob), 'old-master'), [{ id: 1, site: 'Old' }]);
  await assert.rejects(C.decryptLegacy(C.toB64(blob), 'wrong-master'));
});

test('encrypted backup round-trips with the right password only', async () => {
  const data = { passwords: [{ id: '1', site: 'GitHub', username: 'me', password: 'hunter2-Ünïcode' }] };
  const file = await C.encryptBackup(data, 'correct horse');
  assert.ok(C.isBackupFile(file));
  assert.deepEqual(await C.decryptBackup(file, 'correct horse'), data);
  await assert.rejects(() => C.decryptBackup(file, 'wrong horse'));
});

test('encrypted backup never contains the plaintext and is salted per export', async () => {
  const data = { passwords: [{ site: 'Bank', password: 'S3cret-Value-42' }] };
  const a = await C.encryptBackup(data, 'pw');
  const b = await C.encryptBackup(data, 'pw');
  assert.ok(!a.includes('S3cret-Value-42') && !a.includes('Bank'));
  assert.notEqual(JSON.parse(a).salt, JSON.parse(b).salt);
  assert.notEqual(JSON.parse(a).data, JSON.parse(b).data);
});

test('tampered or foreign backup files are rejected', async () => {
  const file = JSON.parse(await C.encryptBackup({ passwords: [] }, 'pw'));
  const flipped = { ...file, data: file.data.slice(0, -4) + (file.data.endsWith('AAAA') ? 'BBBB' : 'AAAA') };
  await assert.rejects(() => C.decryptBackup(JSON.stringify(flipped), 'pw'));
  await assert.rejects(() => C.decryptBackup(JSON.stringify({ ...file, iterations: 1 }), 'pw'));
  await assert.rejects(() => C.decryptBackup(JSON.stringify([{ site: 'x' }]), 'pw'));
  assert.equal(C.isBackupFile('[{"site":"x"}]'), false);
  assert.equal(C.isBackupFile('not json'), false);
});
