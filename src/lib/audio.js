import { storage } from './storage';

const getAudioCtx = () => {
  if (typeof window === 'undefined') return null;
  return new (window.AudioContext || window.webkitAudioContext)();
};

export const playSound = (type) => {
  if (typeof window === 'undefined') return;
  
  // Check preferences
  const prefs = storage.get('vault_settings') || {};
  if (prefs.sounds === false) return;
  
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'unlock') {
      // Satisfying mechanical 'click-up'
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'lock') {
      // Solid mechanical 'clunk-down'
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'error') {
      // Low-frequency mechanical 'buzz'
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
  } catch (e) {
    // Silent fail if audio context is blocked
    console.warn('Audio feedback blocked by browser policies');
  }
};
