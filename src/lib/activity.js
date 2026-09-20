// Login / security activity: shown to the user so they can tell when and where
// their vault was accessed. Cloud vaults log to Supabase (visible from every
// device); local vaults keep a short history on this device.
import { storage } from './storage';
import { supabase } from './supabase';

const LOCAL_KEY = 'local_activity';

export function deviceInfo() {
  let id = storage.get('device_id');
  if (!id) {
    id = crypto.randomUUID();
    storage.set('device_id', id);
  }
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  return { id, label: `${browser} on ${os}` };
}

export async function recordActivity(event) {
  if (typeof window === 'undefined') return;
  const info = deviceInfo();
  const meta = storage.get('vault_meta');

  if (meta?.mode === 'cloud' && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('login_events').insert({
          user_id: session.user.id,
          event,
          device_id: info.id,
          device_label: info.label,
          user_agent: navigator.userAgent.slice(0, 300),
        });
      }
    } catch {
      // Activity logging must never break the action that triggered it.
    }
    return;
  }

  const list = storage.get(LOCAL_KEY) || [];
  list.unshift({ id: Date.now(), event, at: Date.now(), deviceId: info.id, deviceLabel: info.label });
  storage.set(LOCAL_KEY, list.slice(0, 30));
}

export async function listActivity(limit = 25) {
  const meta = storage.get('vault_meta');
  if (meta?.mode === 'cloud' && supabase) {
    const { data, error } = await supabase
      .from('login_events')
      .select('id, event, device_id, device_label, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.map((row) => ({
      id: row.id,
      event: row.event,
      at: new Date(row.created_at).getTime(),
      deviceId: row.device_id,
      deviceLabel: row.device_label,
    }));
  }
  return (storage.get(LOCAL_KEY) || []).slice(0, limit);
}
