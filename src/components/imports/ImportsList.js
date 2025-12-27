// src/components/imports/ImportsList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';

const ImportsList = () => {
  const { currentUser } = useAuth();
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const currentYear = new Date().getFullYear();
  
  // Fetch imports
  useEffect(() => {
    const fetchImports = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!currentUser) {
          console.log('No current user');
          setImports([]);
          setLoading(false);
          return;
        }
        
        // IMPORTANT FIX: Use currentUser.id (Supabase) not currentUser.uid (Firebase)
        const userId = currentUser.id || currentUser.uid;
        console.log('Fetching imports for user:', userId);
        
        if (!userId) {
          throw new Error('User ID is undefined');
        }
        
        // Query imports for current user and current year
        const { data, error: fetchError } = await supabase
          .from('imports')
          .select('*')
          .eq('user_id', userId)
          .eq('import_year', currentYear.toString())
          .order('created_at', { ascending: false });
        
        if (fetchError) {
          console.error('Supabase error:', fetchError);
          throw fetchError;
        }
        
        console.log('Imports fetched:', data?.length || 0);
        setImports(data || []);
        
      } catch (err) {
        console.error('Error fetching imports:', err);
        setError(err.message || 'Failed to load imports. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchImports();
  }, [currentUser, currentYear]);
  
  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get status color
  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('approved') || statusLower.includes('ready')) {
      return 'bg-green-100 text-green-800';
    } else if (statusLower.includes('awaiting') || statusLower.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (statusLower.includes('rejected') || statusLower.includes('denied')) {
      return 'bg-red-100 text-red-800';
    } else if (statusLower.includes('inspect')) {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Calculate total CO2 for an import
  const calculateTotalCO2 = (importItem) => {
    if (!importItem.imported_items || !importItem.imported_items.length) {
      return 0;
    }
    
    return importItem.imported_items.reduce((total, item) => {
      return total + parseFloat(item.co2_equivalent || 0);
    }, 0).toFixed(2);
  };
  
  return (
    <MainLayout title="Import Licenses">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-1">Import Licenses</h2>
            <div className="text-sm text-gray-500">
              Manage your import licenses for {currentYear}
            </div>
          </div>
          <Link
            to="/imports/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Import License
          </Link>
        </div>
        
        {/* Import metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Pending Imports</div>
            <div className="text-3xl font-bold text-blue-800">
              {imports.filter(i => i.pending).length}
            </div>
          </div>
          
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Need Inspection</div>
            <div className="text-3xl font-bold text-blue-800">
              {imports.filter(i => i.arrived && !i.inspected).length}
            </div>
          </div>
          
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Cumulative Import to date</div>
            <div className="text-3xl font-bold text-blue-800">
              {imports.reduce((total, imp) => total + parseFloat(calculateTotalCO2(imp)), 0).toFixed(2)}
              <span className="text-sm font-normal"> CO2eq</span>
            </div>
          </div>
          
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Downloads Ready</div>
            <div className="text-3xl font-bold text-blue-800">
              {imports.filter(i => i.download_ready).length}
            </div>
          </div>
        </div>
        
        {/* Imports table */}
        <div className="bg-white shadow-sm rounded-md border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Your Imports</h3>
          </div>
          
          {loading ? (
            <div className="p-6 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : imports.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No imports found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You haven't requested any import licenses yet.
              </p>
              <div className="mt-6">
                <Link
                  to="/imports/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Import License
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Import #
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submission Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inspection Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CO2 Equivalent
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {imports.map((importItem) => (
                    <tr key={importItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {importItem.import_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(importItem.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {importItem.inspection_date 
                          ? formatDate(importItem.inspection_date) 
                          : 'Not scheduled'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {calculateTotalCO2(importItem)} CO2eq
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(importItem.status)}`}>
                          {importItem.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Link 
                            to={`/imports/${importItem.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                          {importItem.download_ready && (
                            <a
                              href={importItem.invoice_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-900"
                            >
                              Download
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ImportsList;