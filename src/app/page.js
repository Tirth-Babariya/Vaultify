'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { storage, session } from '@/lib/storage';
import { encryptData, decryptData, hashPassword } from '@/lib/crypto';
import { playSound } from '@/lib/audio';
import PasswordForm from '@/components/PasswordForm';
import PasswordList from '@/components/PasswordList';
import Generator from '@/components/Generator';
import SecurityAudit from '@/components/SecurityAudit';
import Settings from '@/components/Settings';
import Groups from '@/components/Groups';
import Sidebar from '@/components/Sidebar';

export default function Dashboard() {
  const router = useRouter();
  const searchRef = useRef(null);
  const formRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [passwords, setPasswords] = useState([]);
  const [groups, setGroups] = useState([]);
  const [unlockedGroupIds, setUnlockedGroupIds] = useState(() => new Set(session.get('unlocked_groups') || []));
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUnlocked, setLastUnlocked] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeView, setActiveView] = useState('passwords'); // 'passwords', 'groups', 'generator', 'security', 'settings'

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

      const encryptedGroups = storage.get('groups');
      if (encryptedGroups) {
        try {
          const decrypted = await decryptData(encryptedGroups, vaultKey);
          setGroups(decrypted);
        } catch (error) {
          console.error('Group decryption failed', error);
        }
      }

      setIsReady(true);
    };

    initVault();

    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      const prefs = storage.get('vault_settings') || {};
      const timerMinutes = prefs.lockTimer || 10;
      timeout = setTimeout(() => handleLock(), timerMinutes * 60 * 1000);
    };

    const handleShortcuts = (e) => {
      if (document.activeElement.tagName === 'INPUT' && e.key !== 'Escape') return;

      if (e.key === '/') {
        e.preventDefault();
        setActiveView('passwords');
        setTimeout(() => searchRef.current?.focus(), 50);
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveView('passwords');
        setTimeout(() => formRef.current?.focus(), 50);
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

  const changeEntryGroup = (id, groupId) => {
    const updated = passwords.map(p => p.id === id ? { ...p, groupId } : p);
    saveVault(updated);
  };

  const saveGroups = async (updatedGroups) => {
    const vaultKey = session.get('vault_key');
    if (!vaultKey) return;
    try {
      const cipherText = await encryptData(updatedGroups, vaultKey);
      storage.set('groups', cipherText);
      setGroups(updatedGroups);
    } catch (error) {
      showToast('Error saving group.');
    }
  };

  const addGroup = async (name, passcode) => {
    const passcodeHash = passcode ? await hashPassword(passcode) : null;
    const newGroup = { id: Date.now(), name, passcodeHash };
    await saveGroups([...groups, newGroup]);
    showToast('Group created.');
  };

  const deleteGroup = (id) => {
    saveGroups(groups.filter(g => g.id !== id));
    // Entries in the deleted group fall back to Ungrouped rather than vanishing.
    saveVault(passwords.map(p => p.groupId === id ? { ...p, groupId: null } : p));
    setUnlockedGroupIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      session.set('unlocked_groups', [...next]);
      return next;
    });
    showToast('Group deleted.');
  };

  const setGroupPasscode = async (id, passcode) => {
    const passcodeHash = passcode ? await hashPassword(passcode) : null;
    await saveGroups(groups.map(g => g.id === id ? { ...g, passcodeHash } : g));
    showToast(passcode ? 'Passcode set for group.' : 'Passcode removed from group.');
  };

  const unlockGroup = async (id, passcode) => {
    const group = groups.find(g => g.id === id);
    if (!group?.passcodeHash) return true;
    const hash = await hashPassword(passcode);
    if (hash !== group.passcodeHash) return false;
    setUnlockedGroupIds(prev => {
      const next = new Set(prev).add(id);
      session.set('unlocked_groups', [...next]);
      return next;
    });
    return true;
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
    session.remove('unlocked_groups');
    router.push('/lock');
  };

  const exportData = () => {
    const dataStr = JSON.stringify(passwords, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'vaultify-export.json');
    linkElement.click();
    showToast('Vault exported as JSON');
  };

  if (!isReady) return null;

  const filteredPasswords = passwords.filter(p => 
    p.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderView = () => {
    switch (activeView) {
      case 'passwords':
        return (
          <div className="page-transition space-y-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Your Vault</h1>
                <p className="text-foreground/50 text-sm">{passwords.length} items secured</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="btn-secondary text-xs h-12 md:h-10 cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Import
                  <input type="file" accept=".json,.csv" className="hidden" onChange={importData} />
                </label>
                <button onClick={exportData} className="btn-secondary text-xs h-12 md:h-10">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Export
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <aside className="space-y-6">
                <div className="card glass">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">Add New Entry</h2>
                  <PasswordForm onAdd={addPassword} inputRef={formRef} groups={groups} />
                </div>
              </aside>

              <div className="lg:col-span-2 space-y-6">
                <div className="relative">
                  <input 
                    ref={searchRef}
                    type="text" 
                    placeholder="Search site or username... (Type / to search)" 
                    className="input !pl-10 glass"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search passwords"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-30">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>

                <PasswordList
                  passwords={filteredPasswords.length > 0 || searchQuery ? filteredPasswords : passwords}
                  onDelete={deletePassword}
                  groups={groups}
                  unlockedGroupIds={unlockedGroupIds}
                  onUnlockGroup={unlockGroup}
                  onChangeGroup={changeEntryGroup}
                />
              </div>
            </div>
          </div>
        );
      case 'groups':
        return (
          <div className="page-transition max-w-3xl mx-auto space-y-8">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Groups</h1>
              <p className="text-foreground/50 text-sm">Organize entries into groups, with an optional passcode on each.</p>
            </div>
            <div className="card glass p-8">
              <Groups
                groups={groups}
                passwords={passwords}
                onAdd={addGroup}
                onDelete={deleteGroup}
                onSetPasscode={setGroupPasscode}
              />
            </div>
          </div>
        );
      case 'generator':
        return (
          <div className="page-transition max-w-2xl mx-auto space-y-8">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Generator</h1>
              <p className="text-foreground/50 text-sm">Create crypographically strong passwords.</p>
            </div>
            <div className="card glass p-8">
              <Generator />
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="page-transition max-w-3xl mx-auto space-y-8">
             <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Security Audit</h1>
              <p className="text-foreground/50 text-sm">Check your password health and reuse patterns.</p>
            </div>
            <div className="card glass p-8">
              <SecurityAudit passwords={passwords} />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="page-transition max-w-2xl mx-auto space-y-8">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-foreground/50 text-sm">Personalize your vault experience.</p>
            </div>
            <div className="card glass p-8">
              <Settings />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-grid bg-[var(--background)]">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onLock={handleLock}
      />

      <main className="min-h-screen pt-4 pb-32 lg:pb-12 px-4 lg:px-12 lg:ml-[var(--sidebar-w)] overflow-x-hidden">
        <div className="max-w-6xl mx-auto mt-4 lg:mt-10">
          {renderView()}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-20 lg:bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300 w-[90%] max-w-xs">
          <div className="bg-[var(--foreground)] text-[var(--background)] px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center justify-center gap-2 text-center border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-[var(--accent)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
