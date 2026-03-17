'use client';

import { useState } from 'react';

export default function Generator() {
  const [length, setLength] = useState(16);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let retVal = "";
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    
    for (let i = 0; i < length; ++i) {
      retVal += charset.charAt(array[i] % charset.length);
    }
    setPassword(retVal);
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Length: {length}</label>
        </div>
        <input 
          type="range" 
          min="8" 
          max="32" 
          value={length} 
          onChange={(e) => setLength(e.target.value)}
          className="w-full h-4 appearance-none bg-transparent cursor-pointer"
        />
      </div>

      <div className="flex space-x-2">
        <div className="flex-1 bg-foreground/5 rounded-md px-3 py-2 font-mono text-sm overflow-hidden text-ellipsis h-10 flex items-center">
          {password || <span className="opacity-30">Click generate...</span>}
        </div>
        <button 
          onClick={copyToClipboard}
          disabled={!password}
          className={`p-2 rounded-md transition-all ${copied ? 'bg-green-500 text-white' : 'hover:bg-foreground/10 disabled:opacity-30'}`}
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
          )}
        </button>
      </div>

      <button 
        onClick={generatePassword}
        className="btn-secondary w-full text-xs py-2"
      >
        Generate Random
      </button>
    </div>
  );
}
