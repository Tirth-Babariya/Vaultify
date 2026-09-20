/**
 * Vault core: the decrypted vault lives in memory (`current`) and is the single
 * source of truth for the UI. Every change goes through `mutate()`, which
 * updates memory, re-encrypts to localStorage and (in cloud mode) nudges the
 * sync engine.
 */
import { storage, session } from './storage';
import * as C from './crypto';
import { emptyVault, normalizeVault } from './vaultData';
import { recordActivity } from './activity';

export class VaultError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const META = 'vault_meta';
const DATA = 'vault_data';
const SESSION_DEK = 'vault_dek';
const LEGACY_KEYS = ['master_hash', 'passwords', 'groups', 'is_locked'];

let dek = null;
let current = null;
let revision = 0;
let persistChain = Promise.resolve();
let mutationHook = null;
const listeners = new Set();

// ---- meta ------------------------------------------------------------------

export const getMeta = () => storage.get(META);
export const setMeta = (meta) => storage.set(META, meta);
export const patchMeta = (patch) => {
  const meta = getMeta();
  if (meta) setMeta({ ...meta, ...patch });
};

export const hasLegacyVault = () => !getMeta() && !!storage.get('master_hash');

export function getVaultStatus() {
  const meta = getMeta();
  const legacy = hasLegacyVault();
  return {
    exists: !!meta || legacy,
    legacy,
    mode: meta?.mode ?? (legacy ? 'local' : null),
    email: meta?.email ?? null,
  };
}

export const saltFor = (meta) => (meta.mode === 'cloud' ? C.cloudSalt(meta.email) : meta.salt);

// ---- session / lock --------------------------------------------------------

export const isUnlocked = () => !!session.get(SESSION_DEK);
export const getDek = () => dek;
export const getVault = () => current;
export const getRevision = () => revision;

async function setSessionDek(key) {
  dek = key;
  session.set(SESSION_DEK, await C.exportDek(key));
}

const notify = () => listeners.forEach((cb) => cb(current));

export function subscribeVault(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const setMutationHook = (fn) => {
  mutationHook = fn;
};

// Restores the in-memory vault after a page reload (key survives in sessionStorage).
export async function restoreSession() {
  if (current && dek) return true;
  const raw = session.get(SESSION_DEK);
  const payload = storage.get(DATA);
  if (!raw || !payload) return false;
  try {
    dek = await C.importDek(raw);
    current = normalizeVault(await C.decryptJson(payload, dek));
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export function clearSession() {
  dek = null;
  current = null;
  session.remove(SESSION_DEK);
  session.remove('unlocked_groups');
}

export async function lockVault() {
  await persistChain;
  clearSession();
}

// ---- persistence -----------------------------------------------------------

function persist() {
  persistChain = persistChain
    .then(async () => {
      if (dek && current) storage.set(DATA, await C.encryptJson(current, dek));
    })
    .catch((err) => console.error('Failed to persist vault', err));
  return persistChain;
}

export const flushPersist = () => persistChain;

export function mutate(fn) {
  current = normalizeVault(fn(current));
  revision++;
  if (getMeta()?.mode === 'cloud') patchMeta({ dirty: true });
  persist();
  notify();
  mutationHook?.();
}

// Used by the sync engine when the merged result differs from local.
export function replaceVault(next) {
  current = normalizeVault(next);
  revision++;
  persist();
  notify();
}

// Writes a fully-formed vault to this device and unlocks it.
export async function installVault(meta, key, vault) {
  setMeta(meta);
  current = normalizeVault(vault);
  revision++;
  await setSessionDek(key);
  storage.set(DATA, await C.encryptJson(current, key));
  LEGACY_KEYS.forEach((k) => storage.remove(k));
  notify();
}

export function destroyLocalVault() {
  clearSession();
  storage.remove(META);
  storage.remove(DATA);
  LEGACY_KEYS.forEach((k) => storage.remove(k));
}

// ---- local vaults ----------------------------------------------------------

export async function createLocalVault(password, initialData = emptyVault()) {
  const salt = 'vaultify:local:' + C.randomB64(16);
  const { kek } = await C.deriveMasterKeys(password, salt);
  const key = await C.generateDek();
  const wrappedDek = await C.wrapDek(key, kek);
  await installVault({ v: 2, mode: 'local', salt, wrappedDek, createdAt: Date.now() }, key, initialData);
  recordActivity('sign_up');
}

async function migrateLegacy(password) {
  const storedHash = storage.get('master_hash');
  if ((await C.hashPassword(password)) !== storedHash) {
    throw new VaultError('WRONG_PASSWORD', 'Incorrect master password.');
  }
  const rawEntries = storage.get('passwords');
  const rawGroups = storage.get('groups');
  const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries ? await C.decryptLegacy(rawEntries, password) : [];
  const groups = rawGroups ? await C.decryptLegacy(rawGroups, password) : [];
  // Legacy keys are only removed by installVault after the new vault is written.
  await createLocalVault(password, normalizeVault({ entries, groups }));
}

// Unlocks the vault already on this device (local vault, or cached cloud vault).
export async function unlockWithPassword(password) {
  if (hasLegacyVault()) {
    await migrateLegacy(password);
    recordActivity('unlock');
    return;
  }
  const meta = getMeta();
  if (!meta) throw new VaultError('NO_VAULT', 'No vault found on this device.');
  const { kek } = await C.deriveMasterKeys(password, saltFor(meta));
  let key;
  try {
    key = await C.unwrapDek(meta.wrappedDek, kek);
  } catch {
    throw new VaultError('WRONG_PASSWORD', 'Incorrect master password.');
  }
  current = normalizeVault(await C.decryptJson(storage.get(DATA), key));
  revision++;
  await setSessionDek(key);
  notify();
  recordActivity('unlock');
}

// Verifies a password against the current vault; returns the derived keys.
export async function verifyPassword(password) {
  const meta = getMeta();
  const keys = await C.deriveMasterKeys(password, saltFor(meta));
  try {
    await C.unwrapDek(meta.wrappedDek, keys.kek);
  } catch {
    throw new VaultError('WRONG_PASSWORD', 'Incorrect master password.');
  }
  return keys;
}

export async function changeLocalPassword(currentPassword, nextPassword) {
  await verifyPassword(currentPassword);
  const { kek } = await C.deriveMasterKeys(nextPassword, saltFor(getMeta()));
  patchMeta({ wrappedDek: await C.wrapDek(dek, kek) });
  recordActivity('password_changed');
}
