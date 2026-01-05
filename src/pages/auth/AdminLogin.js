// src/pages/auth/AdminLogin.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase/supabaseClient';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(''); // Debug state
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== ADMIN LOGIN DEBUG START ===');
    console.log('Email:', email);
    setDebugInfo('Starting login...');
    
    try {
      setError('');
      setLoading(true);
      
      // Step 1: Attempt authentication
      console.log('Step 1: Calling supabase.auth.signInWithPassword...');
      setDebugInfo('Step 1: Authenticating...');
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      console.log('Auth response:', { authData, authError });
      
      if (authError) {
        console.error('Auth error:', authError);
        setDebugInfo(`Auth failed: ${authError.message}`);
        throw authError;
      }
      
      console.log('Step 1 SUCCESS - User ID:', authData.user?.id);
      setDebugInfo(`Step 1 SUCCESS - User ID: ${authData.user?.id}`);
      
      // Step 2: Fetch user role
      console.log('Step 2: Fetching user role from users table...');
      setDebugInfo('Step 2: Fetching user role...');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, email, display_name')
        .eq('id', authData.user.id)
        .single();
      
      console.log('User data response:', { userData, userError });
      
      if (userError) {
        console.error('User fetch error:', userError);
        setDebugInfo(`User fetch failed: ${userError.message}`);
        throw userError;
      }
      
      console.log('Step 2 SUCCESS - Role:', userData?.role);
      setDebugInfo(`Step 2 SUCCESS - Role: ${userData?.role}`);
      
      // Step 3: Check role
      console.log('Step 3: Checking if role is admin...');
      if (userData.role !== 'admin') {
        console.log('Role is not admin, signing out...');
        setDebugInfo(`Access denied - Role is: ${userData.role}`);
        await supabase.auth.signOut();
        setError('Access denied. Administrator credentials required.');
        return;
      }
      
      console.log('Step 3 SUCCESS - User is admin, navigating...');
      setDebugInfo('SUCCESS! Navigating to dashboard...');
      
      // Step 4: Navigate
      console.log('Step 4: Navigating to /admin/dashboard');
      //navigate('/admin/dashboard');
      window.location.href = '/admin/dashboard';
      
    } catch (err) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error object:', err);
      console.error('Error message:', err.message);
      console.error('Error status:', err?.status);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
      console.log('=== ADMIN LOGIN DEBUG END ===');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Administrator Portal
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              National Ozone Unit - Secure Access
            </p>
          </div>
          
          {/* Debug Info Display */}
          {debugInfo && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-700 font-mono">{debugInfo}</p>
            </div>
          )}
          
          {/* Security Notice */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex">
              <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-yellow-700">
                This portal is for authorized administrators only. All access is logged and monitored.
              </p>
            </div>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Administrator Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              Not an administrator? <Link to="/login/importer" className="text-blue-600 hover:underline">Importer/Technician Login</Link>
            </p>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} National Ozone Unit, Ministry of Tourism & Sustainable Development
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;