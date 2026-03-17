'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import PasswordForm from '@/components/PasswordForm';
import PasswordList from '@/components/PasswordList';
import Generator from '@/components/Generator';

export default function Dashboard() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [passwords, setPasswords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const masterHash = storage.get('master_hash');
    const isLocked = storage.get('is_locked');

    if (!masterHash) {
      router.push('/lock');
    } else if (isLocked !== false) {
      router.push('/lock');
    } else {
      setIsReady(true);
      setPasswords(storage.get('passwords') || []);
    }
  }, [router]);

  const addPassword = (newEntry) => {
    const updated = [newEntry, ...passwords];
    setPasswords(updated);
    storage.set('passwords', updated);
    showToast('Password saved successfully!');
  };

  const deletePassword = (id) => {
    const updated = passwords.filter(p => p.id !== id);
    setPasswords(updated);
    storage.set('passwords', updated);
    showToast('Password deleted.');
  };

  const handleLock = () => {
    storage.set('is_locked', true);
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
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Your Vault</h1>
          <p className="text-foreground/60">Manage your passwords securely in one place.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={exportData} className="btn-secondary text-xs py-2 px-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
          </button>
          <button onClick={handleLock} className="btn-secondary text-xs py-2 px-4 flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Lock Vault
          </button>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-foreground text-background px-6 py-3 rounded-full shadow-2xl text-sm font-medium flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {toast}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="space-y-8">
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wider opacity-50 mb-4">Add New</h2>
            <PasswordForm onAdd={addPassword} />
          </div>
          
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wider opacity-50 mb-4">Quick Generator</h2>
            <Generator />
          </div>
        </aside>

        <section className="lg:col-span-2 space-y-6">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search passwords..." 
              className="input pl-10"
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
        </section>
      </div>
    </div>
  );
}
