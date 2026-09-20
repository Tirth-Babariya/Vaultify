// Accent colour: a preset (solid) or "rgb", an automatic lighting mode where the
// theme hue keeps flowing around the colour wheel (see globals.css).
import { storage } from './storage';

export const RGB_DEFAULTS = { speed: 4, spread: 70 };

// speed 1 (slow) .. 6 (fast) -> seconds per full trip around the wheel
export const rgbDuration = (speed) => `${Math.round(60 / speed)}s`;

export function applyAccent(prefs = storage.get('vault_settings') || {}) {
  const root = document.documentElement;
  root.setAttribute('data-accent', prefs.accent || 'emerald');
  if (prefs.accent === 'rgb') {
    root.style.setProperty('--rgb-duration', rgbDuration(prefs.rgbSpeed ?? RGB_DEFAULTS.speed));
    root.style.setProperty('--rgb-spread', String(prefs.rgbSpread ?? RGB_DEFAULTS.spread));
  } else {
    root.style.removeProperty('--rgb-duration');
    root.style.removeProperty('--rgb-spread');
  }
}

export function saveAccent(patch) {
  const prefs = { ...(storage.get('vault_settings') || {}), ...patch };
  storage.set('vault_settings', prefs);
  applyAccent(prefs);
}
