// src/components/admin/AdminSettings.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import AdminLayout from '../layout/AdminLayout';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    registration_open_override: false,
    registration_cert_no_counter: 0,
    import_license_counter: 0,
    next_importer_number: 0,
    technician_cert_no_counter: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const now = new Date();
  const registrationInfo = {
    currentMonth: now.getMonth(),
    isNormallyOpen: now.getMonth() === 11,
    registrationYear: (now.getFullYear() + 1).toString()
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          registration_open_override: data.registration_open_override || false,
          registration_cert_no_counter: data.registration_cert_no_counter || 0,
          import_license_counter: data.import_license_counter || 0,
          next_importer_number: data.next_importer_number || 1000,
          technician_cert_no_counter: data.technician_cert_no_counter || 0
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updateData = {
        registration_open_override: settings.registration_open_override,
        registration_cert_no_counter: settings.registration_cert_no_counter,
        import_license_counter: settings.import_license_counter,
        next_importer_number: settings.next_importer_number,
        technician_cert_no_counter: settings.technician_cert_no_counter
      };
      
      if (settings.id) {
        const { error } = await supabase
          .from('settings')
          .update(updateData)
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('settings')
          .insert(updateData)
          .select()
          .single();
        
        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }
      
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOverride = () => {
    setSettings(prev => ({
      ...prev,
      registration_open_override: !prev.registration_open_override
    }));
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
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
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500">Manage system-wide settings and configuration</p>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-red-700">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-green-700">{success}</p>
            </div>
          </div>
        )}
        
        {/* Registration Period Override */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Registration Period Control</h2>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Current Status</p>
                  <p className="font-medium text-lg">
                    {registrationInfo.isNormallyOpen ? (
                      <span className="text-green-600">December - Registration Normally Open</span>
                    ) : (
                      <span className="text-gray-600">Registration Normally Closed (Opens in December)</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Registration Year</p>
                  <p className="font-bold text-xl text-blue-600">{registrationInfo.registrationYear}</p>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Override Registration Period</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Enable this to allow registrations outside of December. Use this for special circumstances or testing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleOverride}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.registration_open_override ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.registration_open_override ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              
              {settings.registration_open_override && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex">
                    <svg className="h-5 w-5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Override is ACTIVE.</strong> Registration applications are allowed outside of December. 
                        Remember to disable this when you're done.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Counter Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Counter Settings</h2>
            <p className="text-sm text-gray-500 mt-1">These counters auto-increment when documents are generated</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Certificate Counter
              </label>
              <input
                type="number"
                value={settings.registration_cert_no_counter}
                onChange={(e) => handleInputChange('registration_cert_no_counter', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Next certificate will be #{settings.registration_cert_no_counter + 1}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Import License Counter
              </label>
              <input
                type="number"
                value={settings.import_license_counter}
                onChange={(e) => handleInputChange('import_license_counter', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Next license will be #{settings.import_license_counter + 1}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Importer Number
              </label>
              <input
                type="number"
                value={settings.next_importer_number}
                onChange={(e) => handleInputChange('next_importer_number', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Assigned to new importers without existing number</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Technician Certificate Counter
              </label>
              <input
                type="number"
                value={settings.technician_cert_no_counter}
                onChange={(e) => handleInputChange('technician_cert_no_counter', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Next technician cert will be #{settings.technician_cert_no_counter + 1}</p>
            </div>
          </div>
        </div>
        
        {/* System Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Current Year</p>
                <p className="text-2xl font-bold text-blue-900">{now.getFullYear()}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Registration Year</p>
                <p className="text-2xl font-bold text-green-900">{registrationInfo.registrationYear}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Current Month</p>
                <p className="text-2xl font-bold text-purple-900">
                  {now.toLocaleString('default', { month: 'short' })}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${settings.registration_open_override || registrationInfo.isNormallyOpen ? 'bg-green-50' : 'bg-gray-50'}`}>
                <p className={`text-sm font-medium ${settings.registration_open_override || registrationInfo.isNormallyOpen ? 'text-green-600' : 'text-gray-600'}`}>
                  Registration
                </p>
                <p className={`text-2xl font-bold ${settings.registration_open_override || registrationInfo.isNormallyOpen ? 'text-green-900' : 'text-gray-900'}`}>
                  {settings.registration_open_override || registrationInfo.isNormallyOpen ? 'OPEN' : 'CLOSED'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={fetchSettings}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : 'Save Settings'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;