'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMeta, changeLocalPassword } from '@/lib/vaultStore';
import {
  isCloudConfigured, syncNow, subscribeSyncStatus, changeCloudPassword, rotateRecoveryKey,
  enableCloudSync, disableCloudSync, signOutCloud, signOutEverywhere, reauthenticate,
} from '@/lib/cloud';
import { listActivity, deviceInfo } from '@/lib/activity';
import SyncBadge from './SyncBadge';
import PasswordField from './PasswordField';
import RecoveryKeyModal from './RecoveryKeyModal';

const EVENT_LABELS = {
  sign_up: 'Account created',
  sign_in: 'Signed in',
  unlock: 'Vault unlocked',
  sign_out: 'Signed out',
  sign_out_all: 'Signed out of all devices',
  password_changed: 'Master password changed',
  recovery_used: 'Recovered with recovery key',
  recovery_key_rotated: 'New recovery key generated',
  cloud_enabled: 'Cloud sync enabled',
  cloud_disabled: 'Cloud sync turned off',
  vault_reset: 'Vault reset',
};

const timeAgo = (ms) => {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
};

function useAction() {
  const [state, setState] = useState({ loading: false, error: '', ok: '' });
  const run = async (fn, okMessage = '') => {
    setState({ loading: true, error: '', ok: '' });
    try {
      const result = await fn();
      setState({ loading: false, error: '', ok: okMessage });
      return result;
    } catch (err) {
      setState({ loading: false, error: err.message || 'Something went wrong.', ok: '' });
      return undefined;
    }
  };
  return [state, run];
}

function Feedback({ state }) {
  if (state.error) return <p className="text-sm text-red-500">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-green-500">{state.ok}</p>;
  return null;
}

