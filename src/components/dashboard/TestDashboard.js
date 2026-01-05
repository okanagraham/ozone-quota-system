// src/components/dashboard/TestDashboard.js
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const TestDashboard = () => {
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info', data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type, data }]);
    console.log(`[${timestamp}] ${message}`, data || '');
  };

  useEffect(() => {
    runTests();
  }, []);

  const clearAllStorage = () => {
    // Clear localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear all cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    addLog(`Cleared ${keysToRemove.length} localStorage items and cookies`, 'success');
    
    // Re-run tests
    setTimeout(() => runTests(), 500);
  };

  const runTests = async () => {
    setLogs([]);
    addLog('=== TEST DASHBOARD STARTED ===', 'header');
    
    // Test 0: Check what's in storage
    addLog('Test 0: Checking browser storage...', 'header');
    
    // Check localStorage
    const localStorageItems = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.includes('supabase') || key.includes('sb-') || key.includes('auth') || key.includes('nou')) {
        const value = localStorage.getItem(key);
        localStorageItems.push({ key, valueLength: value?.length || 0, preview: value?.substring(0, 100) });
      }
    }
    
    if (localStorageItems.length > 0) {
      addLog(`Found ${localStorageItems.length} auth-related localStorage items:`, 'warning');
      localStorageItems.forEach(item => {
        addLog(`  - ${item.key} (${item.valueLength} chars)`, 'warning');
      });
    } else {
      addLog('No auth-related localStorage items found', 'success');
    }
    
    // Check cookies
    const cookies = document.cookie.split(';').filter(c => 
      c.includes('supabase') || c.includes('sb-') || c.includes('auth')
    );
    
    if (cookies.length > 0) {
      addLog(`Found ${cookies.length} auth-related cookies:`, 'warning');
      cookies.forEach(cookie => {
        addLog(`  - ${cookie.trim().substring(0, 50)}...`, 'warning');
      });
    } else {
      addLog('No auth-related cookies found', 'success');
    }

    // Test 1: Check env vars
    addLog('Test 1: Checking environment variables...');
    addLog(`SUPABASE_URL: ${supabaseUrl}`, supabaseUrl ? 'success' : 'error');
    addLog(`SUPABASE_KEY exists: ${!!supabaseKey}`, supabaseKey ? 'success' : 'error');

    if (!supabaseUrl || !supabaseKey) {
      addLog('Missing environment variables - stopping tests', 'error');
      return;
    }

    // Test 2: Create fresh Supabase client with NO persistence
    addLog('Test 2: Creating fresh Supabase client (no persistence)...');
    let freshClient;
    try {
      freshClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      });
      addLog('Fresh client created successfully', 'success');
    } catch (err) {
      addLog(`Client creation failed: ${err.message}`, 'error');
      return;
    }

    // Test 3: Direct REST API call
    addLog('Test 3: Direct REST API call (bypassing SDK)...');
    try {
      const startTime = Date.now();
      const response = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      const duration = Date.now() - startTime;
      
      addLog(`REST API response: ${response.status} (${duration}ms)`, 
        response.ok ? 'success' : 'error');
      
      if (response.ok) {
        const data = await response.json();
        addLog(`Data received: ${JSON.stringify(data).substring(0, 100)}`, 'success');
      }
    } catch (err) {
      addLog(`REST API exception: ${err.message}`, 'error');
    }

    // Test 4: getSession with the SHARED client (from supabaseClient.js)
    addLog('Test 4: getSession with SHARED client (the one app uses)...');
    try {
      const { supabase: sharedClient } = await import('../../services/supabase/supabaseClient');
      
      const sessionPromise = sharedClient.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT after 5s')), 5000)
      );
      
      const startTime = Date.now();
      const result = await Promise.race([sessionPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
      
      addLog(`SHARED client getSession completed in ${duration}ms`, 'success');
      
      if (result.data?.session) {
        addLog(`Session found for: ${result.data.session.user.email}`, 'success');
      } else {
        addLog('No active session in shared client', 'warning');
      }
    } catch (err) {
      addLog(`SHARED client getSession failed: ${err.message}`, 'error');
    }

    // Test 5: getSession with fresh client (no persistence)
    addLog('Test 5: getSession with FRESH client (no persistence)...');
    try {
      const sessionPromise = freshClient.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT after 5s')), 5000)
      );
      
      const startTime = Date.now();
      const result = await Promise.race([sessionPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
      
      addLog(`FRESH client getSession completed in ${duration}ms`, 'success');
      
      if (result.data?.session) {
        addLog(`Session found for: ${result.data.session.user.email}`, 'success');
      } else {
        addLog('No active session in fresh client', 'warning');
      }
    } catch (err) {
      addLog(`FRESH client getSession failed: ${err.message}`, 'error');
    }

    // Test 6: Query with fresh client
    addLog('Test 6: Query users table with fresh client...');
    try {
      const queryPromise = freshClient.from('users').select('id, email').limit(1);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT after 5s')), 5000)
      );
      
      const startTime = Date.now();
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
      
      if (error) {
        addLog(`Query error: ${error.message}`, 'error');
      } else {
        addLog(`Query completed in ${duration}ms`, 'success');
        addLog(`Data: ${JSON.stringify(data)}`, 'success');
      }
    } catch (err) {
      addLog(`Query failed: ${err.message}`, 'error');
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
            onClick={clearAllStorage}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mr-2"
          >
            Clear Auth Storage & Re-test
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