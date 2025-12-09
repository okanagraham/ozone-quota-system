// src/components/admin/AdminImporters.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';

const AdminImporters = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [importers, setImporters] = useState([]);
  const [filteredImporters, setFilteredImporters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImporter, setSelectedImporter] = useState(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaAmount, setQuotaAmount] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Redirect non-admins
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [userProfile, navigate]);
  
  // Fetch importers
  useEffect(() => {
    fetchImporters();
  }, []);
  
  // Filter importers when search term changes
  useEffect(() => {
    if (searchTerm) {
      const filtered = importers.filter(imp => 
        imp.enterprise_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        imp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        imp.importer_number?.includes(searchTerm)
      );
      setFilteredImporters(filtered);
    } else {
      setFilteredImporters(importers);
    }
  }, [searchTerm, importers]);
  
  const fetchImporters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'importer')
        .order('enterprise_name', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      setImporters(data || []);
      setFilteredImporters(data || []);
    } catch (err) {
      console.error('Error fetching importers:', err);
      setError('Failed to load importers');
    } finally {
      setLoading(false);
    }
  };
  
  const openQuotaModal = (importer) => {
    setSelectedImporter(importer);
    setQuotaAmount(importer.import_quota?.toString() || '0');
    setShowQuotaModal(true);
  };
  
  const closeQuotaModal = () => {
    setShowQuotaModal(false);
    setSelectedImporter(null);
    setQuotaAmount('');
  };
  
  const handleQuotaUpdate = async () => {
    if (!selectedImporter) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const quotaValue = parseFloat(quotaAmount) || 0;
      
      // Calculate new balance
      const currentCumulative = parseFloat(selectedImporter.cumulative_imports) || 0;
      const newBalance = quotaValue - currentCumulative;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          import_quota: quotaValue,
          balance_imports: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedImporter.id);
      
      if (updateError) throw updateError;
      
      // Refresh importers list
      await fetchImporters();
      closeQuotaModal();
      
    } catch (err) {
      console.error('Error updating quota:', err);
      setError('Failed to update quota');
    } finally {
      setSaving(false);
    }
  };
  
  const viewImporterDetails = (importer) => {
    navigate(`/admin/importers/${importer.id}`);
  };
  
  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  
  const getQuotaStatus = (importer) => {
    const quota = parseFloat(importer.import_quota) || 0;
    const used = parseFloat(importer.cumulative_imports) || 0;
    
    if (quota === 0) return { color: 'text-gray-500', text: 'No Quota' };
    
    const percentage = (used / quota) * 100;
    
    if (percentage >= 90) return { color: 'text-red-600', text: 'Critical' };
    if (percentage >= 75) return { color: 'text-orange-600', text: 'High' };
    if (percentage >= 50) return { color: 'text-yellow-600', text: 'Medium' };
    return { color: 'text-green-600', text: 'Good' };
  };
  
  if (loading) {
    return (
      <MainLayout title="Manage Importers">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="Manage Importers">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-1">Manage Importers</h2>
            <p className="text-sm text-gray-500">View and manage importer quotas</p>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by enterprise name, email, or importer number..."
              className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Importers Table */}
        <div className="bg-white shadow-sm rounded-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Importer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredImporters.length > 0 ? (
                  filteredImporters.map((importer) => {
                    const quotaStatus = getQuotaStatus(importer);
                    return (
                      <tr key={importer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {importer.enterprise_name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            #{importer.importer_number || 'Not Assigned'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{importer.email}</div>
                          <div className="text-sm text-gray-500">{importer.telephone || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(importer.import_quota)} CO2eq
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(importer.cumulative_imports)} CO2eq
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(importer.balance_imports)} CO2eq
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${quotaStatus.color}`}>
                            {quotaStatus.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openQuotaModal(importer)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit Quota
                          </button>
                          <button
                            onClick={() => viewImporterDetails(importer)}
                            className="text-green-600 hover:text-green-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'No importers found matching your search' : 'No importers registered yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Quota Edit Modal */}
      {showQuotaModal && selectedImporter && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeQuotaModal}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Edit Import Quota
                    </h3>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                      <div className="text-sm text-gray-700">
                        <div className="font-medium mb-2">{selectedImporter.enterprise_name}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>Current Quota:</div>
                          <div className="font-medium">{formatNumber(selectedImporter.import_quota)} CO2eq</div>
                          <div>Cumulative Imports:</div>
                          <div className="font-medium">{formatNumber(selectedImporter.cumulative_imports)} CO2eq</div>
                          <div>Current Balance:</div>
                          <div className="font-medium">{formatNumber(selectedImporter.balance_imports)} CO2eq</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <label htmlFor="quota" className="block text-sm font-medium text-gray-700 mb-2">
                        New Quota Amount (CO2 Equivalent)
                      </label>
                      <input
                        type="number"
                        id="quota"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter quota amount"
                        value={quotaAmount}
                        onChange={(e) => setQuotaAmount(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        New balance will be calculated automatically: New Quota - Cumulative Imports
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  onClick={handleQuotaUpdate}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Update Quota'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeQuotaModal}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default AdminImporters;