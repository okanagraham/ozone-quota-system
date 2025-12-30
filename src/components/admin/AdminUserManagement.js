// src/components/admin/AdminUserManagement.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import AdminLayout from '../layout/AdminLayout';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    display_name: '',
    enterprise_name: '',
    business_address: '',
    business_location: '',
    telephone: '',
    importer_number: '',
    import_quota: '',
    balance_imports: '',
    role: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.enterprise_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.importer_number?.toString().includes(searchTerm);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      display_name: user.display_name || '',
      enterprise_name: user.enterprise_name || '',
      business_address: user.business_address || '',
      business_location: user.business_location || '',
      telephone: user.telephone || '',
      importer_number: user.importer_number || '',
      import_quota: user.import_quota || 0,
      balance_imports: user.balance_imports || 0,
      role: user.role || 'importer'
    });
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        display_name: editForm.display_name,
        enterprise_name: editForm.enterprise_name,
        business_address: editForm.business_address,
        business_location: editForm.business_location,
        telephone: editForm.telephone,
        importer_number: editForm.importer_number ? parseInt(editForm.importer_number) : null,
        import_quota: parseInt(editForm.import_quota) || 0,
        balance_imports: parseInt(editForm.balance_imports) || 0,
        role: editForm.role
      };
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, ...updateData } : u
      ));
      
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error saving user:', err);
      alert('Failed to save user: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'customs': return 'bg-green-100 text-green-800';
      case 'technician': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage user accounts, importer numbers, and quotas</p>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, enterprise, or importer number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="importer">Importers</option>
                <option value="admin">Admins</option>
                <option value="customs">Customs</option>
                <option value="technician">Technicians</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importer #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quota</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.display_name || 'No name'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">{user.enterprise_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-bold text-blue-600">
                        {user.importer_number || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role || 'importer'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.import_quota?.toLocaleString() || 0} CO2eq
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.balance_imports?.toLocaleString() || 0} CO2eq
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editForm.display_name}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enterprise Name</label>
                    <input
                      type="text"
                      value={editForm.enterprise_name}
                      onChange={(e) => handleInputChange('enterprise_name', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                    <input
                      type="text"
                      value={editForm.business_address}
                      onChange={(e) => handleInputChange('business_address', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Location</label>
                    <input
                      type="text"
                      value={editForm.business_location}
                      onChange={(e) => handleInputChange('business_location', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                    <input
                      type="text"
                      value={editForm.telephone}
                      onChange={(e) => handleInputChange('telephone', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="importer">Importer</option>
                      <option value="admin">Admin</option>
                      <option value="customs">Customs</option>
                      <option value="technician">Technician</option>
                    </select>
                  </div>
                </div>
                
                <hr className="my-4" />
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3">Importer Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importer Number
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="number"
                        value={editForm.importer_number}
                        onChange={(e) => handleInputChange('importer_number', e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm"
                        placeholder="e.g., 2977"
                      />
                      <p className="text-xs text-gray-500 mt-1">Unique identifier for the importer</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Import Quota (CO2eq)</label>
                      <input
                        type="number"
                        value={editForm.import_quota}
                        onChange={(e) => handleInputChange('import_quota', e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Total allowed CO2 equivalent</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Balance (CO2eq)</label>
                      <input
                        type="number"
                        value={editForm.balance_imports}
                        onChange={(e) => handleInputChange('balance_imports', e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Remaining quota balance</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUserManagement;