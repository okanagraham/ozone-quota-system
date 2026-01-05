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
    const url = process.env.REACT_APP_SUPABASE_URL;
    const keyExists = !!process.env.REACT_APP_SUPABASE_ANON_KEY;
    addLog(`Supabase URL: ${url}`, 'success');
    addLog(`Supabase Key exists: ${keyExists}`, keyExists ? 'success' : 'error');
  
    // Test 2: Get current session
    addLog('Test 2: Getting current session...');
    let userId = null;
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.auth.getSession();
      const duration = Date.now() - startTime;
      
      addLog(`getSession completed in ${duration}ms`, 'success');
      
      if (error) {
        addLog(`Session error: ${error.message}`, 'error');
      } else if (data?.session) {
        userId = data.session.user.id;
        addLog(`User ID: ${userId}`, 'success');
        addLog(`Email: ${data.session.user.email}`, 'success');
      } else {
        addLog('No session found', 'warning');
      }
    } catch (err) {
      addLog(`Session exception: ${err.message}`, 'error');
    }
  
    // Test 3: Simple count query (no RLS dependency)
    addLog('Test 3: Simple query - count all tables...');
    try {
      const startTime = Date.now();
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      const duration = Date.now() - startTime;
  
      if (error) {
        addLog(`Count error: ${error.message} (code: ${error.code})`, 'error');
      } else {
        addLog(`Count query completed in ${duration}ms, count: ${count}`, 'success');
      }
    } catch (err) {
      addLog(`Count exception: ${err.message}`, 'error');
    }
  
    // Test 4: Query with timeout
    addLog('Test 4: Query users with 5s timeout...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .limit(1)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
  
      if (error) {
        addLog(`Query error: ${error.message}`, 'error');
      } else {
        addLog(`Query completed in ${duration}ms`, 'success');
        addLog(`Data: ${JSON.stringify(data)}`, 'success');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        addLog('Query TIMED OUT after 5 seconds!', 'error');
      } else {
        addLog(`Query exception: ${err.message}`, 'error');
      }
    }
  
    // Test 5: Check RLS status via RPC (if you have this function)
    addLog('Test 5: Direct fetch to Supabase REST API...');
    try {
      const startTime = Date.now();
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/users?select=id,email&limit=1`,
        {
          headers: {
            'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          }
        }
      );
      const duration = Date.now() - startTime;
      
      addLog(`Fetch status: ${response.status} in ${duration}ms`, response.ok ? 'success' : 'error');
      
      const text = await response.text();
      addLog(`Response: ${text.substring(0, 200)}`, response.ok ? 'success' : 'error');
    } catch (err) {
      addLog(`Fetch exception: ${err.message}`, 'error');
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