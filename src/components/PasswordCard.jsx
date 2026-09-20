'use client';

import { useState } from 'react';
import { SITE_DOMAINS } from '@/lib/siteSuggestions';
import Logo from './Logo';
import GroupDropdown from './GroupDropdown';

export default function PasswordCard({ item, onDelete, isReused, groups = [], onChangeGroup }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const getStrength = (pass) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getStrength(item.password);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [imgError, setImgError] = useState(false);

  // Only attempt a favicon fetch when we have real confidence a domain
  // exists — a raw domain the user typed, or a known service from our
  // suggestions list. Guessing "<name>.com" for arbitrary free text (e.g. an
  // entry named "Office Wifi") just surfaces Google's generic globe icon for
  // domains that don't really exist, which looks broken. Anything else
  // falls back to the app's own logo.
  const site = item.site.trim();
  const domain = SITE_DOMAINS[site.toLowerCase()]
    ?? (site.includes('.') ? site.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') : undefined);

  const getFavicon = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return (
    <div className="card group relative p-4 md:p-5">
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {domain && !imgError ? (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg overflow-hidden bg-foreground/5 flex-shrink-0 flex items-center justify-center border border-border">
              <img
                src={getFavicon(domain)}
                alt=""
                className="w-5 h-5 md:w-6 md:h-6 object-contain"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="avatar-badge w-8 h-8 md:w-10 md:h-10 rounded-lg flex-shrink-0">
              <Logo size={16} className="text-current" />
            </div>
          )}
          <div className="space-y-0.5 md:space-y-1 min-w-0">
            <h3 className="font-bold text-base md:text-lg leading-tight truncate">{item.site}</h3>
            <div className="flex items-center gap-2 overflow-hidden">
              <p className="text-[11px] md:text-sm text-foreground/50 truncate flex-shrink min-w-0">
                {item.username || 'No username'}
              </p>
              <div className="flex gap-1 flex-shrink-0">
                {strength <= 2 && (
                  <span className="text-[8px] font-bold uppercase tracking-tighter bg-red-500/10 text-red-500 px-1 rounded-sm">Weak</span>
                )}
                {isReused && (
                  <span className="text-[8px] font-bold uppercase tracking-tighter bg-yellow-500/10 text-yellow-500 px-1 rounded-sm">Reused</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <button 
          onClick={onDelete}
          className="md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-red-500/10 hover:text-red-500 rounded-md transition-all flex-shrink-0"
          aria-label="Delete entry"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      {groups.length > 0 && (
        <div className="mb-3">
          <GroupDropdown
            groups={groups}
            value={item.groupId}
            onChange={(id) => onChangeGroup(item.id, id)}
            noneLabel="Ungrouped"
            variant="pill"
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-foreground/5 rounded-md px-3 py-2 font-mono text-[13px] md:text-sm overflow-hidden text-ellipsis whitespace-nowrap h-10 flex items-center">
          {showPassword ? item.password : '••••••••••••'}
        </div>
        <button 
          onClick={() => setShowPassword(!showPassword)}
          className="p-2 hover:bg-foreground/10 rounded-md transition-colors"
          title={showPassword ? "Hide" : "Show"}
        >
          {showPassword ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
        <button 
          onClick={() => copyToClipboard(item.password)}
          className={`p-2 rounded-md transition-all ${copied ? 'bg-green-500 text-white' : 'hover:bg-foreground/10'}`}
          title="Copy"
        >
          {copied ? (
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
