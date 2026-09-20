'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { playSound } from '@/lib/audio';
import {
  getVaultStatus, createLocalVault, unlockWithPassword, destroyLocalVault, restoreSession, isUnlocked,
} from '@/lib/vaultStore';
import {
  isCloudConfigured, signUpCloud, signInCloud, getCloudSession, resendConfirmation, sendPasswordReset, signOutCloud,
} from '@/lib/cloud';
import Logo from './Logo';
import PasswordField from './PasswordField';
import RecoveryKeyModal from './RecoveryKeyModal';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ModeCard({ disabled, onClick, icon, title, description, badge, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-border transition-all ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-[var(--accent)] hover:bg-[var(--accent-glow)] active:scale-[0.99]'
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--accent-glow)] group-hover:text-[var(--accent)] transition-colors">
        {icon}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{title}</span>
          {badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-glow)] text-[var(--accent)]">{badge}</span>
          )}
        </div>
        <p className="text-xs opacity-60 leading-relaxed">{description}</p>
        {children}
      </div>
      {!disabled && (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      )}
    </button>
  );
}

export default function LockScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [vault, setVault] = useState({ exists: false, mode: null, email: null, legacy: false });
  const [screen, setScreen] = useState('auth'); // auth | unlock | confirm | forgot | forgot-sent
  const [tab, setTab] = useState('signin'); // signin | create
  const [step, setStep] = useState('choose'); // choose | details (create flow only)
  const [mode, setMode] = useState('cloud'); // cloud | local
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [animation, setAnimation] = useState('');
  const [confirming, setConfirming] = useState(null); // 'reset' | 'signout'
  const [recoveryKey, setRecoveryKey] = useState(null);

  useEffect(() => {
    (async () => {
      const status = getVaultStatus();
      setVault(status);
      if (status.exists && isUnlocked() && (await restoreSession())) {
        router.replace('/');
        return;
      }
      if (status.exists) {
        setScreen('unlock');
      } else {
        if (!isCloudConfigured) {
          // Signing in needs a cloud account, so start on Create when cloud is off.
          setMode('local');
          setTab('create');
        }
        const session = await getCloudSession();
        if (session) {
          // Signed in via the email-confirmation link, but this device has no vault yet.
          setEmail(session.user.email);
          setTab('signin');
          setNotice('Email confirmed. Enter your master password to finish setting up this device.');
        }
      }
      setReady(true);
    })();
  }, [router]);

  const switchTab = (next) => {
    setTab(next);
    setStep('choose');
    setError('');
    setNotice('');
  };

  const perform = async () => {
    if (screen === 'forgot') {
      if (!EMAIL_RE.test(email.trim())) throw new Error('Enter a valid email address.');
      await sendPasswordReset(email.trim());
      return { next: 'forgot-sent' };
    }
    if (screen === 'unlock') {
      await unlockWithPassword(password);
      return { next: 'home' };
    }
    if (tab === 'signin') {
      if (!EMAIL_RE.test(email.trim())) throw new Error('Enter a valid email address.');
      const result = await signInCloud(email.trim(), password);
      return result.created ? { next: 'recovery', recoveryKey: result.recoveryKey } : { next: 'home' };
    }
    if (password.length < 10) throw new Error('Master password must be at least 10 characters long.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');
    if (mode === 'local') {
      await createLocalVault(password);
      return { next: 'home' };
    }
    if (!EMAIL_RE.test(email.trim())) throw new Error('Enter a valid email address.');
    const result = await signUpCloud(email.trim(), password);
    if (result.needsConfirmation) return { next: 'confirm' };
    return { next: 'recovery', recoveryKey: result.recoveryKey };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setAnimation('');
    setLoading(true);
    // Key derivation can finish very quickly on fast machines; keep the loading
    // state visible long enough to register.
    const minDuration = new Promise((resolve) => setTimeout(resolve, 350));
    let leaving = false;

    try {
      const outcome = await perform();
      await minDuration;
      if (outcome.next === 'home' || outcome.next === 'recovery') {
        leaving = true;
        setAnimation('unlocked');
        playSound('unlock');
        if (outcome.next === 'recovery') setRecoveryKey(outcome.recoveryKey);
        else setTimeout(() => router.push('/'), 600);
      } else {
        setScreen(outcome.next);
      }
    } catch (err) {
      await minDuration;
      setError(err.message || 'Something went wrong. Please try again.');
      setAnimation('shake');
      playSound('error');
    } finally {
      if (!leaving) setLoading(false);
    }
  };

  const handleResetVault = () => {
    destroyLocalVault();
    playSound('lock');
    setConfirming(null);
    setPassword('');
    setError('');
    setVault({ exists: false, mode: null, email: null, legacy: false });
    setTab('create');
    setStep('choose');
    setScreen('auth');
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutCloud();
      playSound('lock');
      setConfirming(null);
      setPassword('');
      setVault({ exists: false, mode: null, email: null, legacy: false });
      setTab('signin');
      setScreen('auth');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendConfirmation(email.trim());
      setNotice('Verification email sent again.');
    } catch (err) {
      setError(err.message);
    }
  };

  const goBackToAuth = () => {
    setScreen(vault.exists ? 'unlock' : 'auth');
    setError('');
    setNotice('');
  };

  if (!ready) return null;

  const isCreate = screen === 'auth' && tab === 'create';
  const choosing = isCreate && step === 'choose';
  const headline = {
    unlock: 'Welcome back',
    confirm: 'Check your inbox',
    forgot: 'Reset your password',
    'forgot-sent': 'Check your inbox',
    auth: tab === 'signin' ? 'Sign in to Vaultify' : step === 'choose' ? 'Create your account' : mode === 'cloud' ? 'Create your synced vault' : 'Create your local vault',
  }[screen];
  const subline = {
    unlock: vault.mode === 'cloud' ? 'Enter your master password to unlock your synced vault.' : 'Enter your master password to unlock your vault.',
    confirm: `We sent a verification link to ${email}. Confirm it, then sign in.`,
    forgot: 'We’ll email you a reset link. You’ll need your recovery key to restore access to your data.',
    'forgot-sent': `If an account exists for ${email}, a reset link is on its way.`,
    auth: tab === 'signin' ? 'Use the email and master password you registered with.' : step === 'choose' ? 'First, choose where your passwords should live.' : mode === 'cloud' ? 'Encrypted in your browser before anything is stored in the cloud.' : 'Encrypted and kept only in this browser. Nothing is uploaded.',
  }[screen];

  return (
    <div className="fixed inset-0 overflow-y-auto">
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-4">
      {recoveryKey && <RecoveryKeyModal recoveryKey={recoveryKey} onDone={() => router.push('/')} />}

      <div className="w-full max-w-[420px]">
        <div className={`card space-y-4 !p-6 transition-all duration-300 ${
          animation === 'shake' ? 'animate-shake-real border-red-500/50' : ''
        } ${animation === 'unlocked' ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : ''}`}>
          <div className="flex items-center gap-3.5">
            <div className={`avatar-badge w-11 h-11 !rounded-xl transition-colors duration-300 ${animation === 'shake' ? 'bg-red-500 shadow-[0_10px_24px_-8px_rgba(239,68,68,0.55)]' : animation === 'unlocked' ? 'bg-green-500 shadow-[0_10px_24px_-8px_rgba(34,197,94,0.55)]' : ''}`}>
              <Logo size={22} className="text-current" animate={animation} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h1 className="text-lg font-bold tracking-tight leading-tight">{headline}</h1>
              <p className="text-xs opacity-60 leading-snug">{subline}</p>
            </div>
          </div>

          {screen === 'auth' && (
            <div className="grid grid-cols-2 p-1 gap-1 rounded-xl border border-border bg-foreground/[0.04] text-sm font-medium">
              {[['signin', 'Sign in'], ['create', 'Create account']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchTab(id)}
                  className={`py-1.5 rounded-lg transition-all ${tab === id ? 'bg-foreground/[0.1] shadow-sm' : 'opacity-50 hover:opacity-80'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {screen === 'confirm' || screen === 'forgot-sent' ? (
            <div className="space-y-3">
              {notice && <p className="text-sm text-green-500">{notice}</p>}
              {error && <p className="text-sm text-red-500">{error}</p>}
              {screen === 'confirm' && (
                <button type="button" onClick={handleResend} className="btn-secondary w-full text-sm">Resend verification email</button>
              )}
              <button type="button" onClick={() => { setTab('signin'); setScreen('auth'); setPassword(''); setConfirmPassword(''); setNotice(''); setError(''); }} className="btn-primary w-full">
                {screen === 'confirm' ? 'Continue to sign in' : 'Back to sign in'}
              </button>
            </div>
          ) : choosing ? (
            <div className="grid gap-3">
              <ModeCard
                disabled={!isCloudConfigured}
                onClick={() => { setMode('cloud'); setStep('details'); setError(''); }}
                title="Sync across devices"
                badge="Recommended"
                description="Encrypted in your browser, then stored in the cloud. Sign in from any device."
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                  </svg>
                }
              >
                {!isCloudConfigured && <p className="text-[11px] text-yellow-500 pt-1">Cloud sync isn’t configured for this deployment.</p>}
              </ModeCard>
              <ModeCard
                onClick={() => { setMode('local'); setStep('details'); setError(''); }}
                title="This device only"
                description="Encrypted and kept in this browser. No account, nothing leaves your device."
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
                  </svg>
                }
              />
              <p className="text-[11px] opacity-40 text-center leading-relaxed pt-1 [@media(max-height:600px)]:hidden">You can switch later from Settings. Either way, your data is encrypted before it is saved.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {isCreate && (
                <div className="flex items-center justify-between -mt-1">
                  <button
                    type="button"
                    onClick={() => { setStep('choose'); setError(''); }}
                    className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    Back
                  </button>
                  <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-foreground/[0.06] opacity-80">
                    {mode === 'cloud' ? 'Sync across devices' : 'This device only'}
                  </span>
                </div>
              )}

              {(screen === 'forgot' || (screen === 'auth' && (tab === 'signin' || mode === 'cloud'))) && (
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-medium opacity-70">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="input !h-11"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus={screen === 'forgot' || tab === 'signin'}
                    required
                  />
                </div>
              )}

              {screen === 'unlock' && vault.mode === 'cloud' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/[0.04] text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate opacity-80">{vault.email}</span>
                </div>
              )}

              {screen !== 'forgot' && (
                <PasswordField
                  id="master-password"
                  label="Master password"
                  value={password}
                  onChange={setPassword}
                  autoComplete={isCreate ? 'new-password' : 'current-password'}
                  autoFocus={screen === 'unlock'}
                  showStrength={isCreate}
                  compact
                />
              )}

              {isCreate && (
                <PasswordField
                  id="confirm-password"
                  label="Confirm master password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  compact
                />
              )}

              {isCreate && (
                <p className="text-[11px] opacity-50 leading-snug [@media(max-height:600px)]:hidden">
                  {mode === 'cloud'
                    ? 'We can’t reset your master password. You’ll get a recovery key next.'
                    : 'Nothing is uploaded. A forgotten password can’t be recovered.'}
                </p>
              )}

              {vault.legacy && screen === 'unlock' && (
                <p className="text-[11px] opacity-50 leading-relaxed">Your vault will be upgraded to stronger encryption the first time you unlock it.</p>
              )}

              {notice && <p className="text-sm text-green-500">{notice}</p>}
              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                    </svg>
                    Processing...
                  </span>
                ) : screen === 'unlock' ? 'Unlock vault'
                  : screen === 'forgot' ? 'Send reset link'
                  : tab === 'signin' ? 'Sign in' : 'Create vault'}
              </button>
            </form>
          )}

          {screen === 'auth' && tab === 'signin' && (
            <button type="button" onClick={() => { setScreen('forgot'); setError(''); setNotice(''); }} className="block mx-auto text-xs opacity-50 hover:opacity-80 underline underline-offset-2">
              Forgot your password?
            </button>
          )}

          {screen === 'forgot' && (
            <button type="button" onClick={goBackToAuth} className="block mx-auto text-xs opacity-50 hover:opacity-80 underline underline-offset-2">Back</button>
          )}

          {screen === 'unlock' && !confirming && (
            <div className="text-center pt-2 space-y-1.5">
              {vault.mode === 'cloud' ? (
                <>
                  <button type="button" onClick={() => { setScreen('forgot'); setError(''); }} className="text-xs opacity-50 hover:opacity-80 underline underline-offset-2">
                    Forgot your password?
                  </button>
                  <div>
                    <button type="button" onClick={() => setConfirming('signout')} className="text-xs opacity-50 hover:opacity-80">
                      Not you? Sign out of this device
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs opacity-40">Forgotten password? Data recovery is not possible.</p>
                  <button type="button" onClick={() => setConfirming('reset')} className="text-xs font-medium text-red-500/70 hover:text-red-500 underline underline-offset-2">
                    Reset vault
                  </button>
                </>
              )}
            </div>
          )}

          {confirming && (
            <div className="pt-3 border-t border-border space-y-3">
              <p className={`text-xs font-medium leading-relaxed text-center ${confirming === 'reset' ? 'text-red-500' : 'opacity-70'}`}>
                {confirming === 'reset'
                  ? 'This will permanently delete every saved password on this device. This cannot be undone.'
                  : 'Sign out of this device? Your vault stays safe in the cloud; you can sign in again anytime.'}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirming(null)} className="btn-secondary flex-1 text-xs py-2">Cancel</button>
                <button
                  type="button"
                  onClick={confirming === 'reset' ? handleResetVault : handleSignOut}
                  className={`flex-1 text-xs py-2 rounded-xl font-semibold transition-colors ${confirming === 'reset' ? 'bg-red-500 text-white hover:bg-red-600' : 'btn-primary !min-h-0'}`}
                >
                  {confirming === 'reset' ? 'Yes, delete everything' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 [@media(max-height:640px)]:hidden">
          <Link href="/how-it-works" className="flex items-center gap-1.5 text-[11px] opacity-50 hover:opacity-90 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            How it works
          </Link>
          <p className="flex items-center gap-1.5 text-[11px] opacity-40">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            End-to-end encrypted · zero-knowledge
          </p>
          <a
            href="https://github.com/Tirth-Babariya"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] opacity-30 hover:opacity-70 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.833.09-.647.35-1.088.636-1.338-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.271.098-2.65 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.747-1.026 2.747-1.026.546 1.379.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.31.678.921.678 1.856 0 1.34-.012 2.421-.012 2.751 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Built by Tirth Babariya
          </a>
        </div>
      </div>
    </div>
    </div>
  );
}
