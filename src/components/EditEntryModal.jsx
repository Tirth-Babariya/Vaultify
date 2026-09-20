'use client';

import { useEffect, useState } from 'react';
import PasswordField from './PasswordField';
import GroupDropdown from './GroupDropdown';

export default function EditEntryModal({ entry, groups = [], onSave, onClose }) {
  const [site, setSite] = useState(entry.site);
  const [username, setUsername] = useState(entry.username || '');
  const [password, setPassword] = useState(entry.password);
  const [groupId, setGroupId] = useState(entry.groupId ?? null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    if (!site.trim() || !password) return;
    onSave(entry.id, { site: site.trim(), username: username.trim(), password, groupId });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Edit entry">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <h2 className="text-lg font-bold tracking-tight">Edit entry</h2>

        <div className="space-y-1.5">
          <label htmlFor="edit-site" className="text-xs font-medium opacity-70">Website / App</label>
          <input id="edit-site" type="text" className="input" value={site} onChange={(e) => setSite(e.target.value)} autoComplete="off" autoFocus required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-username" className="text-xs font-medium opacity-70">Username / Email</label>
          <input id="edit-username" type="text" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
        </div>

        <PasswordField id="edit-password" label="Password" value={password} onChange={setPassword} autoComplete="off" showStrength />

        {groups.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium opacity-70">Group</label>
            <GroupDropdown groups={groups} value={groupId} onChange={setGroupId} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={!site.trim() || !password} className="btn-primary text-sm disabled:opacity-40 disabled:pointer-events-none">Save changes</button>
        </div>
      </form>
    </div>
  );
}
