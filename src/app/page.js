'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { session } from '@/lib/storage';
import { hashPassword, encryptBackup, decryptBackup, isBackupFile } from '@/lib/crypto';
import { playSound } from '@/lib/audio';
import { isUnlocked, restoreSession, getVault, subscribeVault, mutate, lockVault, verifyPassword } from '@/lib/vaultStore';
import { initSync } from '@/lib/cloud';
import { newId } from '@/lib/vaultData';
import PasswordForm from '@/components/PasswordForm';
import PasswordList from '@/components/PasswordList';
import Generator from '@/components/Generator';
import SecurityAudit from '@/components/SecurityAudit';
import SettingsView from '@/components/SettingsView';
import SyncBadge from '@/components/SyncBadge';
import Groups from '@/components/Groups';
import Sidebar from '@/components/Sidebar';
import GitHubLink from '@/components/GitHubLink';
import ThemeToggle from '@/components/ThemeToggle';
import PasswordPrompt from '@/components/PasswordPrompt';
import EditEntryModal from '@/components/EditEntryModal';

export default function Dashboard() {
  const router = useRouter();
  const searchRef = useRef(null);
  const formRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [vault, setVault] = useState({ entries: [], groups: [], tombstones: {} });
  const [unlockedGroupIds, setUnlockedGroupIds] = useState(() => new Set(session.get('unlocked_groups') || []));
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [activeView, setActiveView] = useState('passwords'); // 'passwords', 'groups', 'generator', 'security', 'settings'
  const [prompt, setPrompt] = useState(null); // { type: 'export' } | { type: 'import', content }
  const [exportFormat, setExportFormat] = useState('encrypted');
  const [editingId, setEditingId] = useState(null);

  const passwords = vault.entries;
  const groups = vault.groups;

  // One timer at a time: an older toast's timeout must not dismiss a newer message early.
  const toastTimer = useRef(null);
  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let unsubscribe = () => {};
    (async () => {
      if (!isUnlocked() || !(await restoreSession())) {
        router.push('/lock');
        return;
      }
      setVault(getVault());
      unsubscribe = subscribeVault(setVault);
      initSync();
      setIsReady(true);
    })();

    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      let prefs = {};
      try { prefs = JSON.parse(localStorage.getItem('vault_settings') || '{}'); } catch { /* ignore */ }
      const timerMinutes = prefs.lockTimer || 10;
      timeout = setTimeout(() => handleLock(), timerMinutes * 60 * 1000);
    };

    const handleShortcuts = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && e.key !== 'Escape') return;

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
      unsubscribe();
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('keydown', handleShortcuts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const addPassword = (newEntry) => {
    mutate((v) => ({ ...v, entries: [{ ...newEntry, updatedAt: Date.now() }, ...v.entries] }));
    showToast('Password saved securely!');
  };

  const deletePassword = (id) => {
    mutate((v) => ({
      ...v,
      entries: v.entries.filter((p) => p.id !== id),
      tombstones: { ...v.tombstones, [`e:${id}`]: Date.now() },
    }));
    showToast('Password deleted.');
  };

  const updateEntry = (id, changes) => {
    mutate((v) => ({ ...v, entries: v.entries.map((p) => (p.id === id ? { ...p, ...changes, updatedAt: Date.now() } : p)) }));
    setEditingId(null);
    showToast('Entry updated.');
  };

  const changeEntryGroup = (id, groupId) => {
    mutate((v) => ({ ...v, entries: v.entries.map((p) => (p.id === id ? { ...p, groupId, updatedAt: Date.now() } : p)) }));
  };

  const addGroup = async (name, passcode) => {
    const passcodeHash = passcode ? await hashPassword(passcode) : null;
    mutate((v) => ({ ...v, groups: [...v.groups, { id: newId(), name, passcodeHash, updatedAt: Date.now() }] }));
    showToast('Group created.');
  };

  const deleteGroup = (id) => {
    const now = Date.now();
    mutate((v) => ({
      ...v,
      groups: v.groups.filter((g) => g.id !== id),
      // Entries in the deleted group fall back to Ungrouped rather than vanishing.
      entries: v.entries.map((p) => (p.groupId === id ? { ...p, groupId: null, updatedAt: now } : p)),
      tombstones: { ...v.tombstones, [`g:${id}`]: now },
    }));
    setUnlockedGroupIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      session.set('unlocked_groups', [...next]);
      return next;
    });
    showToast('Group deleted.');
  };

  const setGroupPasscode = async (id, passcode) => {
    const passcodeHash = passcode ? await hashPassword(passcode) : null;
    mutate((v) => ({ ...v, groups: v.groups.map((g) => (g.id === id ? { ...g, passcodeHash, updatedAt: Date.now() } : g)) }));
    showToast(passcode ? 'Passcode set for group.' : 'Passcode removed from group.');
  };

  const unlockGroup = async (id, passcode) => {
    const group = groups.find((g) => g.id === id);
    if (!group?.passcodeHash) return true;
    if ((await hashPassword(passcode)) !== group.passcodeHash) return false;
    setUnlockedGroupIds((prev) => {
      const next = new Set(prev).add(id);
      session.set('unlocked_groups', [...next]);
      return next;
    });
    return true;
  };

  const addImported = (imported) => {
    imported = imported.filter((entry) => entry && entry.site && entry.password);
    if (imported.length > 0) {
      const now = Date.now();
      const stamped = imported.map((entry, i) => ({
        username: '',
        ...entry,
        id: newId() + i,
        groupId: null,
        updatedAt: now,
      }));
      mutate((v) => ({ ...v, entries: [...stamped, ...v.entries] }));
      showToast(`Imported ${imported.length} entries successfully!`);
    } else {
      showToast('No valid entries found in file.');
    }
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        if (isBackupFile(content)) {
          setPrompt({ type: 'import', content });
          return;
        }
        let imported = [];
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          imported = Array.isArray(data) ? data : (data.passwords || []);
        } else if (file.name.endsWith('.csv')) {
          const rows = content.split('\n').filter((r) => r.trim());
          if (rows.length < 2) return;
          const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
          imported = rows.slice(1).map((row) => {
            const values = row.split(',').map((v) => v.trim());
            const entry = {};
            headers.forEach((h, i) => {
              if (h.includes('site') || h.includes('url') || h.includes('name')) entry.site = values[i];
              if (h.includes('user')) entry.username = values[i];
              if (h.includes('pass')) entry.password = values[i];
            });
            return entry;
          });
        }
        addImported(imported);
      } catch (error) {
        showToast('Import failed. Check file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const submitImportPassword = async (password) => {
    let data;
    try {
      data = await decryptBackup(prompt.content, password);
    } catch {
      throw new Error('Wrong password, or the backup file is damaged.');
    }
    setPrompt(null);
    addImported(Array.isArray(data) ? data : (data.passwords || []));
  };

  const handleLock = async () => {
    playSound('lock');
    await lockVault();
    router.push('/lock');
  };

  const download = (text, filename, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Exporting needs the master password every time, even on an unlocked vault, so a
  // borrowed or left-open session can't quietly dump everything.
  const submitExportPassword = async (password) => {
    await verifyPassword(password);
    const date = new Date().toISOString().slice(0, 10);
    if (exportFormat === 'encrypted') {
      download(await encryptBackup({ passwords: getVault().entries }, password), `vaultify-backup-${date}.vaultify`, 'application/json');
      showToast('Encrypted backup downloaded');
    } else {
      download(JSON.stringify(getVault().entries, null, 2), `vaultify-export-${date}.json`, 'application/json');
      showToast('Plain JSON exported. Keep it safe!');
    }
    setPrompt(null);
  };

  if (!isReady) return null;

  const filteredPasswords = passwords.filter(p => 
    p.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderView = () => {
    switch (activeView) {
      case 'passwords':
        return (
          <div className="page-transition space-y-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Your Vault</h1>
                <div className="flex items-center gap-3">
                  <p className="text-foreground/50 text-sm">{passwords.length} items secured</p>
                  <SyncBadge className="lg:hidden" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="btn-secondary text-xs h-12 md:h-10 cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Import
                  <input type="file" accept=".json,.csv,.vaultify" className="hidden" onChange={importData} />
                </label>
                <button onClick={() => { setExportFormat('encrypted'); setPrompt({ type: 'export' }); }} className="btn-secondary text-xs h-12 md:h-10">
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
                  onEdit={setEditingId}
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
              <p className="text-foreground/50 text-sm">Manage your account, security, appearance and preferences.</p>
            </div>
            <SettingsView onSignedOut={() => router.push('/lock')} />
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

      <main className="relative min-h-screen pt-4 pb-32 lg:pb-12 px-4 lg:px-12 lg:ml-[var(--sidebar-w)] overflow-x-hidden">
        <div className="absolute right-3 top-3 lg:right-8 lg:top-3 z-20 flex items-center gap-2">
          <ThemeToggle />
          <GitHubLink />
        </div>
        <div className="max-w-6xl mx-auto mt-4 lg:mt-10">
          {renderView()}
        </div>
      </main>

      {editingId && passwords.some((p) => p.id === editingId) && (
        <EditEntryModal
          key={editingId}
          entry={passwords.find((p) => p.id === editingId)}
          groups={groups}
          onSave={updateEntry}
          onClose={() => setEditingId(null)}
        />
      )}

      {prompt?.type === 'export' && (
        <PasswordPrompt
          title="Export your vault"
          description="Enter your master password to continue. Vaultify asks every time, even while unlocked."
          submitLabel="Export"
          onSubmit={submitExportPassword}
          onClose={() => setPrompt(null)}
        >
          <div className="space-y-2" role="radiogroup" aria-label="Export format">
            {[
              ['encrypted', 'Encrypted backup', 'Recommended. Locked with your master password, so the file is useless to anyone without it.'],
              ['plain', 'Plain JSON', 'Every password readable by anyone who opens the file. Only for moving to another app.'],
            ].map(([value, name, note]) => (
              <label key={value} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${exportFormat === value ? 'border-[var(--accent)] bg-foreground/[0.04]' : 'border-border'}`}>
                <input type="radio" name="export-format" value={value} checked={exportFormat === value} onChange={() => setExportFormat(value)} className="mt-1 accent-[var(--accent)]" />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{name}</span>
                  <span className="block text-xs opacity-60 leading-relaxed">{note}</span>
                </span>
              </label>
            ))}
          </div>
        </PasswordPrompt>
      )}

      {prompt?.type === 'import' && (
        <PasswordPrompt
          title="Unlock this backup"
          description="This is an encrypted Vaultify backup. Enter the master password it was exported with."
          label="Backup password"
          submitLabel="Import"
          onSubmit={submitImportPassword}
          onClose={() => setPrompt(null)}
        />
      )}

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
