// Light / dark / system theming. The <html> `dark` class is set before first
// paint by an inline script in layout.js; these helpers keep it in sync after that.
import { storage } from './storage';

export const THEME_MODES = ['light', 'dark', 'system'];

export const getThemePref = () => (storage.get('vault_settings') || {}).theme || 'dark';

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function applyTheme(mode) {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function setThemePref(mode) {
  storage.set('vault_settings', { ...(storage.get('vault_settings') || {}), theme: mode });
  applyTheme(mode);
  window.dispatchEvent(new Event('vaultify-theme'));
}

export function subscribeTheme(cb) {
  window.addEventListener('vaultify-theme', cb);
  return () => window.removeEventListener('vaultify-theme', cb);
}

// Follows the OS setting live while the preference is "system".
export function watchSystemTheme() {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (getThemePref() === 'system') applyTheme('system');
  };
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
