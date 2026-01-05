// src/components/dashboard/TestDashboard.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';

const TestDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const addLog = (message, type = 'info', data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type, data }]);
    console.log(`[${timestamp}] ${message}`, data || '');
  };

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    addLog('=== TEST DASHBOARD STARTED ===', 'header');
    
    // Test 1: Check Supabase client
    addLog('Test 1: Checking Supabase client configuration...');
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const keyExists = !!process.env.REACT_APP_SUPABASE_ANON_KEY;
      addLog(`Supabase URL: ${url}`, 'success');
      addLog(`Supabase Key exists: ${keyExists}`, keyExists ? 'success' : 'error');
    } catch (err) {
      addLog(`Config error: ${err.message}`, 'error');
    }

    // Test 2: Get current session
    addLog('Test 2: Getting current session...');
    try {
      const startTime = Date.now();
      const { data: { session }, error } = await supabase.auth.getSession();
      const duration = Date.now() - startTime;
      
      if (error) {
        addLog(`Session error: ${error.message}`, 'error');
      } else if (session) {
        addLog(`Session found in ${duration}ms`, 'success');
        addLog(`User ID: ${session.user.id}`, 'success');
        addLog(`Email: ${session.user.email}`, 'success');
        setCurrentUser(session.user);
      } else {
        addLog('No session found - user not logged in', 'warning');
        return; // Stop tests if not logged in
      }
    } catch (err) {
      addLog(`Session exception: ${err.message}`, 'error');
      return;
    }

    // Test 3: Simple query to users table
    addLog('Test 3: Querying users table (simple select)...');
    try {
      const startTime = Date.now();
      const { data, error, status } = await supabase
        .from('users')
        .select('id, email, role')
        .limit(1);
      const duration = Date.now() - startTime;

      if (error) {
        addLog(`Users query error (${status}): ${error.message}`, 'error', error);
      } else {
        addLog(`Users query completed in ${duration}ms`, 'success');
        addLog(`Returned ${data?.length || 0} rows`, 'success', data);
      }
    } catch (err) {
      addLog(`Users query exception: ${err.message}`, 'error');
    }

    // Test 4: Query current user's profile
    addLog('Test 4: Querying current user profile...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addLog('No session for user query', 'warning');
        return;
      }

      const startTime = Date.now();
      const { data, error, status } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      const duration = Date.now() - startTime;

      if (error) {
        addLog(`Profile query error (${status}): ${error.message}`, 'error', error);
        addLog(`Error code: ${error.code}`, 'error');
        addLog(`Error details: ${error.details}`, 'error');
      } else {
        addLog(`Profile query completed in ${duration}ms`, 'success');
        addLog(`Profile data:`, 'success', data);
      }
    } catch (err) {
      addLog(`Profile query exception: ${err.message}`, 'error');
    }

    // Test 5: Query settings table
    addLog('Test 5: Querying settings table...');
    try {
      const startTime = Date.now();
      const { data, error, status } = await supabase
        .from('settings')
        .select('*')
        .limit(1);
      const duration = Date.now() - startTime;

      if (error) {
        addLog(`Settings query error (${status}): ${error.message}`, 'error', error);
      } else {
        addLog(`Settings query completed in ${duration}ms`, 'success');
        addLog(`Settings data:`, 'success', data);
      }
    } catch (err) {
      addLog(`Settings query exception: ${err.message}`, 'error');
    }

    // Test 6: Query registrations table
    addLog('Test 6: Querying registrations table...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const startTime = Date.now();
      const { data, error, status } = await supabase
        .from('registrations')
        .select('id, year, status')
        .eq('user_id', session.user.id)
        .limit(5);
      const duration = Date.now() - startTime;

      if (error) {
        addLog(`Registrations query error (${status}): ${error.message}`, 'error', error);
      } else {
        addLog(`Registrations query completed in ${duration}ms`, 'success');
        addLog(`Found ${data?.length || 0} registrations`, 'success', data);
      }
    } catch (err) {
      addLog(`Registrations query exception: ${err.message}`, 'error');
    }

    addLog('=== ALL TESTS COMPLETED ===', 'header');
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'header': return 'text-blue-800 bg-blue-100 font-bold';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Test Dashboard</h1>
          <p className="text-gray-600 mb-4">Debugging Supabase connections on Vercel</p>
          
          <button
            onClick={runTests}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
          >
            Re-run Tests
          </button>
          
          <button
            onClick={() => setLogs([])}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear Logs
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Test Results ({logs.length} entries)</h2>
          
          <div className="space-y-2 font-mono text-sm max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">Running tests...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`p-2 rounded ${getLogColor(log.type)}`}>
                  <span className="text-gray-400 mr-2">[{log.timestamp}]</span>
                  <span>{log.message}</span>
                  {log.data && (
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDashboard;