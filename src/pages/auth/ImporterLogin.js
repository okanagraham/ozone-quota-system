// src/pages/auth/ImporterLogin.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase/supabaseClient';

const ImporterLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) throw authError;
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();
      
      if (userError) throw userError;
      
      // Redirect based on role - block admin/customs from this portal
      if (userData.role === 'admin') {
        await supabase.auth.signOut();
        setError('Please use the Administrator login portal.');
        return;
      }
      
      if (userData.role === 'customs') {
        await supabase.auth.signOut();
        setError('Please use the Customs login portal.');
        return;
      }
      
      if (userData.role === 'technician') {
        navigate('/technician/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-blue-900 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                NOU
              </div>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Importer / Technician Portal
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              National Ozone Unit Quota Management System
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            
            <div className="flex items-center justify-between text-sm">
              <Link to="/register" className="text-blue-600 hover:text-blue-500">
                Create Account
              </Link>
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-500">
                Forgot password?
              </Link>
            </div>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              Are you an administrator? <Link to="/login/admin" className="text-blue-600 hover:underline">Admin Login</Link>
            </p>
            <p className="text-xs text-center text-gray-500 mt-1">
              Customs officer? <Link to="/login/customs" className="text-blue-600 hover:underline">Customs Login</Link>
            </p>
          </div>
        </div>
        
        <p className="text-center text-xs text-blue-200 mt-6">
          © {new Date().getFullYear()} National Ozone Unit, Ministry of Environment
        </p>
      </div>
    </div>
  );
};

export default ImporterLogin;