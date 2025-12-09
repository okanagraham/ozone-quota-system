// src/components/admin/AdminImportsManagement.js
// ALL DATABASE OPERATIONS USE SUPABASE - NOT FIREBASE
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase/supabaseClient';
import { ImportLicenseService } from '../../services/import/importLicenseService';

const AdminImportsManagement = () => {
  const { currentUser, userProfile } = useAuth();
  
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [selectedImport, setSelectedImport] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  
  // Schedule inspection state
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionTime, setInspectionTime] = useState('10:00');
  
  // Approval state
  const [signatureData, setSignatureData] = useState(null);
  const [signatureCanvas, setSignatureCanvas] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Fetch imports from Supabase
  useEffect(() => {
    fetchImports();
  }, [statusFilter, yearFilter]);
  
  const fetchImports = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('imports')
        .select('*')
        .order('submission_date', { ascending: false });
      
      if (yearFilter) {
        query = query.eq('import_year', yearFilter);
      }
      
      // Apply status filter
      if (statusFilter === 'awaiting_arrival') {
        query = query.eq('arrived', false);
      } else if (statusFilter === 'awaiting_inspection') {
        query = query.eq('arrived', true).is('inspection_date', null);
      } else if (statusFilter === 'inspection_scheduled') {
        query = query.not('inspection_date', 'is', null).eq('approved', false);
      } else if (statusFilter === 'approved') {
        query = query.eq('approved', true);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setImports(data || []);
    } catch (err) {
      console.error('Error fetching imports:', err);
      setError('Failed to load imports');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter imports by search term
  const filteredImports = imports.filter(imp => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return imp.name?.toLowerCase().includes(search) ||
           imp.import_number?.toString().includes(search);
  });
  
  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
  };
  
  // Get status badge
  const getStatusBadge = (imp) => {
    if (imp.approved) return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Approved</span>;
    if (imp.inspection_date) return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Inspection Scheduled</span>;
    if (imp.arrived) return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Awaiting Inspection</span>;
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Awaiting Arrival</span>;
  };
  
  // Calculate total CO2
  const getTotalCO2 = (imp) => {
    if (!imp.imported_items) return 0;
    return imp.imported_items.reduce((sum, item) => sum + parseFloat(item.co2_equivalent || 0), 0).toFixed(2);
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
        { name: userProfile?.display_name || 'Admin' }
      );
      
      setSuccess('Inspection scheduled successfully');
      setShowScheduleModal(false);
      setInspectionDate('');
      setInspectionTime('10:00');
      fetchImports();
    } catch (err) {
      console.error('Error scheduling inspection:', err);
      setError('Failed to schedule inspection');
    }
  };
  
  // Signature canvas handlers
  const initCanvas = (canvas) => {
    if (canvas) {
      setSignatureCanvas(canvas);
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  };
  
  const startDrawing = (e) => {
    if (!signatureCanvas) return;
    setIsDrawing(true);
    const ctx = signatureCanvas.getContext('2d');
    const rect = signatureCanvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  
  const draw = (e) => {
    if (!isDrawing || !signatureCanvas) return;
    const ctx = signatureCanvas.getContext('2d');
    const rect = signatureCanvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
    if (signatureCanvas) {
      setSignatureData(signatureCanvas.toDataURL());
    }
  };
  
  const clearSignature = () => {
    if (signatureCanvas) {
      const ctx = signatureCanvas.getContext('2d');
      ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
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
          name: userProfile?.display_name || 'Admin',
          role: userProfile?.admin_role || 'Administrator'
        },
        signatureData
      );
      
      setSuccess('Import approved successfully');
      setShowApprovalModal(false);
      setSignatureData(null);
      fetchImports();
    } catch (err) {
      console.error('Error approving import:', err);
      setError('Failed to approve import');
    }
  };
  
  // Stats
  const stats = {
    awaitingArrival: imports.filter(i => !i.arrived).length,
    awaitingInspection: imports.filter(i => i.arrived && !i.inspection_date).length,
    inspectionScheduled: imports.filter(i => i.inspection_date && !i.approved).length,
    approved: imports.filter(i => i.approved).length
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Import License Management</h1>
      
      {/* Messages */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search by name or number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-md px-3 py-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="awaiting_arrival">Awaiting Arrival</option>
          <option value="awaiting_inspection">Awaiting Inspection</option>
          <option value="inspection_scheduled">Inspection Scheduled</option>
          <option value="approved">Approved</option>
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="">All Years</option>
          {[2024, 2025, 2026].map(year => (
            <option key={year} value={year.toString()}>{year}</option>
          ))}
        </select>
        <button
          onClick={fetchImports}
          className="bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
      
      {/* Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Awaiting Arrival</div>
          <div className="text-2xl font-bold text-gray-800">{stats.awaitingArrival}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Awaiting Inspection</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.awaitingInspection}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Inspection Scheduled</div>
          <div className="text-2xl font-bold text-blue-600">{stats.inspectionScheduled}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        </div>
      </div>
      
      {/* Imports Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Import #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO2eq</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="7" className="text-center py-8">Loading...</td></tr>
            ) : filteredImports.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">No imports found</td></tr>
            ) : (
              filteredImports.map(imp => (
                <tr key={imp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{imp.import_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{imp.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{imp.import_year}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getTotalCO2(imp)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{imp.documents?.length || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(imp)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => { setSelectedImport(imp); setShowViewModal(true); }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </button>
                      {imp.arrived && !imp.inspection_date && (
                        <button
                          onClick={() => { setSelectedImport(imp); setShowScheduleModal(true); }}
                          className="text-yellow-600 hover:text-yellow-800 text-sm"
                        >
                          Schedule
                        </button>
                      )}
                      {imp.inspection_date && !imp.approved && (
                        <button
                          onClick={() => { setSelectedImport(imp); setShowApprovalModal(true); }}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* View Modal */}
      {showViewModal && selectedImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold">Import #{selectedImport.import_number}</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">Importer:</span> <strong>{selectedImport.name}</strong></div>
                <div><span className="text-gray-500">Year:</span> <strong>{selectedImport.import_year}</strong></div>
                <div><span className="text-gray-500">Submitted:</span> <strong>{formatDate(selectedImport.submission_date)}</strong></div>
                <div><span className="text-gray-500">Status:</span> {getStatusBadge(selectedImport)}</div>
                <div><span className="text-gray-500">Arrived:</span> <strong>{selectedImport.arrived ? 'Yes' : 'No'}</strong></div>
                <div><span className="text-gray-500">Total CO2:</span> <strong>{getTotalCO2(selectedImport)} CO2eq</strong></div>
              </div>
              
              <h4 className="font-semibold mt-4">Import Items</h4>
              <table className="w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left border">Refrigerant</th>
                    <th className="px-3 py-2 text-left border">Origin</th>
                    <th className="px-3 py-2 text-left border">Qty</th>
                    <th className="px-3 py-2 text-left border">Volume</th>
                    <th className="px-3 py-2 text-left border">CO2eq</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedImport.imported_items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 border">{item.ashrae}</td>
                      <td className="px-3 py-2 border">{item.export_country}</td>
                      <td className="px-3 py-2 border">{item.quantity}</td>
                      <td className="px-3 py-2 border">{item.volume} {item.designation}</td>
                      <td className="px-3 py-2 border">{item.co2_equivalent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {selectedImport.documents?.length > 0 && (
                <>
                  <h4 className="font-semibold mt-4">Documents ({selectedImport.documents.length})</h4>
                  <div className="space-y-2">
                    {selectedImport.documents.map((doc, idx) => (
                      <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" 
                         className="block p-3 bg-gray-50 rounded hover:bg-gray-100 text-blue-600 border">
                        📄 {doc.name}
                        <span className="text-gray-400 text-xs ml-2">({new Date(doc.uploadedAt).toLocaleDateString()})</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t flex justify-end">
              <button onClick={() => setShowViewModal(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
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
            <p className="text-gray-600 mb-4">Import #{selectedImport.import_number} - {selectedImport.name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={inspectionTime}
                  onChange={(e) => setInspectionTime(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 border rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleScheduleInspection} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
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
            <p className="text-gray-600 mb-2">Import #{selectedImport.import_number} - {selectedImport.name}</p>
            <p className="text-sm text-gray-500 mb-4">Total CO2: {getTotalCO2(selectedImport)} CO2eq</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Digital Signature</label>
              <canvas
                ref={initCanvas}
                width={400}
                height={150}
                className="border rounded-md w-full bg-white cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <button onClick={clearSignature} className="mt-2 text-sm text-blue-600 hover:underline">
                Clear Signature
              </button>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => { setShowApprovalModal(false); clearSignature(); }} className="px-4 py-2 border rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleApproveImport} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
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