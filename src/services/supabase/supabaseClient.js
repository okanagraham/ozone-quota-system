// src/services/supabase/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables are missing!');
  console.error('REACT_APP_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
}

// Create Supabase client with retry configuration
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
    global: {
      headers: {
        'x-application-name': 'NOU-Quota-Management',
      },
      fetch: (url, options = {}) => {
        // Add timeout to all requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
    db: {
      schema: 'public',
    },
  }
);

// Verify connection on startup
let connectionVerified = false;

const verifyConnection = async () => {
  if (connectionVerified) return true;
  
  try {
    console.log('🔵 Verifying Supabase connection...');
    const { error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connected successfully');
    connectionVerified = true;
    return true;
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
    return false;
  }
};

// Verify on module load (non-blocking)
verifyConnection();

export default supabase;