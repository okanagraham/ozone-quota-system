// src/services/supabase/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create client with NO session management
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// Manual token storage using cookies (more reliable than localStorage)
const TOKEN_KEY = 'nou_access_token';
const REFRESH_KEY = 'nou_refresh_token';

export const saveTokens = (accessToken, refreshToken) => {
  document.cookie = `${TOKEN_KEY}=${accessToken}; path=/; max-age=3600; SameSite=Lax`;
  document.cookie = `${REFRESH_KEY}=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
};

export const getAccessToken = () => {
  const match = document.cookie.match(new RegExp('(^| )' + TOKEN_KEY + '=([^;]+)'));
  return match ? match[2] : null;
};

export const getRefreshToken = () => {
  const match = document.cookie.match(new RegExp('(^| )' + REFRESH_KEY + '=([^;]+)'));
  return match ? match[2] : null;
};

export const clearTokens = () => {
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${REFRESH_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

// Create authenticated client with stored token
export const getAuthenticatedClient = () => {
  const accessToken = getAccessToken();
  
  if (!accessToken) {
    return supabase; // Return unauthenticated client
  }

  // Create new client with the access token
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

export default supabase;