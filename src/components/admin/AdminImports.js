// src/components/admin/AdminImports.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext_working';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';
import MultipleFileUpload from '../common/MultipleFileUpload';
import SignatureCanvas from 'react-signature-canvas';

const AdminImports = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [imports, setImports] = useState([]);
  const [filteredImports, setFilteredImports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || 'pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modals state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);
  
  // Inspection modal state
  const [inspectionDate, setInspectionDate] = useState('');
  const [scheduling, setScheduling] = useState(false);
  
  // Approval modal state
  const [signaturePad, setSignaturePad] = useState(null);
  const [adminName, setAdminName] = useState('');
  const [approving, setApproving] = useState(false);
  
  // Files modal state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // Redirect non-admins
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [userProfile, navigate]);
  
  // Set admin name from profile
  useEffect(() => {
    if (userProfile) {
      setAdminName(userProfile.display_name || userProfile.admin_role || 'Administrator');
    }
  }, [userProfile]);
  
  // Fetch imports
  useEffect(() => {
    fetchImports();
  }, [statusFilter]);
  
  // Filter imports when search term changes
  useEffect(() => {
    if (searchTerm) {
      const filtered = imports.filter(imp => 
        imp.users?.enterprise_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        imp.import_number?.toString().includes(searchTerm) ||
        imp.import_year?.includes(searchTerm)
      );
      setFilteredImports(filtered);
    } else {
      setFilteredImports(imports);
    }
  }, [searchTerm, imports]);
  
  const fetchImports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('imports')
        .select(`
          *,
          users (
            id,
            email,
            enterprise_name,
            display_name,
            telephone,
            import_quota,
            cumulative_imports,
            balance_imports
          ),
          registrations (
            id,
            cert_no,
            year
          )
        `)
        .order('created_at', { ascending: false });
      
      // Apply status filter
      if (statusFilter === 'pending') {
        query = query.eq('pending', true);
      } else if (statusFilter === 'inspection') {
        query = query.eq('arrived', true).eq('inspected', false);
      } else if (statusFilter === 'approved') {
        query = query.eq('approved', true);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setImports(data || []);
      setFilteredImports(data || []);
    } catch (err) {
      console.error('Error fetching imports:', err);
      setError('Failed to load imports');
    } finally {
      setLoading(false);
    }
  };
  
  const openViewModal = (importItem) => {
    setSelectedImport(importItem);
    setShowViewModal(true);
  };
  
  const openInspectionModal = (importItem) => {
    setSelectedImport(importItem);
    // Set default inspection date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setInspectionDate(tomorrow.toISOString().split('T')[0]);
    setShowInspectionModal(true);
  };
  
  const openApprovalModal = (importItem) => {
    setSelectedImport(importItem);
    setShowApprovalModal(true);
  };
  
  const openFilesModal = (importItem) => {
    setSelectedImport(importItem);
    setUploadedFiles([]);
    setShowFilesModal(true);
  };
  
  const closeModals = () => {
    setShowViewModal(false);
    setShowInspectionModal(false);
    setShowApprovalModal(false);
    setShowFilesModal(false);
    setSelectedImport(null);
    setInspectionDate('');
    setUploadedFiles([]);
    if (signaturePad) {
      signaturePad.clear();
    }
  };
  
  const handleScheduleInspection = async () => {
    if (!selectedImport || !inspectionDate) return;
    
    try {
      setScheduling(true);
      setError(null);
      
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          inspection_date: new Date(inspectionDate).toISOString(),
          status: 'Inspection Scheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedImport.id);
      
      if (updateError) throw updateError;
      
      await fetchImports();
      closeModals();
      alert('Inspection scheduled successfully');
    } catch (err) {
      console.error('Error scheduling inspection:', err);
      setError('Failed to schedule inspection');
    } finally {
      setScheduling(false);
    }
  };
  
  const handleMarkInspected = async (importId) => {
    if (!window.confirm('Mark this import as inspected?')) return;
    
    try {
      const { error } = await supabase
        .from('imports')
        .update({
          inspected: true,
          status: 'Awaiting Approval',
          updated_at: new Date().toISOString()
        })
        .eq('id', importId);
      
      if (error) throw error;
      
      await fetchImports();
    } catch (err) {
      console.error('Error marking as inspected:', err);
      setError('Failed to mark as inspected');
    }
  };
  
  const handleApprove = async () => {
    if (!selectedImport) return;
    
    // Validate
    if (!signaturePad || signaturePad.isEmpty()) {
      setError('Please provide your signature');
      return;
    }
    
    if (!adminName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    try {
      setApproving(true);
      setError(null);
      
      // Get signature as data URL
      const signatureDataUrl = signaturePad.toDataURL();
      
      // Upload signature to Supabase Storage
      const signatureBlob = await fetch(signatureDataUrl).then(r => r.blob());
      const signaturePath = `import_signatures/${selectedImport.id}_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(signaturePath, signatureBlob, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(signaturePath);
      
      // Calculate total CO2 from imported items
      const importedItems = Array.isArray(selectedImport.imported_items) 
        ? selectedImport.imported_items 
        : [];
      const totalCO2 = importedItems.reduce((sum, item) => {
        return sum + (parseFloat(item.co2_equivalent) || 0);
      }, 0);
      
      // Update import
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          approved: true,
          pending: false,
          status: 'Approved',
          admin_signature: urlData.publicUrl,
          admin_name: adminName,
          admin_role: userProfile.admin_role || 'Administrator',
          admin_signature_date: new Date().toISOString(),
          can_generate: true,
          download_ready: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedImport.id);
      
      if (updateError) throw updateError;
      
      // Update user's quota (cumulative imports and balance)
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('cumulative_imports, balance_imports')
        .eq('id', selectedImport.user_id)
        .single();
      
      if (userFetchError) throw userFetchError;
      
      const newCumulativeImports = (parseFloat(userData.cumulative_imports) || 0) + totalCO2;
      const newBalance = (parseFloat(userData.balance_imports) || 0) - totalCO2;
      
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          cumulative_imports: newCumulativeImports,
          balance_imports: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedImport.user_id);
      
      if (userUpdateError) throw userUpdateError;
      
      // Refresh imports list
      await fetchImports();
      closeModals();
      
      alert('Import approved successfully!');
    } catch (err) {
      console.error('Error approving import:', err);
      setError('Failed to approve import: ' + err.message);
    } finally {
      setApproving(false);
    }
  };
  
  const handleReject = async (importId) => {
    if (!window.confirm('Are you sure you want to reject this import?')) return;
    
    try {
      const { error } = await supabase
        .from('imports')
        .update({
          status: 'Rejected',
          pending: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', importId);
      
      if (error) throw error;
      
      await fetchImports();
    } catch (err) {
      console.error('Error rejecting import:', err);
      setError('Failed to reject import');
    }
  };
  
  const handleFilesUploaded = async (files) => {
    if (!selectedImport) return;
    
    setUploadedFiles(files);
    
    // You can save file URLs to the import record or a separate files table
    // For now, we'll just store them in a JSONB array
    try {
      // Get existing files
      const existingFiles = selectedImport.admin_files || [];
      const allFiles = [...existingFiles, ...files.map(f => ({ name: f.name, url: f.url }))];
      
      const { error } = await supabase
        .from('imports')
        .update({
          admin_files: allFiles,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedImport.id);
      
      if (error) throw error;
      
      alert('Files uploaded successfully');
      await fetchImports();
    } catch (err) {
      console.error('Error saving files:', err);
      setError('Failed to save files');
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('approved')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('awaiting') || statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('rejected')) return 'bg-red-100 text-red-800';
    if (statusLower.includes('inspection')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  const calculateTotalCO2 = (importedItems) => {
    if (!Array.isArray(importedItems)) return 0;
    return importedItems.reduce((sum, item) => {
      return sum + (parseFloat(item.co2_equivalent) || 0);
    }, 0).toFixed(2);
  };
  
  if (loading) {
    return (
      <MainLayout title="Manage Imports">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="Manage Imports">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-1">Manage Import Licenses</h2>
            <p className="text-sm text-gray-500">Review, inspect, and approve import licenses</p>
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
        
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search imports..."
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div>
            <select
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="pending">Pending Approval</option>
              <option value="inspection">Needing Inspection</option>
              <option value="approved">Approved</option>
              <option value="all">All Imports</option>
            </select>
          </div>
        </div>
        
        {/* Imports Table */}
        <div className="bg-white shadow-sm rounded-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Import #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Importer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CO2 Equiv
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arrived
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
                {filteredImports.length > 0 ? (
                  filteredImports.map((importItem) => (
                    <tr key={importItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{importItem.import_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {importItem.users?.enterprise_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{importItem.users?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {importItem.import_year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calculateTotalCO2(importItem.imported_items)} CO2eq
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {importItem.arrived ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(importItem.status)}`}>
                          {importItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => openViewModal(importItem)}
                            className="text-blue-600 hover:text-blue-900 text-left"
                          >
                            View Details
                          </button>
                          {importItem.arrived && !importItem.inspected && (
                            <>
                              <button
                                onClick={() => openInspectionModal(importItem)}
                                className="text-purple-600 hover:text-purple-900 text-left"
                              >
                                Schedule Inspection
                              </button>
                              <button
                                onClick={() => handleMarkInspected(importItem.id)}
                                className="text-indigo-600 hover:text-indigo-900 text-left"
                              >
                                Mark Inspected
                              </button>
                            </>
                          )}
                          {importItem.inspected && !importItem.approved && (
                            <>
                              <button
                                onClick={() => openApprovalModal(importItem)}
                                className="text-green-600 hover:text-green-900 text-left"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(importItem.id)}
                                className="text-red-600 hover:text-red-900 text-left"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openFilesModal(importItem)}
                            className="text-gray-600 hover:text-gray-900 text-left"
                          >
                            Manage Files
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'No imports found matching your search' : 'No imports to review'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* View Modal */}
      {showViewModal && selectedImport && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModals}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Import Details - #{selectedImport.import_number}
                </h3>
                
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Importer:</span>
                      <p className="mt-1 text-sm text-gray-900">{selectedImport.users?.enterprise_name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Import Year:</span>
                      <p className="mt-1 text-sm text-gray-900">{selectedImport.import_year}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Submission Date:</span>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedImport.submission_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Status:</span>
                      <p className="mt-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedImport.status)}`}>
                          {selectedImport.status}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total CO2:</span>
                      <p className="mt-1 text-sm text-gray-900">{calculateTotalCO2(selectedImport.imported_items)} CO2eq</p>
                    </div>
                    {selectedImport.inspection_date && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Inspection Date:</span>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedImport.inspection_date)}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Imported Items */}
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Imported Items</h4>
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Refrigerant</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Country</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Volume</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">CO2eq</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(Array.isArray(selectedImport.imported_items) 
                            ? selectedImport.imported_items 
                            : []
                          ).map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm">{item.ashrae}</td>
                              <td className="px-4 py-2 text-sm">{item.export_country}</td>
                              <td className="px-4 py-2 text-sm">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm">{item.volume} {item.designation}</td>
                              <td className="px-4 py-2 text-sm">{item.co2_equivalent}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Invoice */}
                  {selectedImport.invoice_url && (
                    <div className="mt-4">
                      <a
                        href={selectedImport.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Invoice →
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:w-auto sm:text-sm"
                  onClick={closeModals}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Inspection Modal */}
      {showInspectionModal && selectedImport && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModals}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Schedule Inspection
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Import #{selectedImport.import_number} - {selectedImport.users?.enterprise_name}
                  </p>
                  
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  onClick={handleScheduleInspection}
                  disabled={scheduling || !inspectionDate}
                >
                  {scheduling ? 'Scheduling...' : 'Schedule Inspection'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={closeModals}
                  disabled={scheduling}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Approval Modal */}
      {showApprovalModal && selectedImport && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModals}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Approve Import License
                </h3>
                
                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Import #:</span> {selectedImport.import_number}
                    </div>
                    <div>
                      <span className="font-medium">Total CO2:</span> {calculateTotalCO2(selectedImport.imported_items)} CO2eq
                    </div>
                    <div>
                      <span className="font-medium">Importer:</span> {selectedImport.users?.enterprise_name}
                    </div>
                    <div>
                      <span className="font-medium">Year:</span> {selectedImport.import_year}
                    </div>
                  </div>
                </div>
                
                {/* Admin Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Name
                  </label>
                  <input
                    type="text"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                  />
                </div>
                
                {/* Signature Pad */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Digital Signature
                  </label>
                  <div className="border-2 border-gray-300 rounded-md">
                    <SignatureCanvas
                      ref={(ref) => setSignaturePad(ref)}
                      canvasProps={{
                        className: 'w-full h-40 cursor-crosshair'
                      }}
                      backgroundColor="white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => signaturePad?.clear()}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  onClick={handleApprove}
                  disabled={approving}
                >
                  {approving ? 'Approving...' : 'Approve Import'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={closeModals}
                  disabled={approving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Files Management Modal */}
      {showFilesModal && selectedImport && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModals}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Manage Import Files
                </h3>
                
                <p className="text-sm text-gray-500 mb-4">
                  Upload additional documents for Import #{selectedImport.import_number}
                </p>
                
                <MultipleFileUpload
                  onFilesUploaded={handleFilesUploaded}
                  storageBucket="documents"
                  storagePath={`imports/${selectedImport.id}/admin_files`}
                  acceptedFileTypes=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  maxFileSize={10485760}
                  maxFiles={10}
                />
                
                {/* Existing Files */}
                {selectedImport.admin_files && selectedImport.admin_files.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Existing Files</h4>
                    <ul className="border border-gray-200 rounded-md divide-y">
                      {selectedImport.admin_files.map((file, index) => (
                        <li key={index} className="p-3 flex justify-between items-center">
                          <span className="text-sm">{file.name}</span>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:w-auto sm:text-sm"
                  onClick={closeModals}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default AdminImports;