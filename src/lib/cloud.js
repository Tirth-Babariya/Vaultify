/**
 * Cloud sync (Supabase). The server only ever stores ciphertext and wrapped
 * keys; the master password and vault key never leave the browser.
 */
import { supabase, isCloudConfigured } from './supabase';
import * as C from './crypto';
import { emptyVault, mergeVaults, normalizeVault } from './vaultData';
import { recordActivity } from './activity';
import {
  VaultError, getMeta, setMeta, patchMeta, getDek, getVault, getRevision, replaceVault,
  installVault, destroyLocalVault, isUnlocked, setMutationHook, verifyPassword, saltFor, flushPersist,
} from './vaultStore';

export { isCloudConfigured };

const client = () => {
  if (!supabase) throw new VaultError('NOT_CONFIGURED', 'Cloud sync is not configured for this app.');
  return supabase;
};

// ---- error mapping ---------------------------------------------------------

const isNetworkError = (err) =>
  err instanceof TypeError || err?.name === 'AuthRetryableFetchError' || /failed to fetch|networkerror|network request failed/i.test(err?.message || '');

function mapAuthError(error) {
  const msg = (error?.message || '').toLowerCase();
  const code = error?.code || '';
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return new VaultError('INVALID_CREDENTIALS', 'Incorrect email or master password.');
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return new VaultError('EMAIL_NOT_CONFIRMED', 'Confirm your email first. Check your inbox for the verification link.');
  }
  if (code === 'user_already_exists' || msg.includes('already registered')) {
    return new VaultError('EMAIL_TAKEN', 'An account with this email already exists. Sign in instead.');
  }
  if (error?.status === 429 || code.includes('rate_limit') || msg.includes('rate limit')) {
    return new VaultError('RATE_LIMITED', 'Too many attempts. Please wait a minute and try again.');
  }
  if (isNetworkError(error)) return new VaultError('NETWORK', 'Network error. Check your connection and try again.');
  return new VaultError('AUTH', error?.message || 'Something went wrong.');
}

function dbError(error) {
  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return new VaultError('SCHEMA_MISSING', 'The cloud database is not set up yet. Run supabase/schema.sql in the Supabase SQL editor.');
  }
  if (isNetworkError(error)) return new VaultError('NETWORK', 'Network error. Check your connection and try again.');
  return new VaultError('DB', error?.message || 'Database error.');
}

// ---- remote vault rows -----------------------------------------------------

async function fetchRemoteVault(uid) {
  const { data, error } = await client().from('vaults').select('*').eq('user_id', uid).maybeSingle();
  if (error) throw dbError(error);
  return data;
}

async function currentSession() {
  const { data } = await client().auth.getSession();
  return data.session;
}

/**
 * After a successful auth, load the account's vault into this device, or create
 * it when the account has none yet. `initialData` / `existingDek` are used when
 * an existing local vault is being upgraded to cloud.
 */
async function establishVault({ email, kek, initialData, existingDek }) {
  const session = await currentSession();
  if (!session) throw new VaultError('AUTH', 'Not signed in.');
  const uid = session.user.id;
  const row = await fetchRemoteVault(uid);

  if (!row) {
    const key = existingDek ?? (await C.generateDek());
    const recoveryKey = C.generateRecoveryKey();
    const vault = normalizeVault(initialData ?? emptyVault());
    const wrappedDek = await C.wrapDek(key, kek);
    const wrappedRecovery = await C.wrapDek(key, await C.deriveRecoveryKek(recoveryKey));
    const { error } = await client().from('vaults').insert({
      user_id: uid,
      data: await C.encryptJson(vault, key),
      wrapped_dek_pw: wrappedDek,
      wrapped_dek_recovery: wrappedRecovery,
      version: 1,
    });
    if (error) throw dbError(error);
    await installVault(
      { v: 2, mode: 'cloud', email, wrappedDek, hasRecovery: true, remoteVersion: 1, dirty: false, metaDirty: false, createdAt: Date.now() },
      key,
      vault
    );
    return { created: true, recoveryKey };
  }

  let key;
  try {
    key = await C.unwrapDek(row.wrapped_dek_pw, kek);
  } catch {
    throw new VaultError(
      'KEY_MISMATCH',
      'Signed in, but this password cannot unlock the vault (it may have been changed on another device that has not finished syncing). Use your recovery key to reset it.'
    );
  }
  const remote = normalizeVault(await C.decryptJson(row.data, key));
  let vault = remote;
  let dirty = false;
  if (initialData) {
    const merged = mergeVaults(initialData, remote);
    vault = merged.vault;
    dirty = merged.toRemote;
  }
  await installVault(
    { v: 2, mode: 'cloud', email, wrappedDek: row.wrapped_dek_pw, hasRecovery: !!row.wrapped_dek_recovery, remoteVersion: row.version, dirty, metaDirty: false, createdAt: Date.now() },
    key,
    vault
  );
  return { created: false };
}

