'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { storage, session } from '@/lib/storage';
import { encryptData, decryptData } from '@/lib/crypto';
import { playSound } from '@/lib/audio';
import PasswordForm from '@/components/PasswordForm';
import PasswordList from '@/components/PasswordList';
import Generator from '@/components/Generator';
import SecurityAudit from '@/components/SecurityAudit';
import Settings from '@/components/Settings';

export default function Dashboard() {
  const router = useRouter();
  const searchRef = useRef(null);
  const formRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [passwords, setPasswords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUnlocked, setLastUnlocked] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeView, setActiveView] = useState('passwords'); // 'passwords' or 'settings'

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const initVault = async () => {
      const masterHash = storage.get('master_hash');
      const isLocked = storage.get('is_locked');
      const vaultKey = session.get('vault_key');
      const unlockedTime = session.get('last_unlocked');

      if (!masterHash || isLocked !== false || !vaultKey) {
        router.push('/lock');
        return;
      }

      setLastUnlocked(unlockedTime);

      const encryptedVault = storage.get('passwords');
      if (encryptedVault) {
        try {
          if (Array.isArray(encryptedVault)) {
            setPasswords(encryptedVault);
            const cipherText = await encryptData(encryptedVault, vaultKey);
            storage.set('passwords', cipherText);
          } else {
            const decrypted = await decryptData(encryptedVault, vaultKey);
            setPasswords(decrypted);
          }
        } catch (error) {
          console.error('Decryption failed', error);
          router.push('/lock');
          return;
        }
      }
      setIsReady(true);
    };

    initVault();

    // Auto-lock logic (10 minutes)
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      
      const prefs = storage.get('vault_settings') || {};
      const timerMinutes = prefs.lockTimer || 10;
      
      timeout = setTimeout(() => {
        handleLock();
      }, timerMinutes * 60 * 1000);
    };

    const handleShortcuts = (e) => {
      if (document.activeElement.tagName === 'INPUT' && e.key !== 'Escape') return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        formRef.current?.focus();
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('keydown', handleShortcuts);
    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('keydown', handleShortcuts);
    };
  }, [router]);

  const saveVault = async (updatedPasswords) => {
    const vaultKey = session.get('vault_key');
    if (!vaultKey) return;
    
    try {
      const cipherText = await encryptData(updatedPasswords, vaultKey);
      storage.set('passwords', cipherText);
      setPasswords(updatedPasswords);
    } catch (error) {
      showToast('Error securing vault.');
    }
  };

  const addPassword = (newEntry) => {
    const updated = [newEntry, ...passwords];
    saveVault(updated);
    showToast('Password saved securely!');
  };

  const deletePassword = (id) => {
    const updated = passwords.filter(p => p.id !== id);
    saveVault(updated);
    showToast('Password deleted.');
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target.result;
        let imported = [];
        
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          imported = Array.isArray(data) ? data : (data.passwords || []);
        } else if (file.name.endsWith('.csv')) {
          const rows = content.split('\n').filter(r => r.trim());
          if (rows.length < 2) return;
          const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
          imported = rows.slice(1).map(row => {
            const values = row.split(',').map(v => v.trim());
            const entry = {};
            headers.forEach((h, i) => {
              if (h.includes('site') || h.includes('url') || h.includes('name')) entry.site = values[i];
              if (h.includes('user')) entry.username = values[i];
              if (h.includes('pass')) entry.password = values[i];
            });
            entry.id = Date.now() + Math.round(Math.random() * 1000);
            return entry;
          }).filter(e => e.site && e.password);
        }

        if (imported.length > 0) {
          const merged = [...imported, ...passwords];
          await saveVault(merged);
          showToast(`Imported ${imported.length} entries successfully!`);
        } else {
          showToast('No valid entries found in file.');
        }
      } catch (error) {
        showToast('Import failed. Check file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLock = () => {
    playSound('lock');
    storage.set('is_locked', true);
    session.remove('vault_key');
    router.push('/lock');
  };

  const exportData = () => {
    const dataStr = JSON.stringify(passwords, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'vaultify-export.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('Vault exported as JSON');
  };

  if (!isReady) return null;

  const filteredPasswords = passwords.filter(p => 
    p.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-baseline md:gap-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center md:text-left">Your Vault</h1>
            {lastUnlocked && (
              <span className="text-[10px] uppercase tracking-widest opacity-30 font-bold text-center md:text-left">
                Last unlocked: {new Date(lastUnlocked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <p className="text-foreground/60 text-sm md:text-base text-center md:text-left">Manage your passwords securely in one place.</p>
        </div>
        <div className="grid grid-cols-4 md:flex md:justify-end gap-2">
          <label className="btn-secondary text-[11px] md:text-xs py-2 px-1 md:px-4 flex flex-col md:flex-row items-center gap-1 md:gap-2 cursor-pointer h-14 md:h-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="md:inline text-[9px] md:text-xs uppercase md:normal-case font-bold md:font-medium">Import</span>
            <input type="file" accept=".json,.csv" className="hidden" onChange={importData} />
          </label>
          <button onClick={exportData} className="btn-secondary text-[11px] md:text-xs py-2 px-1 md:px-4 flex flex-col md:flex-row items-center gap-1 md:gap-2 h-14 md:h-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-4 md:h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="md:inline text-[9px] md:text-xs uppercase md:normal-case font-bold md:font-medium">Export</span>
          </button>
          <button 
            onClick={() => setActiveView(activeView === 'settings' ? 'passwords' : 'settings')} 
            className={`btn-secondary text-[11px] md:text-xs py-2 px-1 md:px-4 flex flex-col md:flex-row items-center gap-1 md:gap-2 h-14 md:h-auto ${activeView === 'settings' ? '!bg-[var(--accent)] !text-[var(--accent-foreground)]' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-4 md:h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.127c-.332.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="md:inline text-[9px] md:text-xs uppercase md:normal-case font-bold md:font-medium">Prefs</span>
          </button>
          <button onClick={handleLock} className="btn-secondary text-[11px] md:text-xs py-2 px-1 md:px-4 flex flex-col md:flex-row items-center gap-1 md:gap-2 h-14 md:h-auto">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-4 md:h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="md:inline text-[9px] md:text-xs uppercase md:normal-case font-bold md:font-medium">Lock</span>
          </button>
        </div>
      </header>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 w-[90%] max-w-xs">
          <div className="bg-foreground text-background px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center justify-center gap-2 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {toast}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
          {passwords.length > 0 && (
            <div className="card">
              <SecurityAudit passwords={passwords} />
            </div>
          )}

          <div className="card">
            <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">Add Entry</h2>
            <PasswordForm onAdd={addPassword} inputRef={formRef} />
          </div>
          
          <div className="hidden lg:block card">
            <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">Quick Generator</h2>
            <Generator />
          </div>
        </aside>

        <section className="lg:col-span-2 space-y-6">
          {activeView === 'settings' ? (
            <div className="card">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-bold">Vault Preferences</h2>
                <button 
                  onClick={() => setActiveView('passwords')}
                  className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 flex items-center gap-1.5 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Done
                </button>
              </div>
              <Settings />
            </div>
          ) : (
            <>
              <div className="relative">
                <input 
                  ref={searchRef}
                  type="text" 
                  placeholder="Search by site or username..." 
                  className="input !pl-10 !py-3 md:!py-3.5"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-30">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>

              <PasswordList 
                passwords={filteredPasswords} 
                onDelete={deletePassword} 
              />
            </>
          )}

          <div className="lg:hidden mt-12 card">
            <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">Quick Generator</h2>
            <Generator />
          </div>
        </section>
      </div>
    </div>
  );
}
