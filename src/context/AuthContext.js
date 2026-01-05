// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  supabase, 
  saveTokens, 
  getAccessToken, 
  getRefreshToken,
  clearTokens,
  getAuthenticatedClient 
} from '../services/supabase/supabaseClient';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        // Try to get user with stored token
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
          // Token expired, try refresh
          if (refreshToken) {
            const { data, error: refreshError } = await supabase.auth.refreshSession({
              refresh_token: refreshToken,
            });

            if (!refreshError && data.session) {
              saveTokens(data.session.access_token, data.session.refresh_token);
              setCurrentUser(data.user);
              await fetchProfile(data.user.id);
              setLoading(false);
              return;
            }
          }
          // Refresh failed, clear tokens
          clearTokens();
          setLoading(false);
          return;
        }

        setCurrentUser(user);
        await fetchProfile(user.id);
      } catch (err) {
        console.error('Auth init error:', err);
        clearTokens();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const fetchProfile = async (userId) => {
    const client = getAuthenticatedClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setUserProfile(data);
      setUserRole(data.role);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Save tokens manually
    saveTokens(data.session.access_token, data.session.refresh_token);
    setCurrentUser(data.user);
    await fetchProfile(data.user.id);

    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearTokens();
    setCurrentUser(null);
    setUserProfile(null);
    setUserRole(null);
  };

  const signup = async (email, password, role = 'importer', profileData = {}) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      // Create profile
      const client = getAuthenticatedClient();
      await client.from('users').insert([{
        id: data.user.id,
        email,
        role,
        ...profileData,
        created_at: new Date().toISOString(),
      }]);

      if (data.session) {
        saveTokens(data.session.access_token, data.session.refresh_token);
        setCurrentUser(data.user);
        await fetchProfile(data.user.id);
      }
    }

    return data;
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const accessToken = getAccessToken();
    const { error } = await supabase.auth.updateUser(
      { password: newPassword },
      { accessToken }
    );
    if (error) throw error;
  };

  const value = {
    currentUser,
    userProfile,
    userRole,
    loading,
    login,
    logout,
    signup,
    resetPassword,
    updatePassword,
    getAuthenticatedClient,
    isAdmin: userRole === 'admin',
    isImporter: userRole === 'importer',
    isCustoms: userRole === 'customs',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}