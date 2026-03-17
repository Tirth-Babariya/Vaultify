'use client';

import { useState } from 'react';

export default function PasswordForm({ onAdd }) {
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!site || !password) return;

    onAdd({
      id: Date.now(),
      site,
      username,
      password
    });

    setSite('');
    setUsername('');
    setPassword('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Website / App</label>
        <input 
          type="text" 
          className="input h-10 text-sm" 
          placeholder="GitHub, Netflix..."
          value={site}
          onChange={(e) => setSite(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Username / Email</label>
        <input 
          type="text" 
          className="input h-10 text-sm" 
          placeholder="john@example.com"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Password</label>
        <input 
          type="password" 
          className="input h-10 text-sm" 
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-primary w-full text-sm py-2">
        Save Password
      </button>
    </form>
  );
}
