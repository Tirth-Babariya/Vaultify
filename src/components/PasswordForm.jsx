'use client';

import { useState } from 'react';

export default function PasswordForm({ onAdd, inputRef }) {
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const getStrength = (pass) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getStrength(password);

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
          ref={inputRef}
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
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Password</label>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${
            strength <= 2 ? 'text-red-500' : strength <= 4 ? 'text-yellow-500' : 'text-green-500'
          }`}>
            {password ? (strength <= 2 ? 'Weak' : strength <= 4 ? 'Medium' : 'Strong') : ''}
          </span>
        </div>
        <input 
          type="password" 
          className="input h-10 text-sm" 
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {password && (
          <div className="h-1 w-full bg-foreground/5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                strength <= 2 ? 'bg-red-500' : strength <= 4 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${(strength / 5) * 100}%` }}
            />
          </div>
        )}
      </div>
      <button type="submit" className="btn-primary w-full text-sm py-2">
        Save Password
      </button>
    </form>
  );
}
