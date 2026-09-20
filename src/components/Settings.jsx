'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { storage } from '@/lib/storage';
import { getThemePref, setThemePref, subscribeTheme } from '@/lib/theme';
import { saveAccent, rgbDuration, RGB_DEFAULTS } from '@/lib/accent';

const ACCENTS = [
  { id: 'emerald', label: 'Emerald', color: '#10b981' },
  { id: 'blue', label: 'Cyber Blue', color: '#3b82f6' },
  { id: 'ruby', label: 'Ruby Security', color: '#e11d48' },
];

const THEMES = [
  { id: 'light', label: 'Light', preview: { background: '#ffffff', border: '#e5e5e5', line: '#d4d4d4', bar: '#171717' } },
  { id: 'dark', label: 'Dark', preview: { background: '#0a0a0a', border: '#262626', line: '#404040', bar: '#fafafa' } },
  { id: 'system', label: 'System', preview: null },
];

const savePref = (key, value) => storage.set('vault_settings', { ...(storage.get('vault_settings') || {}), [key]: value });

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

function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${on ? 'bg-[var(--accent)]' : 'bg-foreground/15'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-1'}`} />
    </button>
  );
}

function ThemePreview({ theme }) {
  const p = theme.preview;
  const mini = (bg, border, line, bar) => (
    <div className="h-full w-full p-2 space-y-1.5" style={{ background: bg, borderColor: border }}>
      <div className="h-1.5 w-1/2 rounded-full" style={{ background: bar }} />
      <div className="h-1 w-full rounded-full" style={{ background: line }} />
      <div className="h-1 w-3/4 rounded-full" style={{ background: line }} />
    </div>
  );
  return (
    <div className="h-16 w-full rounded-lg overflow-hidden border border-border">
      {p ? mini(p.background, p.border, p.line, p.bar) : (
        <div className="flex h-full">
          <div className="w-1/2 overflow-hidden">{mini('#ffffff', '#e5e5e5', '#d4d4d4', '#171717')}</div>
          <div className="w-1/2 overflow-hidden">{mini('#0a0a0a', '#262626', '#404040', '#fafafa')}</div>
        </div>
      )}
    </div>
  );
}

