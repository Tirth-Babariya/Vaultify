'use client';

import { useState } from 'react';

export default function Groups({ groups, passwords, onAdd, onDelete, onSetPasscode }) {
  const [name, setName] = useState('');
  const [protect, setProtect] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editPasscode, setEditPasscode] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const countFor = (groupId) => passwords.filter((p) => p.groupId === groupId).length;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), protect ? passcode : null);
    setName('');
    setProtect(false);
    setPasscode('');
  };

  const startEditPasscode = (group) => {
    setEditingId(group.id);
    setEditPasscode('');
  };

  const saveEditPasscode = (id) => {
    onSetPasscode(id, editPasscode || null);
    setEditingId(null);
    setEditPasscode('');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-3 p-4 bg-foreground/[0.02] rounded-2xl border border-border/40">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">New Group</label>
        <input
          type="text"
          className="input h-10 text-sm"
          placeholder="e.g. Work, Family, Finance"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm">Protect with a passcode</span>
          <button
            type="button"
            onClick={() => setProtect((v) => !v)}
            aria-label="Toggle passcode protection"
            aria-pressed={protect}
            className={`w-10 h-6 rounded-full transition-colors relative ${protect ? 'bg-[var(--accent)]' : 'bg-foreground/10'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${protect ? 'left-5' : 'left-1'}`} />
          </button>
        </div>
        {protect && (
          <input
            type="password"
            className="input h-10 text-sm"
            placeholder="Group passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
        )}
        <button type="submit" className="btn-primary w-full text-sm py-2" disabled={!name.trim()}>
          Create Group
        </button>
      </form>

      {groups.length === 0 ? (
        <p className="text-center text-sm text-foreground/40 py-6">No groups yet. Create one above to start organizing your vault.</p>
      ) : (
        <ul className="space-y-2">
          {groups.map((group) => (
            <li key={group.id} className="p-4 bg-foreground/[0.02] rounded-2xl border border-border/40 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {group.passcodeHash && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 opacity-40 flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                  <span className="font-bold truncate">{group.name}</span>
                  <span className="text-xs opacity-40 flex-shrink-0">{countFor(group.id)} {countFor(group.id) === 1 ? 'entry' : 'entries'}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditPasscode(group)}
                    className="text-[10px] font-bold uppercase tracking-wider opacity-50 hover:opacity-80 px-2 py-1"
                  >
                    {group.passcodeHash ? 'Change Passcode' : 'Add Passcode'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(group.id)}
                    className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-md transition-colors"
                    aria-label="Delete group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {editingId === group.id && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="password"
                    autoFocus
                    className="input h-9 text-sm flex-1"
                    placeholder={group.passcodeHash ? 'New passcode (blank to remove)' : 'Set a passcode'}
                    value={editPasscode}
                    onChange={(e) => setEditPasscode(e.target.value)}
                  />
                  <button type="button" onClick={() => saveEditPasscode(group.id)} className="btn-secondary text-xs px-3">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3">
                    Cancel
                  </button>
                </div>
              )}

              {confirmDeleteId === group.id && (
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40">
                  <p className="text-xs text-red-500 leading-relaxed">
                    Delete this group? Its entries stay in your vault, moved to Ungrouped.
                  </p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="btn-secondary text-xs px-3 py-1.5">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => { onDelete(group.id); setConfirmDeleteId(null); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
