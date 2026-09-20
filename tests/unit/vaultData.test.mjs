// Unit tests for the multi-device merge logic. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyVault, normalizeVault, mergeVaults, newId } from '../../src/lib/vaultData.js';

const entry = (id, site, updatedAt, extra = {}) => ({ id, site, username: 'u', password: 'p', updatedAt, ...extra });
const vault = (entries = [], groups = [], tombstones = {}) => ({ entries, groups, tombstones });
const byId = (list) => [...list].sort((a, b) => a.id - b.id);

test('normalizeVault tolerates missing or junk data', () => {
  assert.deepEqual(normalizeVault(undefined), emptyVault());
  assert.deepEqual(normalizeVault({ entries: 'nope', groups: null, tombstones: 5 }), emptyVault());
  assert.deepEqual(normalizeVault({ entries: [1], groups: [2], tombstones: { a: 1 } }), { entries: [1], groups: [2], tombstones: { a: 1 } });
});

test('newId returns a safe, positive integer', () => {
  const id = newId();
  assert.ok(Number.isSafeInteger(id) && id > 0);
});

test('entries added on two devices are both kept', () => {
  const local = vault([entry(1, 'GitHub', 10)]);
  const remote = vault([entry(2, 'Netflix', 20)]);
  const { vault: merged, fromRemote, toRemote } = mergeVaults(local, remote);
  assert.deepEqual(byId(merged.entries).map((e) => e.site), ['GitHub', 'Netflix']);
  assert.equal(fromRemote, true);
  assert.equal(toRemote, true);
});

test('identical vaults need no sync in either direction', () => {
  const v = vault([entry(1, 'GitHub', 10)], [], { 'e:9': 5 });
  const { fromRemote, toRemote } = mergeVaults(v, structuredClone(v));
  assert.equal(fromRemote, false);
  assert.equal(toRemote, false);
});

test('the most recent edit of the same entry wins', () => {
  const older = vault([entry(1, 'Old name', 10)]);
  const newer = vault([entry(1, 'New name', 99)]);
  assert.equal(mergeVaults(older, newer).vault.entries[0].site, 'New name');
  assert.equal(mergeVaults(newer, older).vault.entries[0].site, 'New name');
});

test('exact timestamp ties resolve identically on every device (merge is commutative)', () => {
  const a = vault([entry(1, 'From A', 50)]);
  const b = vault([entry(1, 'From B', 50)]);
  const ab = mergeVaults(a, b).vault;
  const ba = mergeVaults(b, a).vault;
  assert.deepEqual(ab, ba);
});

test('a deletion propagates and the deleted entry is not resurrected', () => {
  const stale = vault([entry(1, 'Deleted on B', 10)]);
  const fresh = vault([], [], { 'e:1': 100 });
  const merged = mergeVaults(stale, fresh).vault;
  assert.equal(merged.entries.length, 0);
  assert.equal(merged.tombstones['e:1'], 100);
  // ...regardless of which side is "local"
  assert.equal(mergeVaults(fresh, stale).vault.entries.length, 0);
});

test('an edit made after a deletion survives it', () => {
  const restored = vault([entry(1, 'Edited later', 200)]);
  const deleted = vault([], [], { 'e:1': 100 });
  assert.equal(mergeVaults(restored, deleted).vault.entries.length, 1);
});

test('groups merge and delete the same way as entries', () => {
  const local = vault([], [{ id: 1, name: 'Work', updatedAt: 10 }]);
  const remote = vault([], [{ id: 2, name: 'Family', updatedAt: 20 }], { 'g:1': 50 });
  const merged = mergeVaults(local, remote).vault;
  assert.deepEqual(merged.groups.map((g) => g.name), ['Family']);
});

test('tombstones from both sides are combined, keeping the latest', () => {
  const merged = mergeVaults(vault([], [], { 'e:1': 10, 'e:2': 30 }), vault([], [], { 'e:1': 20, 'e:3': 5 })).vault;
  assert.deepEqual(merged.tombstones, { 'e:1': 20, 'e:2': 30, 'e:3': 5 });
});

test('merging never mutates its inputs', () => {
  const local = vault([entry(1, 'A', 1)]);
  const remote = vault([entry(2, 'B', 2)]);
  const snapshot = structuredClone({ local, remote });
  mergeVaults(local, remote);
  assert.deepEqual({ local, remote }, snapshot);
});
