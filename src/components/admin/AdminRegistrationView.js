// src/components/admin/AdminRegistrationView.js
// Enhanced: Edit account info, modify refrigerants, assign quota
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';

const AdminRegistrationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const signatureCanvasRef = useRef(null);
  const isDrawing = useRef(false);
  
  const [registration, setRegistration] = useState(null);
  const [allRefrigerants, setAllRefrigerants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Edit modes
  const [editingAccount, setEditingAccount] = useState(false);
  const [editingRefrigerants, setEditingRefrigerants] = useState(false);
  const [editingQuota, setEditingQuota] = useState(false);
  
  // Editable fields
  const [accountInfo, setAccountInfo] = useState({
    display_name: '',
    enterprise_name: '',
    business_address: '',
    business_location: '',
    telephone: '',
    email: ''
  });
  
  const [selectedRefrigerants, setSelectedRefrigerants] = useState([]);
  const [assignedQuota, setAssignedQuota] = useState(0);
  
  // Approval fields
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState('NOU Administrator');
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    fetchRegistration();
    fetchAllRefrigerants();
  }, [id]);

  // Initialize signature canvas
  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };
    
    const startDrawing = (e) => {
      e.preventDefault();
      isDrawing.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };
    
    const draw = (e) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSignature(true);
    };
    
    const stopDrawing = () => {
      isDrawing.current = false;
    };
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    
    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [loading]);

  const fetchRegistration = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('registrations')
        .select(`
          *,
          users:user_id (
            id,
            display_name,
            enterprise_name,
            business_address,
            business_location,
            telephone,
            email,
            import_quota,
            balance_imports,
            cumulative_imports,
            importer_number
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      setRegistration(data);
      
      // Initialize editable fields
      if (data.users) {
        setAccountInfo({
          display_name: data.users.display_name || '',
          enterprise_name: data.users.enterprise_name || '',
          business_address: data.users.business_address || '',
          business_location: data.users.business_location || '',
          telephone: data.users.telephone || '',
          email: data.users.email || ''
        });
        setAssignedQuota(data.users.import_quota || 0);
      }
      
      // Initialize selected refrigerants
      setSelectedRefrigerants(data.refrigerants || []);
      
    } catch (err) {
      console.error('Error fetching registration:', err);
      setError('Failed to load registration details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRefrigerants = async () => {
    try {
      const { data, error } = await supabase
        .from('refrigerants')
        .select('*')
        .order('ashrae');
      
      if (error) throw error;
      setAllRefrigerants(data || []);
    } catch (err) {
      console.error('Error fetching refrigerants:', err);
    }
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const getSignatureDataUrl = () => {
    const canvas = signatureCanvasRef.current;
    return canvas ? canvas.toDataURL('image/png') : null;
  };

  // Save account information
  const handleSaveAccountInfo = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          display_name: accountInfo.display_name,
          enterprise_name: accountInfo.enterprise_name,
          business_address: accountInfo.business_address,
          business_location: accountInfo.business_location,
          telephone: accountInfo.telephone
          // Note: email is not updated as it's tied to auth
        })
        .eq('id', registration.user_id);
      
      if (updateError) throw updateError;
      
      setEditingAccount(false);
      setSuccessMessage('Account information updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchRegistration();
      
    } catch (err) {
      console.error('Error updating account:', err);
      setError('Failed to update account information');
    } finally {
      setProcessing(false);
    }
  };

  // Toggle refrigerant selection
  const toggleRefrigerant = (refrigerant) => {
    const exists = selectedRefrigerants.find(r => r.ashrae === refrigerant.ashrae);
    
    if (exists) {
      setSelectedRefrigerants(selectedRefrigerants.filter(r => r.ashrae !== refrigerant.ashrae));
    } else {
      setSelectedRefrigerants([...selectedRefrigerants, {
        ashrae: refrigerant.ashrae,
        refrigerant: refrigerant.chemical_name,
        hs_code: refrigerant.hs_code,
        quota: refrigerant.gwp_value
      }]);
    }
  };

  // Save refrigerant changes
  const handleSaveRefrigerants = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ refrigerants: selectedRefrigerants })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      setEditingRefrigerants(false);
      setSuccessMessage('Approved refrigerants updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchRegistration();
      
    } catch (err) {
      console.error('Error updating refrigerants:', err);
      setError('Failed to update refrigerants');
    } finally {
      setProcessing(false);
    }
  };

  // Save quota assignment
  const handleSaveQuota = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          import_quota: assignedQuota,
          balance_imports: assignedQuota // Reset balance to full quota
        })
        .eq('id', registration.user_id);
      
      if (updateError) throw updateError;
      
      setEditingQuota(false);
      setSuccessMessage('Import quota assigned successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchRegistration();
      
    } catch (err) {
      console.error('Error updating quota:', err);
      setError('Failed to update quota');
    } finally {
      setProcessing(false);
    }
  };

  // Approve registration
  const handleApprove = async () => {
    if (!adminName) {
      setError('Please enter your name before approving');
      return;
    }
    
    if (!hasSignature) {
      setError('Please provide your signature before approving');
      return;
    }
    
    if (selectedRefrigerants.length === 0) {
      setError('Please select at least one refrigerant for this registration');
      return;
    }
    
    if (assignedQuota <= 0) {
      setError('Please assign a quota before approving');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Get next certificate number
      const { data: settings } = await supabase
        .from('settings')
        .select('registration_cert_no_counter')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      const certNo = (settings?.registration_cert_no_counter || 1000) + 1;

      // Upload admin signature
      const signatureDataUrl = getSignatureDataUrl();
      let signatureUrl = null;
      
      if (signatureDataUrl) {
        const base64Data = signatureDataUrl.split(',')[1];
        const signatureFileName = `registration_signatures/${id}_admin_${Date.now()}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(signatureFileName, decode(base64Data), {
            contentType: 'image/png',
            upsert: true
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(signatureFileName);
          signatureUrl = publicUrl;
        }
      }

      // Update registration
      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          completed: true,
          refrigerants: selectedRefrigerants,
          admin_signature: signatureUrl,
          admin_role: adminRole,
          admin_name: adminName,
          admin_signature_date: new Date().toISOString(),
          cert_no: certNo,
          next_importer_number: 0,
          status: 'complete',
          can_generate: true,
          download_ready: true
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update user's quota
      await supabase
        .from('users')
        .update({
          import_quota: assignedQuota,
          balance_imports: assignedQuota,
          cumulative_imports: 0
        })
        .eq('id', registration.user_id);

      // Update certificate counter
      await supabase
        .from('settings')
        .update({ registration_cert_no_counter: certNo })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      setSuccessMessage('Registration approved successfully!');
      setTimeout(() => navigate('/admin/registrations'), 2000);

    } catch (err) {
      console.error('Error approving registration:', err);
      setError('Failed to approve registration. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Please enter a reason for rejection:');
    if (!reason) return;

    try {
      setProcessing(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          status: 'Rejected',
          rejection_reason: reason,
          completed: false
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setSuccessMessage('Registration rejected');
      setTimeout(() => navigate('/admin/registrations'), 2000);

    } catch (err) {
      console.error('Error rejecting registration:', err);
      setError('Failed to reject registration');
    } finally {
      setProcessing(false);
    }
  };

  // Helper to decode base64
  const decode = (base64) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  if (loading) {
    return (
      <MainLayout title="Admin - Registration Details">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!registration) {
    return (
      <MainLayout title="Admin - Registration Details">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Registration not found.</p>
            <button onClick={() => navigate('/admin/registrations')} className="mt-2 text-blue-600 hover:underline">
              ← Back to Registrations
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isPending = !registration.completed && registration.status !== 'Rejected';

  return (
    <MainLayout title="Admin - Registration Details">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate('/admin/registrations')} className="text-blue-600 hover:underline text-sm mb-2">
              ← Back to Registrations
            </button>
            <h2 className="text-2xl font-semibold text-gray-800">
              Registration Application - {registration.year}
            </h2>
            <p className="text-sm text-gray-500">
              Importer #{registration.users?.importer_number || 'Not assigned'} • {registration.users?.enterprise_name}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            registration.completed ? 'bg-green-100 text-green-800' :
            registration.status === 'Rejected' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {registration.status}
          </span>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Account Information Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Importer Information</h3>
            {isPending && !editingAccount && (
              <button 
                onClick={() => setEditingAccount(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Edit
              </button>
            )}
          </div>
          
          {editingAccount ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={accountInfo.display_name}
                    onChange={(e) => setAccountInfo({...accountInfo, display_name: e.target.value})}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enterprise Name</label>
                  <input
                    type="text"
                    value={accountInfo.enterprise_name}
                    onChange={(e) => setAccountInfo({...accountInfo, enterprise_name: e.target.value})}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                  <input
                    type="text"
                    value={accountInfo.business_address}
                    onChange={(e) => setAccountInfo({...accountInfo, business_address: e.target.value})}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={accountInfo.business_location}
                    onChange={(e) => setAccountInfo({...accountInfo, business_location: e.target.value})}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                  <input
                    type="text"
                    value={accountInfo.telephone}
                    onChange={(e) => setAccountInfo({...accountInfo, telephone: e.target.value})}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Read-only)</label>
                  <input
                    type="email"
                    value={accountInfo.email}
                    disabled
                    className="w-full border rounded-md px-3 py-2 bg-gray-100"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setEditingAccount(false);
                    setAccountInfo({
                      display_name: registration.users?.display_name || '',
                      enterprise_name: registration.users?.enterprise_name || '',
                      business_address: registration.users?.business_address || '',
                      business_location: registration.users?.business_location || '',
                      telephone: registration.users?.telephone || '',
                      email: registration.users?.email || ''
                    });
                  }}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAccountInfo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={processing}
                >
                  {processing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Contact Name</label>
                <p className="font-medium">{registration.users?.display_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Enterprise Name</label>
                <p className="font-medium">{registration.users?.enterprise_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Business Address</label>
                <p className="font-medium">{registration.users?.business_address || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Location</label>
                <p className="font-medium">{registration.users?.business_location || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Telephone</label>
                <p className="font-medium">{registration.users?.telephone || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium">{registration.users?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Business Type</label>
                <p className="font-medium">{registration.retail ? 'Retail' : 'Non-Retail'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Quota Assignment Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Import Quota Assignment</h3>
            {isPending && !editingQuota && (
              <button 
                onClick={() => setEditingQuota(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {assignedQuota > 0 ? 'Edit' : 'Assign Quota'}
              </button>
            )}
          </div>
          
          {editingQuota ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Import Quota (CO2 equivalent)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={assignedQuota}
                    onChange={(e) => setAssignedQuota(parseInt(e.target.value) || 0)}
                    className="w-48 border rounded-md px-3 py-2"
                    min="0"
                    step="1000"
                  />
                  <span className="text-gray-500">CO2eq</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This quota will be available for import licenses starting January 1, {registration.year}
                </p>
              </div>
              
              {/* Quick quota buttons */}
              <div className="flex flex-wrap gap-2">
                {[10000, 50000, 100000, 250000, 500000, 1000000].map(q => (
                  <button
                    key={q}
                    onClick={() => setAssignedQuota(q)}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      assignedQuota === q ? 'bg-blue-100 border-blue-500 text-blue-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    {q.toLocaleString()}
                  </button>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setEditingQuota(false);
                    setAssignedQuota(registration.users?.import_quota || 0);
                  }}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuota}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={processing}
                >
                  {processing ? 'Saving...' : 'Save Quota'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-800">{assignedQuota.toLocaleString()}</p>
                <p className="text-sm text-gray-500">CO2 equivalent quota for {registration.year}</p>
              </div>
              {assignedQuota === 0 && isPending && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  Quota not assigned
                </span>
              )}
            </div>
          )}
        </div>

        {/* Refrigerants Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold text-lg">Approved Refrigerants</h3>
            {isPending && !editingRefrigerants && (
              <button 
                onClick={() => setEditingRefrigerants(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Edit Selection
              </button>
            )}
          </div>
          
          {editingRefrigerants ? (
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Select which refrigerants this importer is approved to import. 
                Uncheck any that should not be permitted.
              </p>
              
              <div className="max-h-96 overflow-y-auto border rounded-md">
                {allRefrigerants.map((ref) => {
                  const isSelected = selectedRefrigerants.some(r => r.ashrae === ref.ashrae);
                  const wasRequested = registration.refrigerants?.some(r => r.ashrae === ref.ashrae);
                  
                  return (
                    <div 
                      key={ref.id} 
                      className={`flex items-center p-3 border-b last:border-b-0 hover:bg-gray-50 ${
                        wasRequested ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRefrigerant(ref)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <span className="font-medium">{ref.ashrae}</span>
                          {wasRequested && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              Requested
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{ref.chemical_name}</span>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-500">HS: {ref.hs_code}</div>
                        <div className="text-gray-500">GWP: {ref.gwp_value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {selectedRefrigerants.length} refrigerant(s) selected
                </span>
                <div className="space-x-3">
                  <button
                    onClick={() => {
                      setEditingRefrigerants(false);
                      setSelectedRefrigerants(registration.refrigerants || []);
                    }}
                    className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={processing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRefrigerants}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={processing}
                  >
                    {processing ? 'Saving...' : 'Save Selection'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ASHRAE</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chemical Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HS Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GWP Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedRefrigerants.length > 0 ? (
                    selectedRefrigerants.map((ref, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-sm font-medium">{ref.ashrae}</td>
                        <td className="px-4 py-3 text-sm">{ref.refrigerant}</td>
                        <td className="px-4 py-3 text-sm">{ref.hs_code}</td>
                        <td className="px-4 py-3 text-sm">{ref.quota}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                        No refrigerants selected
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Approval Section - Only show if pending */}
        {isPending && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">Admin Approval</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authorizing Officer Name *
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title/Role
                </label>
                <input
                  type="text"
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Digital Signature *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <canvas
                  ref={signatureCanvasRef}
                  width={400}
                  height={150}
                  className="border border-gray-300 rounded bg-white cursor-crosshair"
                  style={{ touchAction: 'none' }}
                />
                <button
                  onClick={clearSignature}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear Signature
                </button>
              </div>
            </div>

            {/* Approval checklist */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Approval Checklist:</h4>
              <ul className="space-y-1 text-sm">
                <li className={selectedRefrigerants.length > 0 ? 'text-green-600' : 'text-red-600'}>
                  {selectedRefrigerants.length > 0 ? '✓' : '✗'} Refrigerants selected ({selectedRefrigerants.length})
                </li>
                <li className={assignedQuota > 0 ? 'text-green-600' : 'text-red-600'}>
                  {assignedQuota > 0 ? '✓' : '✗'} Quota assigned ({assignedQuota.toLocaleString()} CO2eq)
                </li>
                <li className={adminName ? 'text-green-600' : 'text-red-600'}>
                  {adminName ? '✓' : '✗'} Admin name provided
                </li>
                <li className={hasSignature ? 'text-green-600' : 'text-red-600'}>
                  {hasSignature ? '✓' : '✗'} Signature provided
                </li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleApprove}
                disabled={processing || !adminName || !hasSignature || selectedRefrigerants.length === 0 || assignedQuota <= 0}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Approve Registration'}
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Reject Registration'}
              </button>
            </div>
          </div>
        )}

        {/* Approval Details - Only show if approved */}
        {registration.completed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-800 mb-4">Registration Approved</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-600">Certificate No:</label>
                <p className="font-medium">{registration.cert_no}</p>
              </div>
              <div>
                <label className="text-gray-600">Approved By:</label>
                <p className="font-medium">{registration.admin_name}</p>
              </div>
              <div>
                <label className="text-gray-600">Title:</label>
                <p className="font-medium">{registration.admin_role}</p>
              </div>
              <div>
                <label className="text-gray-600">Approval Date:</label>
                <p className="font-medium">{new Date(registration.admin_signature_date).toLocaleDateString()}</p>
              </div>
            </div>
            {registration.admin_signature && (
              <div className="mt-4">
                <label className="text-gray-600 text-sm">Signature:</label>
                <img src={registration.admin_signature} alt="Admin Signature" className="mt-1 h-16" />
              </div>
            )}
          </div>
        )}

        {/* Rejected Details */}
        {registration.status === 'Rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-semibold text-red-800 mb-2">Registration Rejected</h3>
            {registration.rejection_reason && (
              <p className="text-sm text-red-700">Reason: {registration.rejection_reason}</p>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminRegistrationView;