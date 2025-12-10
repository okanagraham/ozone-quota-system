// src/context/AuthContext.js
// Fixed AuthContext for Supabase - handles migrated users properly

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase/supabaseClient';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  // Fetch user profile from users table
  const fetchUserProfile = async (userId) => {
    try {
      console.log('AUTH: Fetching profile for:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('AUTH: Error fetching profile:', error.message);
        // User might not have a profile yet - this is OK for new users
        return null;
      }

      console.log('AUTH: Profile found:', data?.email, 'Role:', data?.role);
      return data;
    } catch (error) {
      console.error('AUTH: Profile fetch exception:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initRef.current) return;
    initRef.current = true;

    console.log('AUTH: Initializing...');

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AUTH: Session error:', error.message);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('AUTH: Found session for:', session.user.email);
          setCurrentUser(session.user);
          
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            setUserProfile(profile);
            setUserRole(profile.role);
          } else {
            console.warn('AUTH: No profile found for user');
            setUserRole(null);
          }
        } else {
          console.log('AUTH: No session');
        }
      } catch (err) {
        console.error('AUTH: Init error:', err);
      } finally {
        setLoading(false);
        console.log('AUTH: Init complete, loading=false');
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AUTH: Event:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AUTH: Signed in:', session.user.email);
          setCurrentUser(session.user);
          
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
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
        else if (event === 'TOKEN_REFRESHED') {
          console.log('AUTH: Token refreshed');
          // Don't change state on token refresh
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email, password) => {
    console.log('AUTH: Attempting login for:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('AUTH: Login error:', error.message);
      throw error;
    }

    // Fetch profile after login
    if (data.user) {
      const profile = await fetchUserProfile(data.user.id);
      if (profile) {
        setUserProfile(profile);
        setUserRole(profile.role);
      }
    }

    return data;
  };

  // Signup function
  const signup = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return data;
  };

  // Logout function
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
    console.log('AUTH: Sending password reset to:', email);
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error('AUTH: Password reset error:', error);
      throw error;
    }
    
    console.log('AUTH: Password reset email sent');
    return data;
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
    // Role helpers
    isAdmin: userRole === 'admin',
    isImporter: userRole === 'importer',
    isCustoms: userRole === 'customs',
    isTechnician: userRole === 'technician',
  };

  // Don't render children until loading is complete
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}