// src/components/admin/AdminImportsManagement.js
// ALL DATABASE OPERATIONS USE SUPABASE - NOT FIREBASE
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import { ImportLicenseService } from '../../services/import/importLicenseService';
import { useAuth } from '../../context/AuthContext';

const AdminImportsManagement = () => {
  const { currentUser, userProfile } = useAuth();
  
  // State
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);
  
  // Schedule inspection state
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionTime, setInspectionTime] = useState('10:00');
  
  // Signature canvas state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  
  // Fetch imports
  const fetchImports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {};
      if (yearFilter && yearFilter !== 'all') {
        filters.year = yearFilter;
      }
      if (statusFilter && statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      const data = await ImportLicenseService.getAllImports(filters);
      setImports(data);
    } catch (err) {
      console.error('Error fetching imports:', err);
      setError('Failed to load imports');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchImports();
  }, [yearFilter, statusFilter]);
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);
  
  // Filter imports by search term
  const filteredImports = imports.filter(imp => {
    const search = searchTerm.toLowerCase();
    return (
      imp.name?.toLowerCase().includes(search) ||
      imp.import_number?.toString().includes(search) ||
      imp.users?.enterprise_name?.toLowerCase().includes(search) ||
      imp.users?.email?.toLowerCase().includes(search)
    );
  });
  
  // Get status badge color
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('approved')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('rejected')) return 'bg-red-100 text-red-800';
    if (statusLower.includes('scheduled')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('awaiting')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  // Calculate total CO2
  const getTotalCO2 = (importItem) => {
    if (!importItem?.imported_items) return '0';
    return importItem.imported_items.reduce((sum, item) => {
      return sum + parseFloat(item.co2_equivalent || 0);
    }, 0).toFixed(2);
  };
  
  // View import details
  const handleViewImport = (importItem) => {
    setSelectedImport(importItem);
    setShowViewModal(true);
  };
  
  // Open schedule modal
  const handleOpenSchedule = (importItem) => {
    setSelectedImport(importItem);
    setInspectionDate('');
    setInspectionTime('10:00');
    setShowScheduleModal(true);
  };
  
  // Schedule inspection
  const handleScheduleInspection = async () => {
    if (!inspectionDate || !inspectionTime) {
      setError('Please select date and time');
      return;
    }
    
    try {
      const dateTime = new Date(`${inspectionDate}T${inspectionTime}`);
      
      await ImportLicenseService.scheduleInspection(
        selectedImport.id,
        dateTime.toISOString(),
        { name: userProfile?.display_name || userProfile?.email || 'Admin' }
      );
      
      setSuccess('Inspection scheduled successfully! Notification sent to importer.');
      setShowScheduleModal(false);
      setInspectionDate('');
      setInspectionTime('10:00');
      fetchImports();
    } catch (err) {
      console.error('Error scheduling inspection:', err);
      setError('Failed to schedule inspection: ' + err.message);
    }
  };
  
  // Open approval modal
  const handleOpenApproval = (importItem) => {
    setSelectedImport(importItem);
    setSignatureData(null);
    setShowApprovalModal(true);
  };
  
  // Signature canvas setup
  useEffect(() => {
    if (showApprovalModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [showApprovalModal]);
  
  const startDrawing = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  
  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };
  
  const clearSignature = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };
  
  // Approve import
  const handleApproveImport = async () => {
    if (!signatureData) {
      setError('Please provide your signature');
      return;
    }
    
    try {
      await ImportLicenseService.approveImport(
        selectedImport.id,
        {
          name: userProfile?.display_name || userProfile?.email || 'Admin',
          role: userProfile?.admin_role || 'Administrator'
        },
        signatureData
      );
      
      setSuccess('Import approved successfully! Notification sent to importer.');
      setShowApprovalModal(false);
      clearSignature();
      fetchImports();
    } catch (err) {
      console.error('Error approving import:', err);
      setError('Failed to approve import: ' + err.message);
    }
  };
  
  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Import License Management</h1>
      
      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {success}
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name, number..."
              className="w-full border rounded-md px-3 py-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Awaiting Shipment Arrival">Awaiting Arrival</option>
              <option value="Awaiting Inspection Schedule">Awaiting Inspection</option>
              <option value="Inspection Scheduled">Inspection Scheduled</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="all">All Years</option>
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchImports}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {/* Imports Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading imports...</p>
          </div>
        ) : filteredImports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No imports found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Import #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO2 Eq</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredImports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{imp.import_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {imp.users?.enterprise_name || imp.name}
                      </div>
                      <div className="text-sm text-gray-500">{imp.users?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {imp.import_year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getTotalCO2(imp)} CO2eq
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(imp.status)}`}>
                        {imp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {imp.inspection_date ? formatDateTime(imp.inspection_date) : 'Not scheduled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleViewImport(imp)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                      
                      {/* Show Schedule button if arrived but not scheduled */}
                      {imp.arrived && !imp.inspection_date && !imp.approved && (
                        <button
                          onClick={() => handleOpenSchedule(imp)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          Schedule
                        </button>
                      )}
                      
                      {/* Show Approve button if inspection scheduled but not approved */}
                      {imp.inspection_date && !imp.approved && (
                        <button
                          onClick={() => handleOpenApproval(imp)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* View Modal */}
      {showViewModal && selectedImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Import #{selectedImport.import_number}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Importer</label>
                  <p className="font-medium">{selectedImport.users?.enterprise_name || selectedImport.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <p><span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedImport.status)}`}>{selectedImport.status}</span></p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Submission Date</label>
                  <p className="font-medium">{formatDate(selectedImport.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Total CO2 Equivalent</label>
                  <p className="font-medium">{getTotalCO2(selectedImport)} CO2eq</p>
                </div>
                {selectedImport.inspection_date && (
                  <div>
                    <label className="text-sm text-gray-500">Inspection Date</label>
                    <p className="font-medium">{formatDateTime(selectedImport.inspection_date)}</p>
                  </div>
                )}
                {selectedImport.admin_name && (
                  <div>
                    <label className="text-sm text-gray-500">Approved By</label>
                    <p className="font-medium">{selectedImport.admin_name}</p>
                  </div>
                )}
              </div>
              
              {/* Imported Items */}
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Imported Items</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Refrigerant</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Origin</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Volume</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">CO2eq</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedImport.imported_items?.map((item, idx) => (
                        <tr key={idx}>
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
              
              {/* Documents */}
              {selectedImport.documents?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Documents ({selectedImport.documents.length})</h3>
                  <div className="space-y-2">
                    {selectedImport.documents.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-50 rounded hover:bg-gray-100 text-blue-600 border"
                      >
                        📄 {doc.name}
                        <span className="text-gray-400 text-xs ml-2">
                          ({new Date(doc.uploadedAt).toLocaleDateString()})
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Schedule Inspection Modal */}
      {showScheduleModal && selectedImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-semibold mb-4">Schedule Inspection</h3>
            <p className="text-gray-600 mb-4">
              Import #{selectedImport.import_number} - {selectedImport.users?.enterprise_name || selectedImport.name}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-3 py-2"
                  value={inspectionTime}
                  onChange={(e) => setInspectionTime(e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleInspection}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Schedule Inspection
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Approval Modal */}
      {showApprovalModal && selectedImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-semibold mb-4">Approve Import</h3>
            <p className="text-gray-600 mb-2">
              Import #{selectedImport.import_number} - {selectedImport.users?.enterprise_name || selectedImport.name}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Total CO2: {getTotalCO2(selectedImport)} CO2eq
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Digital Signature (draw below)
              </label>
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                className="border rounded-md w-full bg-white cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <button
                onClick={clearSignature}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Clear Signature
              </button>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  clearSignature();
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveImport}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Approve Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminImportsManagement;