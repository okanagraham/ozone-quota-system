// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext(null);

// Create a fresh client for auth operations
const createFreshClient = () => {
  return createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'nou-auth',
        flowType: 'implicit',
        detectSessionInUrl: false,
      },
    }
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create client instance for this provider
  const [supabase] = useState(() => createFreshClient());

  // Fetch user profile
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) return null;
    
    try {
      console.log('Fetching profile for:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error.message);
        return null;
      }
      console.log('Profile fetched:', data?.email);
      return data;
    } catch (err) {
      console.error('Profile fetch exception:', err);
      return null;
    }
  }, [supabase]);

  // Initialize - check for existing session
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      console.log('AuthContext: Initializing...');
      
      try {
        // Use a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 3000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data, error } = await Promise.race([sessionPromise, timeoutPromise])
          .catch(err => {
            console.warn('Session check failed:', err.message);
            return { data: { session: null }, error: err };
          });

        if (!mounted) return;

        if (error) {
          console.warn('Session error:', error.message);
        }

        if (data?.session?.user) {
          console.log('Found existing session for:', data.session.user.email);
          setCurrentUser(data.session.user);
          
          const profile = await fetchUserProfile(data.session.user.id);
          if (mounted && profile) {
            setUserProfile(profile);
            setUserRole(profile.role || null);
          }
        } else {
          console.log('No existing session found');
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth event:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          setCurrentUser(session.user);
          const profile = await fetchUserProfile(session.user.id);
          if (mounted && profile) {
            setUserProfile(profile);
            setUserRole(profile.role || null);
          }
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setUserProfile(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserProfile]);

  // Login
  const login = async (email, password) => {
    console.log('Login attempt for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Signup
  const signup = async (email, password, role = 'importer', profileData = {}) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: email,
          role: role,
          ...profileData,
          created_at: new Date().toISOString(),
        }]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }
    return authData;
  };

  // Logout
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setCurrentUser(null);
    setUserProfile(null);
    setUserRole(null);
  };

  // Reset password
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  // Update password
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (!currentUser) return null;
    const profile = await fetchUserProfile(currentUser.id);
    if (profile) {
      setUserProfile(profile);
      setUserRole(profile.role || null);
    }
    return profile;
  };

  const value = {
    currentUser,
    userProfile,
    userRole,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    refreshProfile,
    supabase, // Expose the client if needed
    isAdmin: userRole === 'admin',
    isImporter: userRole === 'importer',
    isCustoms: userRole === 'customs',
    isTechnician: userRole === 'technician',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}