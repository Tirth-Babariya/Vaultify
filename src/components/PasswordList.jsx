'use client';

import PasswordCard from './PasswordCard';

export default function PasswordList({ passwords, onDelete }) {
  return (
    <div className="space-y-4" role="region" aria-label="Password List">
      {passwords.length === 0 ? (
        <div className="card glass p-12 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold mb-1">No passwords found</h3>
          <p className="text-foreground/40 text-sm">Your vault is ready for entries.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-live="polite">
          {passwords.map((item) => (
            <PasswordCard 
              key={item.id} 
              item={item} 
              isReused={passwords.some(p => p.id !== item.id && p.password === item.password)}
              onDelete={() => onDelete(item.id)} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
