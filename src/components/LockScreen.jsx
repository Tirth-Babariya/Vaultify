'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage, session } from '@/lib/storage';
import { hashPassword } from '@/lib/crypto';
import { playSound } from '@/lib/audio';
import Logo from './Logo';

export default function LockScreen() {
  const router = useRouter();
  const [isNewUser, setIsNewUser] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [animation, setAnimation] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    const existingHash = storage.get('master_hash');
    if (!existingHash) {
      setIsNewUser(true);
    }
  }, []);

  const handleResetVault = () => {
    storage.remove('master_hash');
    storage.remove('passwords');
    storage.remove('is_locked');
    session.remove('vault_key');
    session.remove('last_unlocked');
    playSound('lock');
    setConfirmingReset(false);
    setPassword('');
    setConfirmPassword('');
    setError('');
    setIsNewUser(true);
  };

  const handleAction = async (e) => {
    e.preventDefault();
    setError('');
    setAnimation('');
    setLoading(true);

    // hashPassword resolves in a couple milliseconds, so without a minimum
    // visible duration the "Processing..." state flashes too briefly to
    // register — especially when submitting via Enter, where there's no
    // separate click animation to mask it.
    const minDuration = new Promise((resolve) => setTimeout(resolve, 350));
    let didSucceed = false;

    try {
      if (isNewUser) {
        if (password.length < 8) {
          setError('Master password must be at least 8 characters long.');
          setLoading(false);
          setAnimation('shake');
          playSound('error');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          setAnimation('shake');
          playSound('error');
          return;
        }

        const [hash] = await Promise.all([hashPassword(password), minDuration]);
        storage.set('master_hash', hash);
        storage.set('is_locked', false);
        session.set('vault_key', password);
        session.set('last_unlocked', new Date().toISOString());
        setAnimation('unlocked');
        didSucceed = true;
        playSound('unlock');
        setTimeout(() => router.push('/'), 600);
      } else {
        const [hash] = await Promise.all([hashPassword(password), minDuration]);
        const storedHash = storage.get('master_hash');

        if (hash === storedHash) {
          storage.set('is_locked', false);
          session.set('vault_key', password);
          session.set('last_unlocked', new Date().toISOString());
          setAnimation('unlocked');
          didSucceed = true;
          playSound('unlock');
          setTimeout(() => router.push('/'), 600);
        } else {
          setError('Incorrect master password.');
          setAnimation('shake');
          playSound('error');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setAnimation('shake');
      playSound('error');
    } finally {
      if (!didSucceed) setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] md:min-h-[80vh] px-4 py-8">
      <div className={`card w-full max-w-[340px] sm:max-w-sm md:max-w-md space-y-6 md:space-y-8 p-6 md:p-10 transition-all duration-300 ${
        animation === 'shake' ? 'animate-shake-real border-red-500/50' : ''
      } ${animation === 'unlocked' ? 'scale-105 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : ''}`}>
        <div className="avatar-badge w-14 h-14">
          <Logo size={28} className="text-current" animate={animation} />
        </div>
        <div className="text-left space-y-1.5 md:space-y-2">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            {isNewUser ? 'Set Master Password' : 'Vaultify'}
          </h1>
          <p className="text-xs md:text-sm text-foreground/50 leading-relaxed">
            {isNewUser
              ? 'Create a strong master password to secure your vault.'
              : 'Enter your master password to open your vault.'}
          </p>
        </div>

        <form onSubmit={handleAction} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium opacity-40">
              Master Password
            </label>
            <input 
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          {isNewUser && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium opacity-40">
                Confirm Password
              </label>
              <input 
                type="password"
                className="input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isNewUser ? 'Set Password' : 'Unlock Vault')}
          </button>
        </form>

        {!isNewUser && !confirmingReset && (
          <div className="text-center pt-4 space-y-1.5">
            <p className="text-xs text-foreground/40">
              Forgotten password? Data recovery is not possible.
            </p>
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="text-xs font-medium text-red-500/70 hover:text-red-500 underline underline-offset-2"
            >
              Reset Vault
            </button>
          </div>
        )}

        {confirmingReset && (
          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-xs text-red-500 font-medium leading-relaxed text-center">
              This will permanently delete every saved password on this device. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="btn-secondary flex-1 text-xs py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetVault}
                className="flex-1 text-xs py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                Yes, Delete Everything
              </button>
            </div>
          </div>
        )}
      </div>

      <a
        href="https://github.com/Tirth-Babariya"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex items-center gap-1.5 text-xs opacity-30 hover:opacity-70 transition-opacity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.833.09-.647.35-1.088.636-1.338-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.271.098-2.65 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.747-1.026 2.747-1.026.546 1.379.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.31.678.921.678 1.856 0 1.34-.012 2.421-.012 2.751 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
        Built by Tirth Babariya
      </a>
    </div>
  );
}
