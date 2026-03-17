'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { storage, session } from '@/lib/storage';
import { playSound } from '@/lib/audio';
import Logo from './Logo';

export default function Navbar() {
  const [isDark, setIsDark] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [navAnimation, setNavAnimation] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Theme sync
    const savedTheme = storage.get('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    // Lock status sync
    const checkStatus = () => {
      const unlocked = !!session.get('vault_key');
      setIsUnlocked(unlocked);
      if (unlocked) setNavAnimation('unlocked');
      else setNavAnimation('');
    };
    checkStatus();
    window.addEventListener('storage', checkStatus);
    return () => window.removeEventListener('storage', checkStatus);
  }, [pathname]);

  const handleManualLock = () => {
    if (!isUnlocked) return;
    
    setNavAnimation('locked');
    playSound('lock');
    setTimeout(() => {
      storage.set('is_locked', true);
      session.remove('vault_key');
      setIsUnlocked(false);
      router.push('/lock');
    }, 400);
  };

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      storage.set('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      storage.set('theme', 'light');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <button 
          onClick={handleManualLock}
          disabled={!isUnlocked}
          className="group flex items-center gap-2.5 text-lg md:text-xl font-bold tracking-tight cursor-pointer disabled:cursor-default outline-none"
          title={isUnlocked ? "Click to lock vault" : "Vaultify"}
        >
          <div className="relative">
            {isUnlocked && (
              <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}
            <Logo 
              size={24} 
              className="text-foreground transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" 
              animate={navAnimation}
            />
          </div>
          <span className="transition-all duration-300 group-hover:tracking-wider">Vaultify</span>
        </button>
        
        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-full hover:bg-foreground/10 transition-colors"
          aria-label="Toggle Theme"
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591 1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12c0 3.728 3.022 6.75 6.75 6.75s6.75-3.022 6.75-6.75S15.728 5.25 12 5.25 5.25 8.272 5.25 12z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </button>
      </div>
    </nav>
  );
}
