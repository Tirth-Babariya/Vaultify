'use client';

import { useState } from 'react';

export default function RecoveryKeyModal({ recoveryKey, onDone, title = 'Save your recovery key' }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob(
      [`Vaultify recovery key\n\n${recoveryKey}\n\nKeep this somewhere safe and private. Anyone with this key and access to your account email can reset your vault.\n`],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vaultify-recovery-key.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="card w-full max-w-md space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="text-sm opacity-60 leading-relaxed">
            This is the only way to recover your vault if you forget your master password. We can&apos;t reset it for you, because we never see your password.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-foreground/[0.03] p-4 text-center font-mono text-[15px] tracking-wider leading-relaxed break-all select-all">
          {recoveryKey}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={copy} className="btn-secondary text-sm">{copied ? 'Copied' : 'Copy'}</button>
          <button type="button" onClick={download} className="btn-secondary text-sm">Download</button>
        </div>

        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
          <span className="opacity-80">I&apos;ve saved my recovery key somewhere safe.</span>
        </label>

        <button type="button" disabled={!saved} onClick={onDone} className="btn-primary w-full disabled:opacity-40 disabled:pointer-events-none">
          Continue to vault
        </button>
      </div>
    </div>
  );
}
