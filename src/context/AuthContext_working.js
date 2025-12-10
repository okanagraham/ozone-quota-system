// src/context/AuthContext.js
// MINIMAL VERSION - No bells and whistles
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase/supabaseClient';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // ONE useEffect - runs ONCE on mount
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      console.log('AUTH: Starting init');
      
      try {
        // 1. Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user) {
          console.log('AUTH: Found user:', session.user.email);
          setCurrentUser(session.user);
          
          // 2. Get user role
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (isMounted && profile) {
            console.log('AUTH: Found role:', profile.role);
            setUserRole(profile.role);
          }
        } else {
          console.log('AUTH: No session');
        }
      } catch (err) {
        console.error('AUTH: Init error:', err);
      }
      
      if (isMounted) {
        console.log('AUTH: Init complete, setting loading=false');
        setLoading(false);
      }
    };
    
    init();
    
    // 3. Listen for auth changes (login/logout only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AUTH: Event:', event);
        
        // Only handle actual sign in/out, not initial or token refresh
        if (event === 'SIGNED_IN' && session?.user) {
          setCurrentUser(session.user);
          
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profile) setUserRole(profile.role);
        }
        
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setUserRole(null);
        }
      }
    );
    
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty deps - run once

  // Login function
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  // Logout function  
  const logout = async () => {
    setCurrentUser(null);
    setUserRole(null);
    await supabase.auth.signOut();
  };

  // Signup function
  const signup = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const value = {
    currentUser,
    userRole,
    loading,
    login,
    logout,
    signup,
    isAdmin: userRole === 'admin',
    isImporter: userRole === 'importer',
  };

  // Show loading until init is done
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#1e3a8a',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#6b7280' }}>Checking authentication...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}