// ---- account flows ---------------------------------------------------------

export async function getCloudSession() {
  if (!supabase) return null;
  return currentSession();
}

export async function signUpCloud(email, password) {
  const { kek, authSecret } = await C.deriveMasterKeys(password, C.cloudSalt(email));
  const { data, error } = await client().auth.signUp({
    email,
    password: authSecret,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw mapAuthError(error);
  if (data.user?.identities && data.user.identities.length === 0) {
    throw new VaultError('EMAIL_TAKEN', 'An account with this email already exists. Sign in instead.');
  }
  if (!data.session) return { needsConfirmation: true };
  const result = await establishVault({ email, kek });
  await recordActivity('sign_up');
  startSync();
  return result;
}

export async function signInCloud(email, password) {
  const { kek, authSecret } = await C.deriveMasterKeys(password, C.cloudSalt(email));
  const { error } = await client().auth.signInWithPassword({ email, password: authSecret });
  if (error) throw mapAuthError(error);
  const result = await establishVault({ email, kek });
  await recordActivity('sign_in');
  startSync();
  return result;
}

export async function resendConfirmation(email) {
  const { error } = await client().auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } });
  if (error) throw mapAuthError(error);
}

export async function sendPasswordReset(email) {
  const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/recover` });
  if (error) throw mapAuthError(error);
}

// Re-authenticates a cached cloud vault whose Supabase session has expired.
export async function reauthenticate(password) {
  const meta = getMeta();
  const { authSecret } = await C.deriveMasterKeys(password, C.cloudSalt(meta.email));
  const { error } = await client().auth.signInWithPassword({ email: meta.email, password: authSecret });
  if (error) throw mapAuthError(error);
  await recordActivity('sign_in');
  syncNow();
}

export async function signOutCloud() {
  if (getMeta()?.dirty) {
    try { await syncNow(); } catch { /* best effort */ }
  }
  await recordActivity('sign_out');
  await client().auth.signOut();
  destroyLocalVault();
  setStatus('local');
}

export async function signOutEverywhere() {
  await recordActivity('sign_out_all');
  await client().auth.signOut({ scope: 'global' });
  destroyLocalVault();
  setStatus('local');
}

// ---- password & recovery ---------------------------------------------------

export async function changeCloudPassword(currentPassword, nextPassword) {
  await verifyPassword(currentPassword);
  const meta = getMeta();
  const { kek, authSecret } = await C.deriveMasterKeys(nextPassword, saltFor(meta));
  const { error } = await client().auth.updateUser({ password: authSecret });
  if (error) throw mapAuthError(error);
  patchMeta({ wrappedDek: await C.wrapDek(getDek(), kek), metaDirty: true });
  await recordActivity('password_changed');
  await syncNow();
}

export async function rotateRecoveryKey() {
  const session = await currentSession();
  if (!session) throw new VaultError('AUTH', 'Sign in to sync first.');
  const recoveryKey = C.generateRecoveryKey();
  const wrapped = await C.wrapDek(getDek(), await C.deriveRecoveryKek(recoveryKey));
  const { error } = await client().from('vaults').update({ wrapped_dek_recovery: wrapped }).eq('user_id', session.user.id);
  if (error) throw dbError(error);
  patchMeta({ hasRecovery: true });
  await recordActivity('recovery_key_rotated');
  return recoveryKey;
}

// Recovery uses the temporary session created by the password-reset email link.
export async function recoverWithKey(recoveryKey, newPassword) {
  const session = await currentSession();
  if (!session) throw new VaultError('AUTH', 'This recovery link has expired. Request a new one.');
  const email = session.user.email;
  const row = await fetchRemoteVault(session.user.id);
  if (!row?.wrapped_dek_recovery) throw new VaultError('NO_RECOVERY', 'This vault has no recovery key on file.');

  let key;
  try {
    key = await C.unwrapDek(row.wrapped_dek_recovery, await C.deriveRecoveryKek(recoveryKey));
  } catch {
    throw new VaultError('WRONG_RECOVERY_KEY', 'That recovery key is not correct.');
  }
  const { kek, authSecret } = await C.deriveMasterKeys(newPassword, C.cloudSalt(email));
  const { error } = await client().auth.updateUser({ password: authSecret });
  if (error) throw mapAuthError(error);
  const wrappedDek = await C.wrapDek(key, kek);
  const { error: dbErr } = await client().from('vaults').update({ wrapped_dek_pw: wrappedDek }).eq('user_id', session.user.id);
  if (dbErr) throw dbError(dbErr);

  const vault = normalizeVault(await C.decryptJson(row.data, key));
  await installVault(
    { v: 2, mode: 'cloud', email, wrappedDek, hasRecovery: true, remoteVersion: row.version, dirty: false, metaDirty: false, createdAt: Date.now() },
    key,
    vault
  );
  await recordActivity('recovery_used');
  startSync();
}

// No recovery key: the old data cannot be decrypted, so start a fresh vault.
export async function eraseAndReset(newPassword) {
  const session = await currentSession();
  if (!session) throw new VaultError('AUTH', 'This recovery link has expired. Request a new one.');
  const email = session.user.email;
  const { kek, authSecret } = await C.deriveMasterKeys(newPassword, C.cloudSalt(email));
  const { error } = await client().auth.updateUser({ password: authSecret });
  if (error) throw mapAuthError(error);
  const { error: delErr } = await client().from('vaults').delete().eq('user_id', session.user.id);
  if (delErr) throw dbError(delErr);
  const result = await establishVault({ email, kek });
  await recordActivity('vault_reset');
  startSync();
  return result;
}

// ---- switching modes -------------------------------------------------------

export async function enableCloudSync(email, password) {
  const meta = getMeta();
  if (meta?.mode !== 'local') throw new VaultError('MODE', 'This vault is already synced.');
  await verifyPassword(password);
  const { kek, authSecret } = await C.deriveMasterKeys(password, C.cloudSalt(email));

  const signIn = await client().auth.signInWithPassword({ email, password: authSecret });
  if (signIn.error) {
    const mapped = mapAuthError(signIn.error);
    if (mapped.code !== 'INVALID_CREDENTIALS') throw mapped;
    const signUp = await client().auth.signUp({ email, password: authSecret, options: { emailRedirectTo: window.location.origin } });
    if (signUp.error) throw mapAuthError(signUp.error);
    if (signUp.data.user?.identities?.length === 0) {
      throw new VaultError('EMAIL_TAKEN', 'An account with this email already exists, but this master password does not match it.');
    }
    if (!signUp.data.session) return { needsConfirmation: true };
  }

  const result = await establishVault({ email, kek, initialData: getVault(), existingDek: getDek() });
  await recordActivity('cloud_enabled');
  startSync();
  return result;
}

export async function disableCloudSync(password, { deleteRemote = false } = {}) {
  await verifyPassword(password);
  const meta = getMeta();
  if (meta.dirty) {
    try { await syncNow(); } catch { /* best effort */ }
  }
  const session = await currentSession();
  if (deleteRemote && session) {
    const { error } = await client().from('vaults').delete().eq('user_id', session.user.id);
    if (error) throw dbError(error);
  }
  await recordActivity('cloud_disabled');
  await client().auth.signOut();

  const salt = 'vaultify:local:' + C.randomB64(16);
  const { kek } = await C.deriveMasterKeys(password, salt);
  setMeta({ v: 2, mode: 'local', salt, wrappedDek: await C.wrapDek(getDek(), kek), createdAt: Date.now() });
  setStatus('local');
}

// ---- sync engine -----------------------------------------------------------

let status = { state: 'local', lastSyncedAt: null, message: null };
const statusListeners = new Set();
let running = null;
let again = false;
let debounce = null;
let started = false;

function setStatus(state, message = null) {
  status = { state, message, lastSyncedAt: state === 'synced' ? Date.now() : status.lastSyncedAt };
  statusListeners.forEach((cb) => cb(status));
}

export const getSyncStatus = () => status;

export function subscribeSyncStatus(cb) {
  statusListeners.add(cb);
  cb(status);
  return () => statusListeners.delete(cb);
}

export function requestSync(delay = 700) {
  clearTimeout(debounce);
  debounce = setTimeout(() => syncNow().catch(() => {}), delay);
}

export function syncNow() {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        if (await runSyncOnce()) again = true;
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

// One pull-merge-push cycle. Returns true when local changes arrived mid-sync
// and another pass is needed.
async function runSyncOnce() {
  const meta = getMeta();
  if (!meta || meta.mode !== 'cloud' || !supabase) {
    setStatus('local');
    return false;
  }
  const dek = getDek();
  if (!dek) return false;

  setStatus('syncing');
  try {
    const session = await currentSession();
    if (!session) {
      setStatus('auth');
      return false;
    }
    const uid = session.user.id;

    for (let attempt = 0; attempt < 4; attempt++) {
      const row = await fetchRemoteVault(uid);
      if (!row) {
        setStatus('error', 'This account has no cloud vault. Sign out and sign in again.');
        return false;
      }
      // Master password changed on another device: adopt the re-wrapped key so this
      // device's cached vault unlocks with the new password too.
      if (row.wrapped_dek_pw && row.wrapped_dek_pw !== getMeta().wrappedDek && !getMeta().metaDirty) {
        patchMeta({ wrappedDek: row.wrapped_dek_pw });
      }
      const m = getMeta();
      let merged = getVault();
      let needsPush = !!m.dirty || !!m.metaDirty;

      if (row.version !== m.remoteVersion) {
        const remote = normalizeVault(await C.decryptJson(row.data, dek));
        const result = mergeVaults(getVault(), remote);
        merged = result.vault;
        if (result.toRemote) needsPush = true;
        if (result.fromRemote) replaceVault(merged);
      }

      const pushedRevision = getRevision();
      let version = row.version;

      if (needsPush) {
        const payload = {
          data: await C.encryptJson(merged, dek),
          version: row.version + 1,
          updated_at: new Date().toISOString(),
        };
        if (m.metaDirty) payload.wrapped_dek_pw = m.wrappedDek;
        const { data: updated, error } = await client()
          .from('vaults')
          .update(payload)
          .eq('user_id', uid)
          .eq('version', row.version)
          .select('version');
        if (error) throw dbError(error);
        if (!updated || updated.length === 0) continue; // someone else pushed first: re-merge
        version = row.version + 1;
      }

      const changedDuringSync = getRevision() !== pushedRevision;
      patchMeta({ remoteVersion: version, dirty: changedDuringSync, metaDirty: false });
      setStatus('synced');
      return changedDuringSync;
    }
    setStatus('error', 'Could not resolve a sync conflict. Will retry.');
    return false;
  } catch (err) {
    const mapped = err instanceof VaultError ? err : isNetworkError(err) ? new VaultError('NETWORK', 'Offline') : dbError(err);
    setStatus(mapped.code === 'NETWORK' ? 'offline' : 'error', mapped.message);
    return false;
  }
}

export function startSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  setMutationHook(() => {
    if (getMeta()?.mode === 'cloud') requestSync();
  });
  const trigger = () => {
    if (isUnlocked() && getMeta()?.mode === 'cloud') syncNow().catch(() => {});
  };
  window.addEventListener('focus', trigger);
  window.addEventListener('online', trigger);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && trigger());
  setInterval(trigger, 60000);
  trigger();
}

// Called on every page load once the vault is unlocked.
export function initSync() {
  const meta = getMeta();
  if (meta?.mode === 'cloud') {
    startSync();
    syncNow().catch(() => {});
  } else {
    setStatus('local');
  }
}

export { flushPersist };
