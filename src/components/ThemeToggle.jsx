'use client';

import { useEffect, useState } from 'react';
import { getThemePref, setThemePref, subscribeTheme } from '@/lib/theme';

const OPTIONS = [
  { id: 'system', label: 'System theme', path: 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z' },
  { id: 'light', label: 'Light theme', path: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' },
  { id: 'dark', label: 'Dark theme', path: 'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z' },
];

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setTheme(getThemePref());
    return subscribeTheme(() => setTheme(getThemePref()));
  }, []);

  return (
    <div role="radiogroup" aria-label="Theme" className={`inline-flex items-center gap-0.5 p-1 rounded-full border border-border bg-foreground/[0.04] ${className}`}>
      {OPTIONS.map((o) => {
        const active = theme === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => setThemePref(o.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              active ? 'bg-[var(--background)] border border-border shadow-sm text-foreground' : 'text-foreground/45 hover:text-foreground/80'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-[17px] h-[17px]">
              <path strokeLinecap="round" strokeLinejoin="round" d={o.path} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
