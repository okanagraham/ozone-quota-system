// src/components/debug/SupabaseDiagnostic.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';

const SupabaseDiagnostic = () => {
  const [results, setResults] = useState({
    envVars: {},
    connection: null,
    session: null,
    usersTable: null,
  });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const diagnostics = { ...results };

    // 1. Check environment variables
    diagnostics.envVars = {
      url: !!process.env.REACT_APP_SUPABASE_URL,
      key: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
      urlValue: process.env.REACT_APP_SUPABASE_URL?.substring(0, 30) + '...',
    };

    // 2. Test connection
    try {
      const { data, error } = await supabase.auth.getSession();
      diagnostics.connection = {
        success: !error,
        error: error?.message,
        hasSession: !!data.session,
      };
    } catch (err) {
      diagnostics.connection = {
        success: false,
        error: err.message,
      };
    }

    // 3. Test users table access
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      diagnostics.usersTable = {
        success: !error,
        error: error?.message,
        count: data,
      };
    } catch (err) {
      diagnostics.usersTable = {
        success: false,
        error: err.message,
      };
    }

    setResults(diagnostics);
  };

  const ResultItem = ({ label, success, error, details }) => (
    <div className="border-b border-gray-200 py-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className={`px-3 py-1 rounded text-sm ${
          success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {success ? '✓ Pass' : '✗ Fail'}
        </span>
      </div>
      {error && (
        <p className="text-red-600 text-sm mt-1">Error: {error}</p>
      )}
      {details && (
        <p className="text-gray-600 text-sm mt-1">{details}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Supabase Connection Diagnostic</h1>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-3">Environment Variables</h2>
              <ResultItem
                label="REACT_APP_SUPABASE_URL"
                success={results.envVars.url}
                details={results.envVars.urlValue}
              />
              <ResultItem
                label="REACT_APP_SUPABASE_ANON_KEY"
                success={results.envVars.key}
              />
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">Connection Test</h2>
              <ResultItem
                label="Supabase Connection"
                success={results.connection?.success}
                error={results.connection?.error}
                details={results.connection?.hasSession ? 'Active session found' : 'No active session'}
              />
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">Database Access</h2>
              <ResultItem
                label="Users Table Access"
                success={results.usersTable?.success}
                error={results.usersTable?.error}
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">Next Steps:</h3>
            <ul className="text-sm space-y-1">
              <li>• If env vars are missing: Create/update .env file in project root</li>
              <li>• If connection fails: Check Supabase project is active</li>
              <li>• If table access fails: Check RLS policies on users table</li>
              <li>• After fixing: Restart development server (npm start)</li>
            </ul>
          </div>

          <button
            onClick={runDiagnostics}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Run Diagnostics Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupabaseDiagnostic;