// src/context/AuthContext.js
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
  const [initError, setInitError] = useState(null);
  
  // Use ref to prevent multiple simultaneous profile fetches
  const fetchingProfile = useRef(false);

  // Fetch user profile from Supabase
  async function fetchUserProfile(userId) {
    // Prevent duplicate fetches
    if (fetchingProfile.current) {
      console.log('Profile fetch already in progress, skipping...');
      return userProfile; // Return existing profile
    }
    
    try {
      fetchingProfile.current = true;
      console.log('Fetching user profile for:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      console.log('User profile fetched:', data);
      console.log('Setting userRole to:', data?.role);
      setUserProfile(data);
      setUserRole(data?.role || null);
      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setUserProfile(null);
      setUserRole(null);
      return null;
    } finally {
      fetchingProfile.current = false;
    }
  }

  // Sign up new user
  async function signup(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // Sign in existing user
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // Sign out
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear state
    setCurrentUser(null);
    setUserProfile(null);
    setUserRole(null);
    
    // Reset flags
    fetchingProfile.current = false;
  }

  // Reset password
  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  // Initialize auth - called once on mount
  useEffect(() => {
    let mounted = true;
    let authSubscription = null;
    
    const initializeAuth = async () => {
      try {
        console.log('🔵 AuthContext: Starting initialization...');
        
        // Check if Supabase is properly configured
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }
        
        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 8000)
        );
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
        if (error) {
          console.error('❌ Session error:', error);
          throw error;
        }
        
        if (!mounted) return;
        
        if (session?.user) {
          console.log('✅ Found existing session for:', session.user.email);
          setCurrentUser(session.user);
          
          // Fetch profile without blocking
          await fetchUserProfile(session.user.id);
        } else {
          console.log('ℹ️ No existing session');
          setCurrentUser(null);
          setUserProfile(null);
          setUserRole(null);
        }
        
        // Set up auth state listener AFTER initial load
        console.log('🔵 Setting up auth state listener...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            console.log('🔄 Auth event received:', event, 'Session exists:', !!session);
            
            // Ignore INITIAL_SESSION event to prevent duplicate processing
            if (event === 'INITIAL_SESSION') {
              console.log('🔵 Ignoring INITIAL_SESSION event (already processed)');
              return;
            }
            
            // Handle sign out
            if (event === 'SIGNED_OUT') {
              console.log('🚪 User signed out');
              setCurrentUser(null);
              setUserProfile(null);
              setUserRole(null);
              return;
            }
            
            // Handle sign in and updates
            if (session?.user) {
              console.log('👤 Setting current user:', session.user.email);
              setCurrentUser(session.user);
              
              // Only fetch profile on meaningful events
              if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                console.log('📥 Fetching profile due to event:', event);
                await fetchUserProfile(session.user.id);
              }
            } else {
              console.log('❌ No session in auth state change');
              setCurrentUser(null);
              setUserProfile(null);
              setUserRole(null);
            }
          }
        );
        
        authSubscription = subscription;
        console.log('✅ Auth initialization complete');
        
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        setInitError(error.message);
      } finally {
        if (mounted) {
          console.log('🔵 Setting loading to false');
          setLoading(false);
        }
      }
    };
    
    // Start initialization
    initializeAuth();
    
    // Cleanup
    return () => {
      console.log('🔵 AuthContext: Cleaning up...');
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []); // Empty deps - only run once

  const value = {
    currentUser,
    userProfile,
    userRole,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    fetchUserProfile,
    // Helper flags
    isAdmin: userRole === 'admin',
    isImporter: userRole === 'importer',
    isCustoms: userRole === 'customs',
    isTechnician: userRole === 'technician',
  };

  // Show loading spinner while initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  // Show error if initialization failed
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-red-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold text-red-900 mb-2">Authentication Error</h2>
            <p className="text-red-700 mb-4 text-sm">{initError}</p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  setInitError(null);
                  setLoading(false);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Continue Anyway
              </button>
            </div>
          </div>
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