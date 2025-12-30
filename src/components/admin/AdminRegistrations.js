// src/components/admin/AdminRegistrations.js
// FIXED: Corrected navigation path and removed debug output
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase/supabaseClient';

const AdminRegistrations = () => {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending'); // pending, approved, all
  const [selectedReg, setSelectedReg] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);

  useEffect(() => {
    fetchRegistrations();
  }, [filter]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching registrations with filter:', filter);

      let query = supabase
        .from('registrations')
        .select(`
          *,
          users:user_id (
            id,
            display_name,
            enterprise_name,
            email,
            telephone,
            business_address,
            importer_number
          )
        `)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('completed', false);
      } else if (filter === 'approved') {
        query = query.eq('completed', true);
      }

      const { data, error: fetchError } = await query;

      console.log('Query result:', { data, error: fetchError });

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        setError(`Database error: ${fetchError.message}`);
        return;
      }

      if (!data) {
        setRegistrations([]);
        return;
      }

      console.log('Registrations loaded:', data.length);
      setRegistrations(data);

    } catch (err) {
      console.error('Unexpected error:', err);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registration) => {
    setSelectedReg(registration);
    setShowApproveModal(true);
  };

  const confirmApproval = async (adminName, adminRole) => {
    try {
      // Get next cert number
      const { data: settings } = await supabase
        .from('settings')
        .select('registration_cert_no_counter')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      const nextCertNo = (settings?.registration_cert_no_counter || 1000) + 1;

      // Update registration
      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          completed: true,
          status: 'complete',
          cert_no: nextCertNo,
          admin_name: adminName,
          admin_role: adminRole,
          admin_signature_date: new Date().toISOString(),
          can_generate: true,
          download_ready: true
        })
        .eq('id', selectedReg.id);

      if (updateError) throw updateError;

      // Update settings counter
      await supabase
        .from('settings')
        .update({ registration_cert_no_counter: nextCertNo })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      // TODO: Send notification to user
      // TODO: Trigger PDF generation

      setShowApproveModal(false);
      setSelectedReg(null);
      fetchRegistrations();

    } catch (err) {
      console.error('Approval error:', err);
      setError(`Failed to approve: ${err.message}`);
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'N/A';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login/admin');
  };

  // Handle View click - navigate to the correct route
  const handleViewRegistration = (regId) => {
    console.log('Navigating to registration:', regId);
    // FIXED: Use plural "registrations" to match App.js route
    navigate(`/admin/registrations/${regId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link to="/admin/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <span className="text-gray-800 font-bold text-sm">NOU</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold">Registration Management</h1>
                <p className="text-xs text-gray-300">License and Quota Management System</p>
              </div>
            </Link>
          </div>
          <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm">
            Log Out
          </button>
        </div>
      </header>

      {/* Back link */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link to="/admin/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>

      <main className="max-w-7xl mx-auto px-4 pb-6">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Error Loading Registrations</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button 
              onClick={fetchRegistrations}
              className="mt-2 text-sm text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['pending', 'approved', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === f 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'pending' && registrations.filter(r => !r.completed).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {registrations.filter(r => !r.completed).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Registrations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gray-800 mx-auto"></div>
              <p className="mt-2 text-gray-500 text-sm">Loading registrations...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No {filter === 'all' ? '' : filter} registrations found.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enterprise</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {registrations.map(reg => (
                  <tr key={reg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{reg.users?.enterprise_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{reg.users?.display_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{reg.users?.email}</div>
                      <div className="text-xs text-gray-500">{reg.users?.telephone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{reg.year}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(reg.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        reg.completed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {reg.completed ? `Approved (${reg.cert_no})` : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {/* FIXED: Use handler function instead of inline navigate with wrong path */}
                      <button 
                        onClick={() => handleViewRegistration(reg.id)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        View
                      </button>
                      {!reg.completed && (
                        <button 
                          onClick={() => handleApprove(reg)}
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
          )}
        </div>
      </main>

      {/* Approval Modal */}
      {showApproveModal && selectedReg && (
        <ApprovalModal
          registration={selectedReg}
          onConfirm={confirmApproval}
          onCancel={() => { setShowApproveModal(false); setSelectedReg(null); }}
        />
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} National Ozone Unit, Ministry of Tourism & Sustainable Development
        </div>
      </footer>
    </div>
  );
};

// Approval Modal Component
const ApprovalModal = ({ registration, onConfirm, onCancel }) => {
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState('NOU Administrator');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!adminName.trim()) return;
    setSubmitting(true);
    await onConfirm(adminName, adminRole);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">Approve Registration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Approving registration for: <strong>{registration.users?.enterprise_name}</strong>
        </p>

        <div className="space-y-4">
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

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!adminName.trim() || submitting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Approving...' : 'Approve & Generate Certificate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRegistrations;