'use client';

import { useState } from 'react';

// Custom-styled replacement for a native <select> of groups — native dropdowns
// render with OS/browser chrome (stark white list, blue highlight) that can't
// be themed and looks broken against this app's dark UI. Keyboard behavior
// mirrors a native <select>: Enter/Space/ArrowDown opens it, Arrow keys move
// the highlighted option, Enter picks it, Escape/Tab close it.
export default function GroupDropdown({ groups, value, onChange, noneLabel = 'No Group', variant = 'input' }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const options = [{ id: null, name: noneLabel }, ...groups];
  const current = groups.find((g) => g.id === value);
  const label = current ? current.name : noneLabel;

  const select = (id) => {
    onChange(id);
    setOpen(false);
    setActiveIndex(-1);
  };

  const openMenu = () => {
    const idx = options.findIndex((o) => o.id === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeIndex >= 0) select(options[activeIndex].id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === 'Tab') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const triggerClass = variant === 'pill'
    ? 'flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-foreground/5 border border-border/40 rounded-md px-2 py-1 hover:bg-foreground/10 transition-colors max-w-full'
    : 'input h-10 text-sm glass flex items-center justify-between w-full';

  return (
    <div className={`relative ${variant === 'pill' ? 'inline-block' : ''}`}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={triggerClass}
      >
        <span className="truncate">{label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0 opacity-60">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setActiveIndex(-1); }} />
          <ul role="listbox" className="absolute z-20 top-full mt-1 left-0 w-full min-w-[140px] overflow-hidden rounded-lg border border-border bg-[var(--background)] shadow-lg">
            {options.map((option, i) => (
              <li key={option.id ?? 'none'}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === option.id}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => select(option.id)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors truncate ${
                    i === activeIndex ? 'bg-[var(--accent)] text-white' : 'hover:bg-foreground/5'
                  }`}
                >
                  {option.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
