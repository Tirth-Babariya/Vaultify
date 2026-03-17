'use client';

import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

const ACCENTS = [
  { id: 'emerald', label: 'Emerald', color: '#10b981' },
  { id: 'blue', label: 'Cyber Blue', color: '#3b82f6' },
  { id: 'ruby', label: 'Ruby Security', color: '#e11d48' },
];

export default function Settings() {
  const [accent, setAccent] = useState('emerald');
  const [sounds, setSounds] = useState(true);
  const [lockTimer, setLockTimer] = useState(10);
  const [defaultLength, setDefaultLength] = useState(16);

  useEffect(() => {
    // Load current preferences
    const prefs = storage.get('vault_settings') || {};
    if (prefs.accent) {
      setAccent(prefs.accent);
      document.documentElement.setAttribute('data-accent', prefs.accent);
    }
    if (prefs.sounds !== undefined) setSounds(prefs.sounds);
    if (prefs.lockTimer) setLockTimer(prefs.lockTimer);
    if (prefs.defaultLength) setDefaultLength(prefs.defaultLength);
  }, []);

  const updateSetting = (key, value) => {
    const currentPrefs = storage.get('vault_settings') || {};
    const newPrefs = { ...currentPrefs, [key]: value };
    storage.set('vault_settings', newPrefs);
    
    if (key === 'accent') {
      setAccent(value);
      document.documentElement.setAttribute('data-accent', value);
    } else if (key === 'sounds') {
      setSounds(value);
    } else if (key === 'lockTimer') {
      setLockTimer(value);
    } else if (key === 'defaultLength') {
      setDefaultLength(value);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Accent Engine */}
      <section className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Theme Accent</label>
        <div className="grid grid-cols-3 gap-3">
          {ACCENTS.map((item) => (
            <button
              key={item.id}
              onClick={() => updateSetting('accent', item.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${
                accent === item.id 
                  ? 'border-[var(--accent)] bg-[var(--accent-glow)]' 
                  : 'border-border/40 bg-foreground/[0.02] hover:bg-foreground/[0.04]'
              }`}
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Preferences */}
      <section className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-foreground/[0.02] rounded-2xl border border-border/40">
          <div className="space-y-0.5">
            <div className="text-sm font-bold">Mechanical Sounds</div>
            <div className="text-[10px] opacity-40">Enable clicking sounds for interactions</div>
          </div>
          <button 
            onClick={() => updateSetting('sounds', !sounds)}
            className={`w-10 h-6 rounded-full transition-colors relative ${sounds ? 'bg-[var(--accent)]' : 'bg-foreground/10'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${sounds ? 'left-5' : 'left-1'}`} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Vault Auto-Lock</label>
            <span className="text-xs font-bold font-mono opacity-60">{lockTimer}m</span>
          </div>
          <input 
            type="range"
            min="1"
            max="60"
            value={lockTimer}
            onChange={(e) => updateSetting('lockTimer', Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Default Password Length</label>
            <span className="text-xs font-bold font-mono opacity-60">{defaultLength}</span>
          </div>
          <input 
            type="range"
            min="8"
            max="32"
            value={defaultLength}
            onChange={(e) => updateSetting('defaultLength', Number(e.target.value))}
            className="w-full"
          />
        </div>
      </section>
    </div>
  );
}
