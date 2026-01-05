// src/services/supabase/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Missing REACT_APP_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  console.error('Missing REACT_APP_SUPABASE_ANON_KEY environment variable');
}

// Clear any existing Supabase cookies on load (they cause hangs)
if (typeof document !== 'undefined') {
  document.cookie.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim();
    if (name.includes('sb-') || name.includes('supabase')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      console.log('Cleared problematic cookie:', name);
    }
  });
}

// Simple localStorage-only storage (no cookies)
const localStorageOnly = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

// Create Supabase client - localStorage only, no cookies
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: localStorageOnly,
      storageKey: 'nou-supabase-auth',
      flowType: 'implicit', // Use implicit flow, not PKCE
      detectSessionInUrl: false, // Don't try to detect session in URL
    },
    global: {
      headers: {
        'X-Client-Info': 'nou-quota-system',
      },
    },
  }
);

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

export default supabase;