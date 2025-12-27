// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase/supabaseClient';

const AuthContext = createContext({
  currentUser: null,
  userProfile: null,
  userRole: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  isAdmin: false,
  isImporter: false,
  isCustoms: false,
  isTechnician: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile helper
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('AUTH: Profile fetch error:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('AUTH: Profile fetch exception:', err);
      return null;
    }
  };

  // Initialize on mount
  useEffect(() => {
    console.log('AUTH: Setting up...');
    let isMounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user) {
          console.log('AUTH: Session found for:', session.user.email);
          setCurrentUser(session.user);
          
          const profile = await fetchProfile(session.user.id);
          if (profile && isMounted) {
            console.log('AUTH: Profile loaded, role:', profile.role);
            setUserProfile(profile);
            setUserRole(profile.role);
          }
        } else {
          console.log('AUTH: No session');
        }
      } catch (error) {
        console.error('AUTH: Init error:', error);
      } finally {
        if (isMounted) {
          console.log('AUTH: Loading complete');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AUTH: Event -', event);
        
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AUTH: Signed in:', session.user.email);
          setCurrentUser(session.user);
          
          const profile = await fetchProfile(session.user.id);
          if (profile && isMounted) {
            setUserProfile(profile);
            setUserRole(profile.role);
          }
          setLoading(false);
        } 
        else if (event === 'SIGNED_OUT') {
          console.log('AUTH: Signed out');
          setCurrentUser(null);
          setUserProfile(null);
          setUserRole(null);
          setLoading(false);
        }
        else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('AUTH: Token refreshed');
          setCurrentUser(session.user);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Login
  const login = async (email, password) => {
    console.log('AUTH: Logging in:', email);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Manually set state immediately (don't wait for event)
      if (data.user) {
        setCurrentUser(data.user);
        
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          setUserProfile(profile);
          setUserRole(profile.role);
        }
        
        console.log('AUTH: Login complete, role:', profile?.role);
        setLoading(false);
        
        return { user: data.user, profile };
      }
      
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Signup
  const signup = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  // Logout
  const logout = async () => {
    console.log('AUTH: Logging out');
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

  const value = {
    currentUser,
    userProfile,
    userRole,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    isAdmin: userRole === 'admin',
    isImporter: userRole === 'importer',
    isCustoms: userRole === 'customs',
    isTechnician: userRole === 'technician',
  };

  // Debug
  console.log('AUTH render:', { loading, user: currentUser?.email, role: userRole });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}