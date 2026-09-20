'use client';

import { useState, useRef } from 'react';
import { playSound } from '@/lib/audio';
import { suggestSites } from '@/lib/siteSuggestions';
import GroupDropdown from './GroupDropdown';
import { newId } from '@/lib/vaultData';

export default function PasswordForm({ onAdd, inputRef, groups = [] }) {
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [groupId, setGroupId] = useState(null);
  const [showSiteSuggestions, setShowSiteSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  const siteSuggestions = suggestSites(site);

  const selectSuggestion = (suggestion) => {
    setSite(suggestion);
    setShowSiteSuggestions(false);
    setActiveSuggestion(-1);
  };

  const handleSiteKeyDown = (e) => {
    if (!showSiteSuggestions || siteSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((i) => (i + 1) % siteSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((i) => (i <= 0 ? siteSuggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault();
      selectSuggestion(siteSuggestions[activeSuggestion]);
    } else if (e.key === 'Escape') {
      setShowSiteSuggestions(false);
      setActiveSuggestion(-1);
    }
  };

  const fileInputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scanRawText, setScanRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const processImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setScanError('Please provide an image file.');
      return;
    }

    setScanError('');
    setScanSuccess(false);
    setScanRawText('');
    setShowRawText(false);
    setScanning(true);
    setScanProgress(0);

    try {
      const { extractCredentialsFromImage } = await import('@/lib/ocr');
      const result = await extractCredentialsFromImage(file, setScanProgress);
      setScanRawText(result.rawText?.trim() || '');

      let found = false;
      if (result.username) { setUsername(result.username); found = true; }
      if (result.password) { setPassword(result.password); found = true; }
      if (result.site) { setSite((prev) => prev || result.site); }

      if (found) {
        setScanSuccess(true);
        playSound('unlock');
      } else {
        setScanError('Could not confidently find a username/password. Check the scanned text below, or enter them manually.');
        playSound('error');
      }
    } catch (err) {
      setScanError('Failed to scan image. Please try again or enter manually.');
      playSound('error');
    } finally {
      setScanning(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) processImage(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          processImage(file);
        }
        break;
      }
    }
  };

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

  const strength = getStrength(password);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!site || !password) return;

    onAdd({
      id: newId(),
      site,
      username,
      password,
      groupId
    });

    setSite('');
    setUsername('');
    setPassword('');
    setGroupId(null);
    setScanSuccess(false);
    setScanError('');
    setScanRawText('');
    setShowRawText(false);
    setShowPassword(false);
  };

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center transition-colors glass ${
          isDragging ? 'border-[var(--accent)]' : ''
        }`}
      >
        {scanning ? (
          <>
            <svg className="h-5 w-5 animate-spin opacity-60" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
            <p className="text-xs opacity-60">Scanning screenshot… {scanProgress}%</p>
          </>
        ) : (
          <>
            <svg className="h-5 w-5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs opacity-60">Paste (Ctrl+V) or drop a screenshot to auto-fill</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Upload Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
        {scanError && <p className="text-[11px] text-red-500">{scanError}</p>}
        {scanSuccess && <p className="text-[11px] text-green-500">Auto-filled from screenshot — please verify before saving</p>}
        {scanRawText && (
          <button
            type="button"
            onClick={() => setShowRawText((v) => !v)}
            className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-70 underline"
          >
            {showRawText ? 'Hide' : 'Show'} scanned text
          </button>
        )}
        {showRawText && (
          <pre className="w-full max-h-28 overflow-auto rounded-md bg-foreground/[0.06] p-2 text-left text-[11px] whitespace-pre-wrap select-text">
            {scanRawText}
          </pre>
        )}
      </div>
      <div className="space-y-1 relative">
        <label htmlFor="site" className="text-[10px] font-bold uppercase tracking-widest opacity-40">Website / App</label>
        <input
          id="site"
          ref={inputRef}
          type="text"
          className="input h-10 text-sm glass"
          placeholder="GitHub, Netflix..."
          value={site}
          onChange={(e) => { setSite(e.target.value); setActiveSuggestion(-1); }}
          onFocus={() => setShowSiteSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSiteSuggestions(false), 120)}
          onKeyDown={handleSiteKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={showSiteSuggestions && siteSuggestions.length > 0}
          aria-controls="site-suggestions"
          required
        />
        {showSiteSuggestions && siteSuggestions.length > 0 && (
          <ul id="site-suggestions" className="absolute z-10 top-full mt-1 w-full overflow-hidden rounded-lg border border-border bg-[var(--background)] shadow-lg">
            {siteSuggestions.map((suggestion, i) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setActiveSuggestion(i)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    i === activeSuggestion ? 'bg-[var(--accent)] text-white' : 'hover:bg-foreground/5'
                  }`}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="username" className="text-[10px] font-bold uppercase tracking-widest opacity-40">Username / Email</label>
        <input 
          id="username"
          type="text" 
          className="input h-10 text-sm glass" 
          placeholder="john@example.com"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest opacity-40">Password</label>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${
            strength <= 2 ? 'text-red-500' : strength <= 4 ? 'text-yellow-500' : 'text-green-500'
          }`}>
            {password ? (strength <= 2 ? 'Weak' : strength <= 4 ? 'Medium' : 'Strong') : 'Strength'}
          </span>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            className="input h-10 text-sm glass !pr-10"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 hover:bg-foreground/10 rounded-md transition-colors"
            title={showPassword ? 'Hide' : 'Show'}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 opacity-60">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 opacity-60">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
        {password && (
          <div className="h-1 w-full bg-foreground/5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                strength <= 2 ? 'bg-red-500' : strength <= 4 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${(strength / 5) * 100}%` }}
            />
          </div>
        )}
      </div>
      {groups.length > 0 && (
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Group</label>
          <GroupDropdown groups={groups} value={groupId} onChange={setGroupId} />
        </div>
      )}
      <button type="submit" className="btn-primary w-full text-sm py-2">
        Save Password
      </button>
    </form>
  );
}
