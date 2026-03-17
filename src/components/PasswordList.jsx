'use client';

import PasswordCard from './PasswordCard';

export default function PasswordList({ passwords, onDelete }) {
  if (passwords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl opacity-40">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <p className="text-lg font-medium">No passwords found</p>
        <p className="text-sm">Start by adding a new one.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {passwords.map((item) => (
        <PasswordCard 
          key={item.id} 
          item={item} 
          onDelete={() => onDelete(item.id)} 
        />
      ))}
    </div>
  );
}
