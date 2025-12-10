// src/components/admin/AdminRefrigerants.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext_working';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';

const AdminRefrigerants = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [refrigerants, setRefrigerants] = useState([]);
  const [filteredRefrigerants, setFilteredRefrigerants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedRefrigerant, setSelectedRefrigerant] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    ashrae: '',
    chemical_name: '',
    type: '',
    hs_code: '',
    gwp_value: '',
    restricted: false
  });
  const [saving, setSaving] = useState(false);
  
  // Redirect non-admins
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [userProfile, navigate]);
  
  // Fetch refrigerants
  useEffect(() => {
    fetchRefrigerants();
  }, []);
  
  // Filter refrigerants
  useEffect(() => {
    let filtered = refrigerants;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(ref => 
        ref.ashrae?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.chemical_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.hs_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(ref => ref.type === typeFilter);
    }
    
    setFilteredRefrigerants(filtered);
  }, [searchTerm, typeFilter, refrigerants]);
  
  const fetchRefrigerants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('refrigerants')
        .select('*')
        .order('ashrae', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      setRefrigerants(data || []);
      setFilteredRefrigerants(data || []);
    } catch (err) {
      console.error('Error fetching refrigerants:', err);
      setError('Failed to load refrigerants');
    } finally {
      setLoading(false);
    }
  };
  
  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      ashrae: '',
      chemical_name: '',
      type: '',
      hs_code: '',
      gwp_value: '',
      restricted: false
    });
    setSelectedRefrigerant(null);
    setShowModal(true);
  };
  
  const openEditModal = (refrigerant) => {
    setModalMode('edit');
    setFormData({
      ashrae: refrigerant.ashrae || '',
      chemical_name: refrigerant.chemical_name || '',
      type: refrigerant.type || '',
      hs_code: refrigerant.hs_code || '',
      gwp_value: refrigerant.gwp_value?.toString() || '',
      restricted: refrigerant.restricted || false
    });
    setSelectedRefrigerant(refrigerant);
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    setSelectedRefrigerant(null);
    setFormData({
      ashrae: '',
      chemical_name: '',
      type: '',
      hs_code: '',
      gwp_value: '',
      restricted: false
    });
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.ashrae || !formData.chemical_name || !formData.gwp_value) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const refrigerantData = {
        ashrae: formData.ashrae.trim(),
        chemical_name: formData.chemical_name.trim(),
        type: formData.type.trim(),
        hs_code: formData.hs_code.trim(),
        gwp_value: parseFloat(formData.gwp_value),
        restricted: formData.restricted,
        updated_at: new Date().toISOString()
      };
      
      if (modalMode === 'add') {
        // Add new refrigerant
        const { error: insertError } = await supabase
          .from('refrigerants')
          .insert([refrigerantData]);
        
        if (insertError) throw insertError;
      } else {
        // Update existing refrigerant
        const { error: updateError } = await supabase
          .from('refrigerants')
          .update(refrigerantData)
          .eq('id', selectedRefrigerant.id);
        
        if (updateError) throw updateError;
      }
      
      await fetchRefrigerants();
      closeModal();
      alert(`Refrigerant ${modalMode === 'add' ? 'added' : 'updated'} successfully`);
    } catch (err) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'updating'} refrigerant:`, err);
      setError(`Failed to ${modalMode === 'add' ? 'add' : 'update'} refrigerant: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (refrigerantId) => {
    if (!window.confirm('Are you sure you want to delete this refrigerant? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error: deleteError } = await supabase
        .from('refrigerants')
        .delete()
        .eq('id', refrigerantId);
      
      if (deleteError) throw deleteError;
      
      await fetchRefrigerants();
      alert('Refrigerant deleted successfully');
    } catch (err) {
      console.error('Error deleting refrigerant:', err);
      setError('Failed to delete refrigerant: ' + err.message);
    }
  };
  
  // Get unique types for filter
  const uniqueTypes = [...new Set(refrigerants.map(r => r.type).filter(Boolean))].sort();
  
  if (loading) {
    return (
      <MainLayout title="Manage Refrigerants">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="Manage Refrigerants">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-1">Manage Refrigerants</h2>
            <p className="text-sm text-gray-500">Manage the refrigerants database</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Add Refrigerant
            </button>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
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
                placeholder="Search refrigerants by ASHRAE, name, or HS code..."
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Type Filter */}
          <div className="w-64">
            <select
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded border border-gray-200">
            <div className="text-sm text-gray-500">Total Refrigerants</div>
            <div className="text-2xl font-bold text-gray-900">{refrigerants.length}</div>
          </div>
          <div className="bg-white p-4 rounded border border-gray-200">
            <div className="text-sm text-gray-500">Filtered Results</div>
            <div className="text-2xl font-bold text-gray-900">{filteredRefrigerants.length}</div>
          </div>
          <div className="bg-white p-4 rounded border border-gray-200">
            <div className="text-sm text-gray-500">Restricted</div>
            <div className="text-2xl font-bold text-red-600">
              {refrigerants.filter(r => r.restricted).length}
            </div>
          </div>
        </div>
        
        {/* Refrigerants Table */}
        <div className="bg-white shadow-sm rounded-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ASHRAE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chemical Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HS Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GWP Value
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
                {filteredRefrigerants.length > 0 ? (
                  filteredRefrigerants.map((refrigerant) => (
                    <tr key={refrigerant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {refrigerant.ashrae}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {refrigerant.chemical_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {refrigerant.type || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {refrigerant.hs_code || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {refrigerant.gwp_value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {refrigerant.restricted ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Restricted
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openEditModal(refrigerant)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(refrigerant.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      {searchTerm || typeFilter !== 'all' 
                        ? 'No refrigerants found matching your filters' 
                        : 'No refrigerants in database'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {modalMode === 'add' ? 'Add New Refrigerant' : 'Edit Refrigerant'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ASHRAE Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ASHRAE Number <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="ashrae"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.ashrae}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., R-134a"
                      />
                    </div>
                    
                    {/* Chemical Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chemical Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="chemical_name"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.chemical_name}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., 1,1,1,2-Tetrafluoroethane"
                      />
                    </div>
                    
                    {/* Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <input
                        type="text"
                        name="type"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.type}
                        onChange={handleInputChange}
                        placeholder="e.g., HFC, CFC, HCFC"
                      />
                    </div>
                    
                    {/* HS Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        HS Code
                      </label>
                      <input
                        type="text"
                        name="hs_code"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.hs_code}
                        onChange={handleInputChange}
                        placeholder="e.g., 2903.44"
                      />
                    </div>
                    
                    {/* GWP Value */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GWP Value <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        name="gwp_value"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.gwp_value}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        placeholder="e.g., 1430"
                      />
                    </div>
                    
                    {/* Restricted */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="restricted"
                        id="restricted"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={formData.restricted}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="restricted" className="ml-2 block text-sm text-gray-900">
                        Mark as restricted
                      </label>
                    </div>
                  </div>
                  
                  <p className="mt-4 text-xs text-gray-500">
                    <span className="text-red-600">*</span> Required fields
                  </p>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : (modalMode === 'add' ? 'Add Refrigerant' : 'Update Refrigerant')}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default AdminRefrigerants;