function Panel({ title, description, children }) {
  return (
    <section className="card glass space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-xs opacity-50 leading-relaxed">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Account({ section = 'account', onSignedOut }) {
  const [meta, setMetaState] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ state: 'local', lastSyncedAt: null });
  const [activity, setActivity] = useState([]);
  const [activityError, setActivityError] = useState('');
  const [recoveryKey, setRecoveryKey] = useState(null);
  const [showEnable, setShowEnable] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const [enableEmail, setEnableEmail] = useState('');
  const [enablePw, setEnablePw] = useState('');
  const [disablePw, setDisablePw] = useState('');
  const [deleteRemote, setDeleteRemote] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [reauthPw, setReauthPw] = useState('');

  const [enableState, runEnable] = useAction();
  const [disableState, runDisable] = useAction();
  const [pwState, runPw] = useAction();
  const [keyState, runKey] = useAction();
  const [signOutState, runSignOut] = useAction();

  const refreshMeta = useCallback(() => setMetaState(getMeta()), []);
  const loadActivity = useCallback(async () => {
    try {
      setActivity(await listActivity());
      setActivityError('');
    } catch (err) {
      setActivityError(err.message || 'Could not load activity.');
    }
  }, []);

  useEffect(() => {
    refreshMeta();
    loadActivity();
    return subscribeSyncStatus(setSyncStatus);
  }, [refreshMeta, loadActivity]);

  if (!meta) return null;
  const isCloud = meta.mode === 'cloud';
  const thisDevice = deviceInfo().id;

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 10) return runPw(async () => { throw new Error('New master password must be at least 10 characters.'); });
    if (newPw !== newPw2) return runPw(async () => { throw new Error('New passwords do not match.'); });
    const done = await runPw(async () => {
      if (isCloud) await changeCloudPassword(curPw, newPw);
      else await changeLocalPassword(curPw, newPw);
      return true;
    }, 'Master password updated.');
    if (done) {
      setCurPw(''); setNewPw(''); setNewPw2('');
      loadActivity();
    }
  };

  const enable = async (e) => {
    e.preventDefault();
    const result = await runEnable(() => enableCloudSync(enableEmail.trim(), enablePw));
    if (!result) return;
    if (result.needsConfirmation) {
      runEnable(async () => {}, `Check ${enableEmail.trim()} for a verification link, then come back and press “Enable sync” again.`);
      return;
    }
    setEnablePw('');
    setShowEnable(false);
    refreshMeta();
    loadActivity();
    if (result.created) setRecoveryKey(result.recoveryKey);
  };

  const disable = async (e) => {
    e.preventDefault();
    const done = await runDisable(async () => {
      await disableCloudSync(disablePw, { deleteRemote });
      return true;
    });
    if (done) {
      setDisablePw('');
      setShowDisable(false);
      refreshMeta();
      loadActivity();
    }
  };

  const newRecoveryKey = async () => {
    const key = await runKey(() => rotateRecoveryKey());
    if (key) {
      setRecoveryKey(key);
      refreshMeta();
    }
  };

  const signOut = async () => {
    const done = await runSignOut(async () => {
      await signOutCloud();
      return true;
    });
    if (done) onSignedOut?.();
  };

  const signOutAll = async () => {
    const done = await runSignOut(async () => {
      await signOutEverywhere();
      return true;
    });
    if (done) onSignedOut?.();
  };

  return (
    <div className="space-y-6">
      {recoveryKey && (
        <RecoveryKeyModal
          recoveryKey={recoveryKey}
          title="Your new recovery key"
          onDone={() => setRecoveryKey(null)}
        />
      )}

      {/* Identity + sync */}
      {section === 'account' && (
      <Panel title="Account">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="avatar-badge w-11 h-11 !rounded-full text-base font-bold">
              {(isCloud ? meta.email : 'L')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{isCloud ? meta.email : 'Local vault'}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-foreground/[0.07] opacity-80">
                  {isCloud ? 'Cloud sync' : 'This device only'}
                </span>
                <SyncBadge />
              </div>
            </div>
          </div>
          {isCloud && (
            <button type="button" onClick={() => syncNow()} disabled={syncStatus.state === 'syncing'} className="btn-secondary text-xs !min-h-9 !px-3 flex-shrink-0">
              Sync now
            </button>
          )}
        </div>

        {isCloud && syncStatus.state === 'auth' && (
          <ReauthForm onDone={() => setReauthPw('')} value={reauthPw} setValue={setReauthPw} />
        )}
        {isCloud && syncStatus.message && syncStatus.state !== 'synced' && (
          <p className="text-xs text-yellow-500 leading-relaxed">{syncStatus.message}</p>
        )}
        {isCloud && syncStatus.lastSyncedAt && (
          <p className="text-xs opacity-40">Last synced {timeAgo(syncStatus.lastSyncedAt)}</p>
        )}

        {!isCloud && isCloudConfigured && !showEnable && (
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold">Access your vault from any device</div>
              <p className="text-xs opacity-50 leading-relaxed">
                Turn on cloud sync to store an encrypted copy online. Your passwords are encrypted in the browser first; the server only holds ciphertext.
              </p>
            </div>
            <button type="button" onClick={() => setShowEnable(true)} className="btn-primary text-sm !min-h-10 w-full sm:w-auto">Enable cloud sync</button>
          </div>
        )}

        {!isCloud && showEnable && (
          <form onSubmit={enable} className="rounded-xl border border-border p-4 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="enable-email" className="text-xs font-medium opacity-70">Email</label>
              <input id="enable-email" type="email" className="input" placeholder="you@example.com" value={enableEmail} onChange={(e) => setEnableEmail(e.target.value)} autoComplete="email" required />
            </div>
            <PasswordField id="enable-pw" label="Confirm your master password" value={enablePw} onChange={setEnablePw} hint="Your master password stays the same. It's also used to derive your account login, so we never see it." />
            <Feedback state={enableState} />
            <div className="flex gap-2">
              <button type="submit" disabled={enableState.loading} className="btn-primary text-sm !min-h-10 flex-1 disabled:opacity-60">{enableState.loading ? 'Enabling…' : 'Enable sync'}</button>
              <button type="button" onClick={() => setShowEnable(false)} className="btn-secondary text-sm !min-h-10">Cancel</button>
            </div>
          </form>
        )}

        {isCloud && (
          <div>
            {!confirmSignOut ? (
              <button type="button" onClick={() => setConfirmSignOut(true)} className="btn-secondary text-sm !min-h-10">Sign out of this device</button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs opacity-60 flex-1 min-w-[200px]">This removes the local copy from this device. Your vault stays safe in the cloud.</p>
                <button type="button" onClick={() => setConfirmSignOut(false)} className="btn-secondary text-xs !min-h-9">Cancel</button>
                <button type="button" onClick={signOut} disabled={signOutState.loading} className="btn-primary text-xs !min-h-9">Sign out</button>
              </div>
            )}
            <Feedback state={signOutState} />
          </div>
        )}
      </Panel>
      )}

      {/* Master password */}
      {section === 'security' && (
      <Panel title="Master password" description={isCloud ? 'Changing it re-wraps your vault key. Your data is not re-uploaded, and other devices use the new password next time they sign in.' : 'Changing it re-wraps your vault key on this device.'}>
        <form onSubmit={changePassword} className="space-y-4">
          <PasswordField id="cur-pw" label="Current master password" value={curPw} onChange={setCurPw} />
          <PasswordField id="new-pw" label="New master password" value={newPw} onChange={setNewPw} autoComplete="new-password" showStrength />
          <PasswordField id="new-pw2" label="Confirm new master password" value={newPw2} onChange={setNewPw2} autoComplete="new-password" />
          <Feedback state={pwState} />
          <button type="submit" disabled={pwState.loading} className="btn-primary text-sm !min-h-10 disabled:opacity-60">{pwState.loading ? 'Updating…' : 'Update master password'}</button>
        </form>
      </Panel>
      )}

      {/* Recovery key */}
      {section === 'security' && isCloud && (
        <Panel title="Recovery key" description="Lets you regain access if you forget your master password. Generating a new key invalidates the old one.">
          <div className="flex items-center justify-between gap-3">
            <span className={`text-xs font-medium ${meta.hasRecovery ? 'text-green-500' : 'text-yellow-500'}`}>
              {meta.hasRecovery ? 'A recovery key is set' : 'No recovery key on file'}
            </span>
            <button type="button" onClick={newRecoveryKey} disabled={keyState.loading} className="btn-secondary text-sm !min-h-10">Generate new key</button>
          </div>
          <Feedback state={keyState} />
        </Panel>
      )}

      {/* Activity */}
      {section === 'activity' && (
      <Panel title="Recent activity" description={isCloud ? 'Sign-ins and security changes across all your devices.' : 'Unlocks and security changes on this device.'}>
        {activityError && <p className="text-sm text-yellow-500">{activityError}</p>}
        {activity.length === 0 && !activityError ? (
          <p className="text-sm opacity-40">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {activity.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{EVENT_LABELS[item.event] || item.event}</div>
                  <div className="text-xs opacity-50 truncate">
                    {item.deviceLabel || 'Unknown device'}
                    {item.deviceId === thisDevice && (
                      <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-glow)] text-[var(--accent)]">This device</span>
                    )}
                  </div>
                </div>
                <span className="text-xs opacity-40 flex-shrink-0">{timeAgo(item.at)}</span>
              </li>
            ))}
          </ul>
        )}
        {isCloud && (
          <button type="button" onClick={signOutAll} disabled={signOutState.loading} className="text-xs opacity-60 hover:opacity-100 underline underline-offset-2">
            Sign out of all devices
          </button>
        )}
      </Panel>
      )}

      {/* Danger zone */}
      {section === 'account' && isCloud && (
        <Panel title="Turn off cloud sync" description="Keep this vault only on this device. You can also remove the cloud copy.">
          {!showDisable ? (
            <button type="button" onClick={() => setShowDisable(true)} className="btn-secondary text-sm !min-h-10 !text-red-500">Switch to local-only</button>
          ) : (
            <form onSubmit={disable} className="space-y-4">
              <PasswordField id="disable-pw" label="Confirm your master password" value={disablePw} onChange={setDisablePw} />
              <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={deleteRemote} onChange={(e) => setDeleteRemote(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
                <span className="opacity-80">Also delete the encrypted copy from the cloud</span>
              </label>
              <Feedback state={disableState} />
              <div className="flex gap-2">
                <button type="submit" disabled={disableState.loading} className="text-sm px-4 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-60">Turn off sync</button>
                <button type="button" onClick={() => setShowDisable(false)} className="btn-secondary text-sm !min-h-10">Cancel</button>
              </div>
            </form>
          )}
        </Panel>
      )}
    </div>
  );
}

function ReauthForm({ value, setValue, onDone }) {
  const [state, run] = useAction();
  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(async () => {
      await reauthenticate(value);
      return true;
    });
    if (ok) onDone();
  };
  return (
    <form onSubmit={submit} className="rounded-xl border border-border p-4 space-y-3">
      <p className="text-xs opacity-60">Your cloud session expired. Enter your master password to resume syncing.</p>
      <PasswordField id="reauth-pw" label="Master password" value={value} onChange={setValue} />
      <Feedback state={state} />
      <button type="submit" disabled={state.loading} className="btn-primary text-sm !min-h-10 disabled:opacity-60">Resume sync</button>
    </form>
  );
}
