// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase/supabaseClient';

const AuthContext = createContext(null);

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
  const [initialized, setInitialized] = useState(false);
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);

  // Fetch user profile from Supabase users table
// In AuthContext.js - update the fetchUserProfile function:

const fetchUserProfile = useCallback(async (userId) => {
  console.log('=== FETCH PROFILE DEBUG ===');
  console.log('fetchUserProfile called with userId:', userId);
  
  // ADD THIS: Check Supabase client configuration
  console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
  console.log('Supabase Key exists:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);
  console.log('Supabase Key prefix:', process.env.REACT_APP_SUPABASE_ANON_KEY?.substring(0, 20));
  
  if (!userId) {
    console.log('No userId provided, returning null');
    return null;
  }
  
  try {
    console.log('Querying Supabase users table...');
    const startTime = Date.now();
    
    const { data, error, status, statusText } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('Query completed in', Date.now() - startTime, 'ms');
    console.log('Response status:', status, statusText);
    console.log('Query result - data:', data);
    console.log('Query result - error:', error);

    if (error) {
      console.error('Error fetching user profile:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Exception in fetchUserProfile:', err);
    return null;
  }
}, []);

  // Initialize auth state on mount
  useEffect(() => {
    mountedRef.current = true;
    
    // Prevent double initialization
    if (initializingRef.current || initialized) return;
    initializingRef.current = true;

    let timeoutId;

    const initializeAuth = async () => {
      try {
        // Safety timeout - ensure loading stops after 5 seconds max
        timeoutId = setTimeout(() => {
          if (mountedRef.current) {
            console.warn('Auth initialization timed out - forcing completion');
            setLoading(false);
            setInitialized(true);
          }
        }, 5000);

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error.message);
          if (mountedRef.current) {
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          if (mountedRef.current) {
            setCurrentUser(session.user);
          }

          // Fetch user profile
          const profile = await fetchUserProfile(session.user.id);
          
          if (mountedRef.current) {
            if (profile) {
              setUserProfile(profile);
              setUserRole(profile.role || null);
            }
          }
        } else {
          // No session - not logged in
          if (mountedRef.current) {
            setCurrentUser(null);
            setUserProfile(null);
            setUserRole(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        clearTimeout(timeoutId);
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        console.log('Auth event:', event);

        switch (event) {
          // In the onAuthStateChange callback, update SIGNED_IN case:

          case 'SIGNED_IN':
          console.log('=== SIGNED_IN EVENT ===');
          console.log('Session user:', session?.user?.id);
  
          if (session?.user) {
            setCurrentUser(session.user);
            console.log('Calling fetchUserProfile...');
            
            const profile = await fetchUserProfile(session.user.id);
            
            console.log('fetchUserProfile returned:', profile);
            
            if (mountedRef.current && profile) {
              console.log('Setting profile and role...');
              setUserProfile(profile);
              setUserRole(profile.role || null);
              console.log('Profile set complete');
            } else {
              console.log('Component unmounted or no profile found');
            }
          }
          break;

          case 'SIGNED_OUT':
            setCurrentUser(null);
            setUserProfile(null);
            setUserRole(null);
            break;

          case 'TOKEN_REFRESHED':
            if (session?.user) {
              setCurrentUser(session.user);
            }
            break;

          case 'USER_UPDATED':
            if (session?.user) {
              setCurrentUser(session.user);
              const profile = await fetchUserProfile(session.user.id);
              if (mountedRef.current && profile) {
                setUserProfile(profile);
                setUserRole(profile.role || null);
              }
            }
            break;

          default:
            break;
        }

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    );

    // Cleanup
    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Profile will be fetched by onAuthStateChange
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Signup function
  const signup = async (email, password, role = 'importer', profileData = {}) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) throw authError;

      // Create user profile in users table
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email: email,
            role: role,
            display_name: profileData.display_name || '',
            enterprise_name: profileData.enterprise_name || '',
            business_address: profileData.business_address || '',
            business_location: profileData.business_location || '',
            telephone: profileData.telephone || '',
            import_quota: profileData.import_quota || 0,
            balance_imports: profileData.balance_imports || 0,
            cumulative_imports: profileData.cumulative_imports || 0,
            created_at: new Date().toISOString()
          }]);

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't throw - auth succeeded, just profile creation failed
        }
      }

      return authData;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear state immediately
      setCurrentUser(null);
      setUserProfile(null);
      setUserRole(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  // Update password function
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  };

  // Refresh user profile
  const refreshProfile = async () => {
    if (!currentUser) return null;
    
    const profile = await fetchUserProfile(currentUser.id);
    if (profile) {
      setUserProfile(profile);
      setUserRole(profile.role || null);
    }
    return profile;
  };

  // Fetch user role (for backwards compatibility)
  const fetchUserRole = async (uid) => {
    const profile = await fetchUserProfile(uid);
    return profile?.role || null;
  };

  const value = {
    // State
    currentUser,
    userProfile,
    userRole,
    loading,
    
    // Auth methods
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    refreshProfile,
    fetchUserRole,
    
    // Role checks
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