export function AppearanceSettings() {
  const [theme, setTheme] = useState('dark');
  const [accent, setAccent] = useState('emerald');
  const [rgbSpeed, setRgbSpeed] = useState(RGB_DEFAULTS.speed);
  const [rgbSpread, setRgbSpread] = useState(RGB_DEFAULTS.spread);

  useEffect(() => {
    setTheme(getThemePref());
    const unsubscribe = subscribeTheme(() => setTheme(getThemePref()));
    const prefs = storage.get('vault_settings') || {};
    if (prefs.accent) setAccent(prefs.accent);
    if (prefs.rgbSpeed) setRgbSpeed(prefs.rgbSpeed);
    if (prefs.rgbSpread !== undefined) setRgbSpread(prefs.rgbSpread);
    return unsubscribe;
  }, []);

  const chooseTheme = (id) => {
    setTheme(id);
    setThemePref(id);
  };

  const chooseAccent = (id) => {
    setAccent(id);
    saveAccent({ accent: id });
  };

  const updateRgb = (key, value, setter) => {
    setter(value);
    saveAccent({ [key]: value });
  };

  const track = (value, min, max) => {
    const p = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, var(--accent), var(--accent-2) ${p}%, var(--border) ${p}%)`;
  };
  const tile = (active) =>
    `flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${
      active ? 'border-[var(--accent)] bg-[var(--accent-glow)]' : 'border-border/60 hover:bg-foreground/[0.04]'
    }`;

  return (
    <div className="space-y-6">
      <Panel title="Theme" description="Choose how Vaultify looks. “System” follows your device setting.">
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
          {THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={theme === item.id}
              onClick={() => chooseTheme(item.id)}
              className={`space-y-2 p-2 rounded-2xl border text-left transition-all ${
                theme === item.id ? 'border-[var(--accent)] bg-[var(--accent-glow)]' : 'border-border/60 hover:bg-foreground/[0.04]'
              }`}
            >
              <ThemePreview theme={item} />
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold">{item.label}</span>
                {theme === item.id && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Accent color" description="Used for buttons, highlights and focus rings. Choose a colour, or let RGB Auto cycle through them all.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ACCENTS.map((item) => (
            <button key={item.id} type="button" onClick={() => chooseAccent(item.id)} aria-pressed={accent === item.id} className={tile(accent === item.id)}>
              <div className="w-6 h-6 rounded-full ring-1 ring-black/10" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">{item.label}</span>
            </button>
          ))}
          <button type="button" onClick={() => chooseAccent('rgb')} aria-pressed={accent === 'rgb'} className={tile(accent === 'rgb')}>
            <div
              className="w-6 h-6 rounded-full ring-1 ring-black/10 animate-spin"
              style={{ animationDuration: '5s', background: 'conic-gradient(#ef4444, #f59e0b, #84cc16, #22c55e, #06b6d4, #6366f1, #d946ef, #ef4444)' }}
            />
            <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">RGB Auto</span>
          </button>
        </div>
      </Panel>

      {accent === 'rgb' && (
        <Panel title="RGB lighting" description="The whole interface flows through the colour spectrum automatically. Tune how it moves.">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
            <button type="button" className="btn-primary !min-h-10 text-sm">Primary button</button>
            <span className="avatar-badge w-10 h-10 !rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </span>
            <div className="h-2.5 flex-1 min-w-[90px] rounded-full" style={{ background: 'var(--accent-gradient)' }} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label htmlFor="rgb-speed" className="text-xs font-medium opacity-70">Speed</label>
              <span className="text-xs font-bold font-mono opacity-60">{rgbDuration(rgbSpeed)} per cycle</span>
            </div>
            <input id="rgb-speed" type="range" min="1" max="6" value={rgbSpeed} onChange={(e) => updateRgb('rgbSpeed', Number(e.target.value), setRgbSpeed)} className="w-full" style={{ background: track(rgbSpeed, 1, 6) }} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label htmlFor="rgb-spread" className="text-xs font-medium opacity-70">Gradient width</label>
              <span className="text-xs font-bold font-mono opacity-60">{rgbSpread === 0 ? 'Solid' : `${rgbSpread}°`}</span>
            </div>
            <input id="rgb-spread" type="range" min="0" max="180" step="5" value={rgbSpread} onChange={(e) => updateRgb('rgbSpread', Number(e.target.value), setRgbSpread)} className="w-full" style={{ background: track(rgbSpread, 0, 180) }} />
          </div>

          <p className="text-[11px] opacity-40 leading-relaxed">The animation pauses automatically if your device is set to reduce motion.</p>
        </Panel>
      )}
    </div>
  );
}

export function GeneralSettings() {
  const [sounds, setSounds] = useState(true);
  const [lockTimer, setLockTimer] = useState(10);
  const [defaultLength, setDefaultLength] = useState(16);

  useEffect(() => {
    const prefs = storage.get('vault_settings') || {};
    if (prefs.sounds !== undefined) setSounds(prefs.sounds);
    if (prefs.lockTimer) setLockTimer(prefs.lockTimer);
    if (prefs.defaultLength) setDefaultLength(prefs.defaultLength);
  }, []);

  const update = (key, value, setter) => {
    setter(value);
    savePref(key, value);
  };

  const fill = (value, min, max) => `linear-gradient(to right, var(--accent) ${((value - min) / (max - min)) * 100}%, var(--border) ${((value - min) / (max - min)) * 100}%)`;

  return (
    <div className="space-y-6">
      <Panel title="Feedback">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Mechanical sounds</div>
            <div className="text-xs opacity-50">Play subtle clicks when locking, unlocking and on errors.</div>
          </div>
          <Toggle on={sounds} onChange={(v) => update('sounds', v, setSounds)} label="Mechanical sounds" />
        </div>
      </Panel>

      <Panel title="Vault auto-lock" description="Lock automatically after a period of inactivity.">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label htmlFor="lock-timer" className="text-xs font-medium opacity-70">Lock after</label>
            <span className="text-xs font-bold font-mono opacity-60">{lockTimer} min</span>
          </div>
          <input
            id="lock-timer"
            type="range"
            min="1"
            max="60"
            value={lockTimer}
            onChange={(e) => update('lockTimer', Number(e.target.value), setLockTimer)}
            className="w-full"
            style={{ background: fill(lockTimer, 1, 60) }}
          />
        </div>
      </Panel>

      <Panel title="Help" description="How encryption, sync, recovery and privacy work.">
        <Link href="/how-it-works" className="btn-secondary text-sm !min-h-10 w-fit gap-2">
          How Vaultify works
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 opacity-60">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </Panel>

      <Panel title="Password generator" description="Default length used by the generator.">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label htmlFor="default-length" className="text-xs font-medium opacity-70">Default length</label>
            <span className="text-xs font-bold font-mono opacity-60">{defaultLength} characters</span>
          </div>
          <input
            id="default-length"
            type="range"
            min="8"
            max="32"
            value={defaultLength}
            onChange={(e) => update('defaultLength', Number(e.target.value), setDefaultLength)}
            className="w-full"
            style={{ background: fill(defaultLength, 8, 32) }}
          />
        </div>
      </Panel>
    </div>
  );
}
