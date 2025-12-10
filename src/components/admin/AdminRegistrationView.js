// src/components/admin/AdminRegistrationView.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext_working';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';

const AdminRegistrationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [adminSignature, setAdminSignature] = useState('');
  const [adminName, setAdminName] = useState('');

  // Redirect non-admins
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [userProfile, navigate]);

  useEffect(() => {
    fetchRegistration();
  }, [id]);

  const fetchRegistration = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('registrations')
        .select(`
          *,
          users:user_id (
            display_name,
            enterprise_name,
            business_address,
            business_location,
            telephone,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setRegistration(data);
    } catch (err) {
      console.error('Error fetching registration:', err);
      setError('Failed to load registration details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!adminName || !adminSignature) {
      setError('Please provide admin name and signature before approving.');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Get next certificate number
      const { data: settings } = await supabase
        .from('settings')
        .select('registration_cert_no_counter')
        .single();

      const certNo = (settings?.registration_cert_no_counter || 0) + 1;

      // Upload admin signature
      const signatureBlob = await fetch(adminSignature).then(r => r.blob());
      const signatureFileName = `registration_signatures/${id}_admin.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(signatureFileName, signatureBlob, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(signatureFileName);

      // Update registration
      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          completed: true,
          admin_signature: publicUrl,
          admin_role: 'NOU Admin',
          admin_name: adminName,
          admin_signature_date: new Date().toISOString(),
          cert_no: certNo,
          next_importer_number: 0,
          status: 'complete',
          can_generate: true
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update certificate counter
      await supabase
        .from('settings')
        .update({ registration_cert_no_counter: certNo });

      alert('Registration approved successfully!');
      navigate('/admin/registrations');

    } catch (err) {
      console.error('Error approving registration:', err);
      setError('Failed to approve registration. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this registration?')) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          status: 'Rejected',
          completed: false
        })
        .eq('id', id);

      if (updateError) throw updateError;

      alert('Registration rejected.');
      navigate('/admin/registrations');

    } catch (err) {
      console.error('Error rejecting registration:', err);
      setError('Failed to reject registration. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Admin - Registration Details">
        <div className="max-w-4xl mx-auto px-4 py-6">
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
        <div className="max-w-4xl mx-auto px-4 py-6">
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

  return (
    <MainLayout title="Admin - Registration Details">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate('/admin/registrations')} className="text-blue-600 hover:underline text-sm mb-2">
              ← Back to Registrations
            </button>
            <h2 className="text-2xl font-semibold text-gray-800">
              Registration Application - {registration.year}
            </h2>
            <p className="text-sm text-gray-500">Enterprise: {registration.users?.enterprise_name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            registration.completed ? 'bg-green-100 text-green-800' :
            registration.status === 'Rejected' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {registration.status}
          </span>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Importer Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-semibold mb-4">Importer Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Contact Name</label>
              <p className="font-medium">{registration.users?.display_name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Enterprise Name</label>
              <p className="font-medium">{registration.users?.enterprise_name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Business Address</label>
              <p className="font-medium">{registration.users?.business_address}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Location</label>
              <p className="font-medium">{registration.users?.business_location}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Telephone</label>
              <p className="font-medium">{registration.users?.telephone}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="font-medium">{registration.users?.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Business Type</label>
              <p className="font-medium">{registration.retail ? 'Retail' : 'Non-Retail'}</p>
            </div>
          </div>
        </div>

        {/* Requested Refrigerants */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Requested Refrigerants</h3>
          </div>
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
                {(registration.refrigerants || []).map((ref, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-sm">{ref.ashrae}</td>
                    <td className="px-4 py-3 text-sm">{ref.refrigerant}</td>
                    <td className="px-4 py-3 text-sm">{ref.hs_code}</td>
                    <td className="px-4 py-3 text-sm">{ref.quota}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval Section - Only show if pending */}
        {!registration.completed && registration.status !== 'Rejected' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">Admin Approval</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your name"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Digital Signature</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Draw your signature:</p>
                <canvas
                  id="signature-pad"
                  width="400"
                  height="150"
                  className="border border-gray-300 rounded bg-white"
                ></canvas>
                <button
                  onClick={() => {
                    const canvas = document.getElementById('signature-pad');
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    setAdminSignature('');
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear Signature
                </button>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
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
            <h3 className="font-semibold text-green-800 mb-2">Registration Approved</h3>
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
                <label className="text-gray-600">Approval Date:</label>
                <p className="font-medium">{new Date(registration.admin_signature_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminRegistrationView;