'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCloudSession, recoverWithKey, eraseAndReset } from '@/lib/cloud';
import Logo from './Logo';
import PasswordField from './PasswordField';
import RecoveryKeyModal from './RecoveryKeyModal';

export default function RecoverAccount() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = loading, null = none
  const [tab, setTab] = useState('key');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmErase, setConfirmErase] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState(null);

  useEffect(() => {
    getCloudSession().then(setSession).catch(() => setSession(null));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 10) return setError('Master password must be at least 10 characters long.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      if (tab === 'key') {
        await recoverWithKey(recoveryInput, password);
        router.push('/');
      } else {
        const result = await eraseAndReset(password);
        setNewKey(result.recoveryKey);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  if (session === undefined) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto">
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-4">
      {newKey && <RecoveryKeyModal recoveryKey={newKey} onDone={() => router.push('/')} />}
      <div className="w-full max-w-[420px] card space-y-4 !p-6">
        <div className="flex items-center gap-3.5">
          <div className="avatar-badge w-11 h-11 !rounded-xl"><Logo size={22} className="text-current" /></div>
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-lg font-bold tracking-tight leading-tight">Recover your vault</h1>
            <p className="text-xs opacity-60 leading-snug">
              {session
                ? `Set a new master password for ${session.user.email}.`
                : 'This reset link is invalid or has expired. Request a new one from the sign-in screen.'}
            </p>
          </div>
        </div>

        {!session ? (
          <button type="button" onClick={() => router.push('/lock')} className="btn-primary w-full">Back to sign in</button>
        ) : (
          <>
            <div className="grid grid-cols-2 p-1 rounded-xl bg-foreground/[0.05] text-sm font-medium">
              {[['key', 'I have my recovery key'], ['erase', 'I don’t have it']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setTab(id); setError(''); }}
                  className={`py-2 px-2 rounded-lg text-xs sm:text-sm transition-all ${tab === id ? 'bg-[var(--background)] shadow-sm' : 'opacity-50 hover:opacity-80'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              {tab === 'key' ? (
                <div className="space-y-1.5">
                  <label htmlFor="recovery-key" className="text-xs font-medium opacity-70">Recovery key</label>
                  <input
                    id="recovery-key"
                    className="input !h-11 font-mono text-sm uppercase tracking-wider"
                    placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                    value={recoveryInput}
                    onChange={(e) => setRecoveryInput(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-3.5 space-y-2.5">
                  <p className="text-xs text-red-500 leading-relaxed">
                    Without your recovery key the existing encrypted data can never be decrypted. Continuing permanently erases it and starts a fresh, empty vault.
                  </p>
                  <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={confirmErase} onChange={(e) => setConfirmErase(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
                    <span>I understand my old passwords will be permanently lost.</span>
                  </label>
                </div>
              )}

              <PasswordField id="new-master" label="New master password" value={password} onChange={setPassword} autoComplete="new-password" showStrength compact />
              <PasswordField id="new-master-2" label="Confirm new master password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" compact />

              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

              <button
                type="submit"
                disabled={loading || (tab === 'erase' && !confirmErase)}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Working…' : tab === 'key' ? 'Restore access' : 'Erase and start fresh'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
