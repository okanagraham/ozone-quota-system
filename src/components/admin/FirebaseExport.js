// src/components/admin/FirebaseExport.js
// Temporary component to export Firebase data
// Add route: <Route path="/admin/export" element={<FirebaseExport />} />

import React, { useState } from 'react';
import { db } from '../../services/firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const FirebaseExport = () => {
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState(null);

  const convertTimestamps = (obj) => {
    if (obj === null || obj === undefined) return obj;
    
    // Firestore Timestamp
    if (obj.toDate && typeof obj.toDate === 'function') {
      return obj.toDate().toISOString();
    }
    
    // Timestamp-like object
    if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
      return new Date(obj.seconds * 1000).toISOString();
    }
    
    // Array
    if (Array.isArray(obj)) {
      return obj.map(item => convertTimestamps(item));
    }
    
    // Object
    if (typeof obj === 'object') {
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        // Handle document references
        if (value && value.path) {
          converted[key] = { __type__: 'reference', path: value.path };
        } else {
          converted[key] = convertTimestamps(value);
        }
      }
      return converted;
    }
    
    return obj;
  };

  const exportData = async () => {
    setExporting(true);
    setStatus('Starting export...');
    
    const exportData = {
      exportDate: new Date().toISOString(),
      collections: {}
    };
    
    const collections = ['users', 'registrations', 'imports', 'refrigerants', 'technicians', 'settings'];
    const counts = {};
    
    try {
      for (const collectionName of collections) {
        setStatus(`Exporting ${collectionName}...`);
        
        try {
          const querySnapshot = await getDocs(collection(db, collectionName));
          const documents = [];
          
          querySnapshot.forEach((doc) => {
            documents.push({
              id: doc.id,
              ...convertTimestamps(doc.data())
            });
          });
          
          exportData.collections[collectionName] = documents;
          counts[collectionName] = documents.length;
        } catch (err) {
          console.error(`Error with ${collectionName}:`, err);
          exportData.collections[collectionName] = [];
          counts[collectionName] = 0;
        }
      }
      
      // Download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `firebase-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus('Export complete! Check your downloads.');
      setResults(counts);
      
    } catch (error) {
      console.error('Export error:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Firebase Data Export</h1>
        
        <p className="text-gray-600 mb-6">
          This will export all data from Firebase Firestore to a JSON file that can be imported into Supabase.
        </p>
        
        <button
          onClick={exportData}
          disabled={exporting}
          className={`w-full py-3 px-4 rounded-md text-white font-medium ${
            exporting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {exporting ? 'Exporting...' : 'Export All Data'}
        </button>
        
        {status && (
          <div className={`mt-4 p-4 rounded-md ${
            status.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
          }`}>
            {status}
          </div>
        )}
        
        {results && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Export Summary</h2>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Collection</th>
                  <th className="py-2 text-right">Documents</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(results).map(([name, count]) => (
                  <tr key={name} className="border-b">
                    <td className="py-2">{name}</td>
                    <td className="py-2 text-right font-mono">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-8 p-4 bg-yellow-50 rounded-md">
          <h3 className="font-semibold text-yellow-800 mb-2">Next Steps</h3>
          <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
            <li>Download the exported JSON file</li>
            <li>Run the Supabase schema SQL in your Supabase project</li>
            <li>Run the Node.js import script with the JSON file</li>
            <li>Verify data in Supabase dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default FirebaseExport;