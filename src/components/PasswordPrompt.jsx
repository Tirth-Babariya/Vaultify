'use client';

import { useEffect, useState } from 'react';
import PasswordField from './PasswordField';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

/**
 * Asks for a password before a sensitive action. `onSubmit(password)` may throw an
 * Error whose message is shown inline; resolving closes the prompt via the caller.
 * Too many wrong attempts pause the prompt briefly so it can't be used to guess.
 */
export default function PasswordPrompt({ title, description, label = 'Master password', submitLabel = 'Continue', onSubmit, onClose, children }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState(0);
  const [waitLeft, setWaitLeft] = useState(0);

  useEffect(() => {
    if (waitLeft <= 0) return;
    const t = setTimeout(() => setWaitLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [waitLeft]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy || waitLeft > 0 || !password) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(password);
    } catch (err) {
      const next = failures + 1;
      setFailures(next);
      setPassword('');
      if (next >= MAX_ATTEMPTS) {
        setFailures(0);
        setWaitLeft(LOCKOUT_SECONDS);
        setError(`Too many attempts. Try again in ${LOCKOUT_SECONDS} seconds.`);
      } else {
        setError(err?.message || 'Something went wrong.');
      }
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <form onSubmit={submit} className="card w-full max-w-md space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          {description && <p className="text-sm opacity-60 leading-relaxed">{description}</p>}
        </div>

        {children}

        <PasswordField id="prompt-password" label={label} value={password} onChange={setPassword} autoFocus />

        {error && <p role="alert" className="text-sm text-red-500">{waitLeft > 0 ? `Too many attempts. Try again in ${waitLeft}s.` : error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={busy || waitLeft > 0 || !password} className="btn-primary text-sm disabled:opacity-40 disabled:pointer-events-none">
            {busy ? 'Checking…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
