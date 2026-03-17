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

export default function Dashboard() {
  const router = useRouter();
  const searchRef = useRef(null);
  const formRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [passwords, setPasswords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUnlocked, setLastUnlocked] = useState(null);
  const [toast, setToast] = useState(null);

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
      timeout = setTimeout(() => {
        handleLock();
      }, 10 * 60 * 1000);
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
    <div className="space-y-8 md:space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
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
        <div className="flex justify-center md:justify-end space-x-2">
          <label className="btn-secondary text-[11px] md:text-xs py-2 px-3 md:px-4 flex items-center gap-2 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="hidden sm:inline">Import</span>
            <input type="file" accept=".json,.csv" className="hidden" onChange={importData} />
          </label>
          <button onClick={exportData} className="btn-secondary text-[11px] md:text-xs py-2 px-3 md:px-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={handleLock} className="btn-secondary text-[11px] md:text-xs py-2 px-3 md:px-4 flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="hidden sm:inline">Lock Vault</span>
            <span className="sm:hidden">Lock</span>
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

          <div className="lg:hidden mt-12 card">
            <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">Quick Generator</h2>
            <Generator />
          </div>
        </section>
      </div>
    </div>
  );
}
