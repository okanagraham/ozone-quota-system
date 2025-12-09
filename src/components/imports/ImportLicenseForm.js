// src/components/imports/ImportLicenseForm.js
// FIXED: Removed "shipment arrived" section - that's for EDITING, not creating
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDemoMode } from '../../context/DemoModeContext';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';

const ImportLicenseForm = () => {
  const { currentUser, userProfile } = useAuth();
  const { isDemoMode, canCreateImportLicense, getDemoRegistration, getDemoApprovedRefrigerants, simulateSubmit } = useDemoMode();
  const navigate = useNavigate();
  
  const [approvedRefrigerants, setApprovedRefrigerants] = useState([]);
  const [registration, setRegistration] = useState(null);
  const [quotaInfo, setQuotaInfo] = useState({ total: 0, used: 0, remaining: 0 });
  const [importItems, setImportItems] = useState([
    { id: Date.now().toString(), ashrae: '', export_country: '', quantity: '', volume: '', designation: 'kg' }
  ]);
  const [estimatedCO2, setEstimatedCO2] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const unitOptions = [
    { value: 'g', label: 'Grams (g)', factor: 0.001 },
    { value: 'kg', label: 'Kilograms (kg)', factor: 1 },
    { value: 'lb', label: 'Pounds (lb)', factor: 0.453592 },
    { value: 'oz', label: 'Ounces (oz)', factor: 0.0283495 },
    { value: 'ton', label: 'Metric Tons', factor: 1000 }
  ];

  const countryOptions = [
    'USA', 'China', 'Germany', 'Japan', 'United Kingdom', 'France', 
    'Netherlands', 'Canada', 'Mexico', 'Brazil', 'India', 'Other'
  ];

  useEffect(() => {
    fetchInitialData();
  }, [currentUser, isDemoMode]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isDemoMode) {
        setRegistration(getDemoRegistration());
        setApprovedRefrigerants(getDemoApprovedRefrigerants());
        setQuotaInfo({ total: 50000, used: 15000, remaining: 35000 });
        setLoading(false);
        return;
      }

      if (!currentUser) return;

      // Fetch active registration for current year
      const currentYear = new Date().getFullYear().toString();
      const { data: regData, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('year', currentYear)
        .eq('completed', true)
        .eq('status', 'complete')
        .single();

      if (regError && regError.code !== 'PGRST116') {
        console.error('Registration fetch error:', regError);
      }

      if (regData) {
        setRegistration(regData);
        setApprovedRefrigerants(regData.refrigerants || []);
      }

      // Fetch user quota info
      const { data: userData } = await supabase
        .from('users')
        .select('import_quota, cumulative_imports, balance_imports')
        .eq('id', currentUser.id)
        .single();

      if (userData) {
        setQuotaInfo({
          total: userData.import_quota || 0,
          used: userData.cumulative_imports || 0,
          remaining: userData.balance_imports || 0
        });
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate CO2 equivalent
  useEffect(() => {
    let total = 0;
    importItems.forEach(item => {
      if (item.ashrae && item.volume && item.quantity) {
        const refrigerant = approvedRefrigerants.find(r => r.ashrae === item.ashrae);
        if (refrigerant) {
          const unit = unitOptions.find(u => u.value === item.designation);
          const volumeKg = parseFloat(item.volume) * (unit?.factor || 1);
          const gwp = refrigerant.quota || refrigerant.gwp_value || 0;
          total += volumeKg * gwp * parseInt(item.quantity);
        }
      }
    });
    setEstimatedCO2(total);
  }, [importItems, approvedRefrigerants]);

  const addImportItem = () => {
    setImportItems([...importItems, { 
      id: Date.now().toString(), ashrae: '', export_country: '', quantity: '', volume: '', designation: 'kg' 
    }]);
  };

  const removeImportItem = (id) => {
    if (importItems.length > 1) {
      setImportItems(importItems.filter(item => item.id !== id));
    }
  };

  const updateImportItem = (id, field, value) => {
    setImportItems(importItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const hasRegistration = isDemoMode ? true : !!registration;
    if (!hasRegistration) {
      setError('You must have an active registration to submit an import license.');
      return;
    }

    if (importItems.some(item => !item.ashrae || !item.export_country || !item.quantity || !item.volume)) {
      setError('Please fill out all fields for each import item.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (isDemoMode) {
        await simulateSubmit('import_license', { items: importItems, co2: estimatedCO2 });
        setSuccess(true);
        setTimeout(() => navigate('/imports'), 2000);
        return;
      }

      // Calculate CO2 for each item
      const itemsWithCO2 = importItems.map(item => {
        const refrigerant = approvedRefrigerants.find(r => r.ashrae === item.ashrae);
        const unit = unitOptions.find(u => u.value === item.designation);
        const volumeKg = parseFloat(item.volume) * (unit?.factor || 1);
        const gwp = refrigerant?.quota || refrigerant?.gwp_value || 0;
        const co2 = volumeKg * gwp * parseInt(item.quantity);
        
        return {
          ...item,
          chemical_name: refrigerant?.refrigerant || refrigerant?.chemical_name || '',
          hs_code: refrigerant?.hs_code || '',
          gwp_value: gwp,
          co2_equivalent: co2.toFixed(2),
          volume_mt: (volumeKg * parseInt(item.quantity) / 1000).toFixed(4)
        };
      });

      // Get next import number
      const { data: settings } = await supabase
        .from('settings')
        .select('imports')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      const nextImportNumber = (settings?.imports || 1000) + 1;

      // Create import record
      const { error: insertError } = await supabase
        .from('imports')
        .insert({
          user_id: currentUser.id,
          registration_id: registration.id,
          name: userProfile?.display_name || '',
          enterprise_name: userProfile?.enterprise_name || '',
          import_year: new Date().getFullYear().toString(),
          import_number: nextImportNumber,
          imported_items: itemsWithCO2,
          total_co2: estimatedCO2,
          status: 'Pending Review',
          pending: true,
          arrived: false,
          approved: false,
          inspected: false,
          invoice_uploaded: false
        });

      if (insertError) throw insertError;

      // Update settings counter
      await supabase
        .from('settings')
        .update({ imports: nextImportNumber })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      // TODO: Send notification to admin

      setSuccess(true);
      setTimeout(() => navigate('/imports'), 2000);

    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = isDemoMode ? canCreateImportLicense(false) : !!registration;
  const willExceedQuota = !isDemoMode && estimatedCO2 > quotaInfo.remaining;

  if (loading) {
    return (
      <MainLayout title="License and Quota Management System">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="License and Quota Management System">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">New Import License Application</h2>
          <p className="text-sm text-gray-500 mt-1">Request permission to import controlled substances</p>
        </div>

        {/* No Registration Warning */}
        {!canSubmit && !isDemoMode && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-800">You need an active registration for {new Date().getFullYear()} to submit import licenses.</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
            <p className="text-green-800">Import license submitted successfully! Redirecting...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Quota Info */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-medium text-gray-800 mb-3">Your Import Quota</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-lg font-semibold">{quotaInfo.total.toLocaleString()} CO2eq</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Used</p>
              <p className="text-lg font-semibold">{quotaInfo.used.toLocaleString()} CO2eq</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="text-lg font-semibold text-blue-600">{quotaInfo.remaining.toLocaleString()} CO2eq</p>
            </div>
          </div>
        </div>

        {/* Import Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium">Import Items</h3>
            <p className="text-sm text-gray-500">Add the substances you wish to import</p>
          </div>

          <div className="p-6 space-y-4">
            {importItems.map((item, index) => (
              <div key={item.id} className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-gray-700">Item #{index + 1}</span>
                  {importItems.length > 1 && (
                    <button type="button" onClick={() => removeImportItem(item.id)} className="text-red-600 text-sm hover:text-red-800">
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Refrigerant</label>
                    <select
                      value={item.ashrae}
                      onChange={(e) => updateImportItem(item.id, 'ashrae', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!canSubmit}
                    >
                      <option value="">Select refrigerant</option>
                      {approvedRefrigerants.map((ref, i) => (
                        <option key={i} value={ref.ashrae}>
                          {ref.ashrae} - {ref.refrigerant || ref.chemical_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Export Country</label>
                    <select
                      value={item.export_country}
                      onChange={(e) => updateImportItem(item.id, 'export_country', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!canSubmit}
                    >
                      <option value="">Select country</option>
                      {countryOptions.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (containers)</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateImportItem(item.id, 'quantity', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!canSubmit}
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Volume per container</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={item.volume}
                        onChange={(e) => updateImportItem(item.id, 'volume', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={!canSubmit}
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <select
                        value={item.designation}
                        onChange={(e) => updateImportItem(item.id, 'designation', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={!canSubmit}
                      >
                        {unitOptions.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addImportItem}
              disabled={!canSubmit}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 disabled:opacity-50"
            >
              + Add Another Item
            </button>
          </div>

          {/* CO2 Estimate */}
          <div className={`mx-6 mb-6 p-4 rounded-lg ${willExceedQuota ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex justify-between items-center">
              <span className={`font-medium ${willExceedQuota ? 'text-red-800' : 'text-blue-800'}`}>
                Estimated CO2 Equivalent:
              </span>
              <span className={`text-xl font-bold ${willExceedQuota ? 'text-red-800' : 'text-blue-800'}`}>
                {estimatedCO2.toLocaleString(undefined, { maximumFractionDigits: 2 })} CO2eq
              </span>
            </div>
            {willExceedQuota && (
              <p className="text-red-600 text-sm mt-2">⚠️ This exceeds your remaining quota!</p>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/imports')}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting || (willExceedQuota && !isDemoMode)}
              className="px-6 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ImportLicenseForm;