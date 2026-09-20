// Shape of the decrypted vault. Every entry/group carries `updatedAt`, and
// deletions leave a tombstone, so two devices can be merged without one
// overwriting (or resurrecting) the other's changes.

export const emptyVault = () => ({ entries: [], groups: [], tombstones: {} });

export const normalizeVault = (data) => ({
  entries: Array.isArray(data?.entries) ? data.entries : [],
  groups: Array.isArray(data?.groups) ? data.groups : [],
  tombstones: data?.tombstones && typeof data.tombstones === 'object' ? data.tombstones : {},
});

const stamp = (item) => item.updatedAt ?? 0;

// Collision-resistant numeric id (safe integer): two devices creating items in the
// same millisecond must not produce the same id.
export const newId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

// Newer wins; exact ties are broken deterministically so every device converges.
const pickWinner = (l, r) => {
  if (stamp(r) !== stamp(l)) return stamp(r) > stamp(l) ? r : l;
  return JSON.stringify(r) > JSON.stringify(l) ? r : l;
};

function mergeList(kind, local, remote, tombstones) {
  const localMap = new Map(local.map((item) => [item.id, item]));
  const remoteMap = new Map(remote.map((item) => [item.id, item]));
  const merged = [];

  for (const id of new Set([...localMap.keys(), ...remoteMap.keys()])) {
    const l = localMap.get(id);
    const r = remoteMap.get(id);
    const winner = !l ? r : !r ? l : pickWinner(l, r);
    const deletedAt = tombstones[`${kind}:${id}`];
    if (deletedAt !== undefined && deletedAt >= stamp(winner)) continue;
    merged.push(winner);
  }
  return merged;
}

const sameItems = (a, b) => {
  if (a.length !== b.length) return false;
  const bMap = new Map(b.map((item) => [item.id, JSON.stringify(item)]));
  return a.every((item) => bMap.get(item.id) === JSON.stringify(item));
};

const sameKeys = (a, b) => {
  const ak = Object.keys(a);
  return ak.length === Object.keys(b).length && ak.every((k) => a[k] === b[k]);
};

/**
 * Merge two vaults. `fromRemote` is true when the result differs from `local`
 * (the UI/local copy must be updated); `toRemote` is true when it differs from
 * `remote` (the cloud copy must be updated).
 */
export function mergeVaults(localInput, remoteInput) {
  const local = normalizeVault(localInput);
  const remote = normalizeVault(remoteInput);

  const tombstones = { ...remote.tombstones };
  for (const [key, ts] of Object.entries(local.tombstones)) {
    if ((tombstones[key] ?? -1) < ts) tombstones[key] = ts;
  }

  const vault = {
    entries: mergeList('e', local.entries, remote.entries, tombstones),
    groups: mergeList('g', local.groups, remote.groups, tombstones),
    tombstones,
  };

  const same = (side) =>
    sameItems(vault.entries, side.entries) && sameItems(vault.groups, side.groups) && sameKeys(vault.tombstones, side.tombstones);

  return { vault, fromRemote: !same(local), toRemote: !same(remote) };
}
