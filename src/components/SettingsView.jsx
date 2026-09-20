'use client';

import { useRef, useState } from 'react';
import Account from './Account';
import { AppearanceSettings, GeneralSettings } from './Settings';

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
  { id: 'activity', label: 'Activity' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'general', label: 'General' },
];

export default function SettingsView({ onSignedOut }) {
  const [tab, setTab] = useState('account');
  const refs = useRef({});

  const onKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = null;
    if (e.key === 'ArrowRight') next = TABS[(i + 1) % TABS.length];
    if (e.key === 'ArrowLeft') next = TABS[(i - 1 + TABS.length) % TABS.length];
    if (e.key === 'Home') next = TABS[0];
    if (e.key === 'End') next = TABS[TABS.length - 1];
    if (next) {
      e.preventDefault();
      setTab(next.id);
      refs.current[next.id]?.focus();
    }
  };

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Settings sections" onKeyDown={onKeyDown} className="flex gap-1 border-b overflow-x-auto overflow-y-hidden no-scrollbar">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => { refs.current[t.id] = el; }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${active ? '' : 'opacity-50 hover:opacity-80'}`}
            >
              {t.label}
              {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--accent)]" />}
            </button>
          );
        })}
      </div>

      <div key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="page-transition">
        {tab === 'appearance' ? (
          <AppearanceSettings />
        ) : tab === 'general' ? (
          <GeneralSettings />
        ) : (
          <Account section={tab} onSignedOut={onSignedOut} />
        )}
      </div>
    </div>
  );
}
