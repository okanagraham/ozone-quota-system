// src/pages/auth/AuthCallback.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabase/supabaseClient';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the token hash from URL (Supabase uses hash-based tokens)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        // Also check query params (some flows use these)
        const tokenHash = searchParams.get('token_hash');
        const tokenType = searchParams.get('type');

        console.log('Auth callback - type:', type || tokenType);
        console.log('Hash params:', Object.fromEntries(hashParams));

        // Handle password recovery
        if (type === 'recovery' || tokenType === 'recovery') {
          if (accessToken && refreshToken) {
            // Set the session with the recovery tokens
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              setError('Failed to verify reset link. Please request a new one.');
              return;
            }

            // Redirect to reset password page
            navigate('/reset-password', { replace: true });
            return;
          }
          
          // Try using token_hash if present
          if (tokenHash) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery'
            });

            if (verifyError) {
              console.error('Verify error:', verifyError);
              setError('Invalid or expired reset link. Please request a new one.');
              return;
            }

            navigate('/reset-password', { replace: true });
            return;
          }
        }

        // Handle email confirmation
        if (type === 'signup' || tokenType === 'signup') {
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
          }
          navigate('/login/importer?confirmed=true', { replace: true });
          return;
        }

        // Handle magic link login
        if (type === 'magiclink' || tokenType === 'magiclink') {
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
          }
          navigate('/dashboard', { replace: true });
          return;
        }

        // If we get here with tokens but no recognized type, try to set session anyway
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          navigate('/dashboard', { replace: true });
          return;
        }

        // No valid tokens found
        console.log('No valid tokens found in callback');
        setError('Invalid authentication link. Please try again.');
        
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An error occurred. Please try again.');
      } finally {
        setProcessing(false);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            
            <a  href="/forgot-password"
              className="inline-block px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-700"
            >
              Request New Reset Link
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;