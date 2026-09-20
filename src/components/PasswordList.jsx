'use client';

import { useState } from 'react';
import PasswordCard from './PasswordCard';

function LockedGroup({ group, count, onUnlock }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await onUnlock(group.id, passcode);
    if (!ok) {
      setError(true);
      setPasscode('');
    }
  };

  return (
    <div className="card glass p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 opacity-40 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <div className="min-w-0">
          <div className="font-bold truncate">{group.name}</div>
          <div className="text-xs opacity-40">{count} {count === 1 ? 'entry' : 'entries'} locked</div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
        <input
          type="password"
          autoFocus={false}
          className={`input h-9 text-sm w-36 ${error ? 'border-red-500' : ''}`}
          placeholder="Passcode"
          value={passcode}
          onChange={(e) => { setPasscode(e.target.value); setError(false); }}
        />
        <button type="submit" className="btn-secondary text-xs px-3">Unlock</button>
      </form>
      {error && <p className="text-xs text-red-500 sm:hidden">Incorrect passcode.</p>}
    </div>
  );
}

export default function PasswordList({ passwords, onDelete, onEdit, groups = [], unlockedGroupIds = new Set(), onUnlockGroup, onChangeGroup }) {
  if (passwords.length === 0) {
    return (
      <div className="space-y-4" role="region" aria-label="Password List">
        <div className="card glass p-12 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold mb-1">No passwords found</h3>
          <p className="text-foreground/40 text-sm">Your vault is ready for entries.</p>
        </div>
      </div>
    );
  }

  const renderGrid = (items) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-live="polite">
      {items.map((item) => (
        <PasswordCard
          key={item.id}
          item={item}
          isReused={passwords.some(p => p.id !== item.id && p.password === item.password)}
          onDelete={() => onDelete(item.id)}
          onEdit={() => onEdit(item.id)}
          groups={groups}
          onChangeGroup={onChangeGroup}
        />
      ))}
    </div>
  );

  // No groups exist yet — keep the plain flat view untouched.
  if (groups.length === 0) {
    return (
      <div className="space-y-4" role="region" aria-label="Password List">
        {renderGrid(passwords)}
      </div>
    );
  }

  const groupedIds = new Set(groups.map((g) => g.id));
  const ungrouped = passwords.filter((p) => !p.groupId || !groupedIds.has(p.groupId));

  return (
    <div className="space-y-6" role="region" aria-label="Password List">
      {groups.map((group) => {
        const items = passwords.filter((p) => p.groupId === group.id);
        if (items.length === 0) return null;

        const isLocked = group.passcodeHash && !unlockedGroupIds.has(group.id);

        return (
          <div key={group.id} className="space-y-3">
            {!isLocked && (
              <div className="flex items-center gap-2 px-1">
                {group.passcodeHash && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 opacity-40">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 10.5V6.75a3.75 3.75 0 117.5 0v3.75m-8.25 0h9a1.5 1.5 0 011.5 1.5v6.75a1.5 1.5 0 01-1.5 1.5h-9a1.5 1.5 0 01-1.5-1.5v-6.75a1.5 1.5 0 011.5-1.5z" />
                  </svg>
                )}
                <h3 className="text-sm font-bold">{group.name}</h3>
                <span className="text-xs opacity-40">{items.length}</span>
              </div>
            )}
            {isLocked ? (
              <LockedGroup group={group} count={items.length} onUnlock={onUnlockGroup} />
            ) : (
              renderGrid(items)
            )}
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <div className="space-y-3">
          {groups.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <h3 className="text-sm font-bold opacity-60">Ungrouped</h3>
              <span className="text-xs opacity-40">{ungrouped.length}</span>
            </div>
          )}
          {renderGrid(ungrouped)}
        </div>
      )}
    </div>
  );
}
