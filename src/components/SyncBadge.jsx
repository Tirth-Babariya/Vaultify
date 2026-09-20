'use client';

import { useEffect, useState } from 'react';
import { subscribeSyncStatus } from '@/lib/cloud';

const STATES = {
  local: { dot: 'bg-foreground/30', label: 'Local only' },
  synced: { dot: 'bg-emerald-500', label: 'Synced' },
  syncing: { dot: 'bg-amber-400 animate-pulse', label: 'Syncing…' },
  offline: { dot: 'bg-amber-400', label: 'Offline · saved locally' },
  auth: { dot: 'bg-red-500', label: 'Sign in to sync' },
  error: { dot: 'bg-red-500', label: 'Sync error' },
};

export default function SyncBadge({ className = '' }) {
  const [status, setStatus] = useState({ state: 'local' });
  useEffect(() => subscribeSyncStatus(setStatus), []);
  const s = STATES[status.state] || STATES.local;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium opacity-70 ${className}`}
      title={status.message || undefined}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
