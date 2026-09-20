'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { watchSystemTheme } from '@/lib/theme';

// Password-reset emails sign the user into a temporary "recovery" session.
// Wherever that link lands, send them to the recovery screen.
export default function AuthEvents() {
  const router = useRouter();
  useEffect(() => watchSystemTheme(), []);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') router.push('/recover');
    });
    return () => data.subscription.unsubscribe();
  }, [router]);
  return null;
}
