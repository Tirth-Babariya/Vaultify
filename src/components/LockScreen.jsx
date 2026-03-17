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

  useEffect(() => {
    const existingHash = storage.get('master_hash');
    if (!existingHash) {
      setIsNewUser(true);
    }
  }, []);

  const handleAction = async (e) => {
    e.preventDefault();
    setError('');
    setAnimation('');
    setLoading(true);

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

        const hash = await hashPassword(password);
        storage.set('master_hash', hash);
        storage.set('is_locked', false);
        session.set('vault_key', password);
        session.set('last_unlocked', new Date().toISOString());
        setAnimation('unlocked');
        playSound('unlock');
        setTimeout(() => router.push('/'), 600);
      } else {
        const hash = await hashPassword(password);
        const storedHash = storage.get('master_hash');

        if (hash === storedHash) {
          storage.set('is_locked', false);
          session.set('vault_key', password);
          session.set('last_unlocked', new Date().toISOString());
          setAnimation('unlocked');
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
      if (animation !== 'unlocked') setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-[70vh] px-2">
      <div className={`card w-full max-w-sm md:max-w-md space-y-6 md:space-y-8 p-6 md:p-10 transition-all duration-300 ${
        animation === 'shake' ? 'animate-shake-real border-red-500/50' : ''
      } ${animation === 'unlocked' ? 'scale-105 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : ''}`}>
        <div className="flex justify-center">
          <Logo size={48} className="text-foreground" animate={animation} />
        </div>
        <div className="text-center space-y-2 md:space-y-3">
          <h1 className="text-xl md:text-2xl font-bold">
            {isNewUser ? 'Set Master Password' : 'Vault Locked'}
          </h1>
          <p className="text-xs md:text-sm text-foreground/60 leading-relaxed">
            {isNewUser 
              ? 'Create a strong master password to secure your vault.' 
              : 'Enter your master password to continue.'}
          </p>
        </div>

        <form onSubmit={handleAction} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wider opacity-50">
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
              <label className="text-xs font-medium uppercase tracking-wider opacity-50">
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

        {!isNewUser && (
          <p className="text-center text-xs text-foreground/40 pt-4">
            Forgotten password? Data recovery is not possible.
          </p>
        )}
      </div>
    </div>
  );
}
