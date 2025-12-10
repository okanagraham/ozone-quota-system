// src/components/customs/CustomsCalculator.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase/supabaseClient';
import CustomsLayout from './CustomsLayout';

const CustomsCalculator = () => {
  const [refrigerants, setRefrigerants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [calculatorItems, setCalculatorItems] = useState([
    { id: Date.now().toString(), refrigerantId: '', volume: '', designation: 'kg' }
  ]);
  const [totalCO2, setTotalCO2] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const unitOptions = [
    { value: 'g', label: 'Grams (g)', factor: 0.001 },
    { value: 'kg', label: 'Kilograms (kg)', factor: 1 },
    { value: 'lb', label: 'Pounds (lb)', factor: 0.453592 },
    { value: 'oz', label: 'Ounces (oz)', factor: 0.0283495 },
    { value: 'ton', label: 'Metric Tons (ton)', factor: 1000 }
  ];

  useEffect(() => {
    fetchRefrigerants();
  }, []);

  const fetchRefrigerants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('refrigerants')
        .select('*')
        .order('ashrae', { ascending: true });

      if (error) throw error;
      setRefrigerants(data || []);
    } catch (err) {
      console.error('Error fetching refrigerants:', err);
      setError('Failed to load refrigerants');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCO2 = useCallback(() => {
    let total = 0;
    calculatorItems.forEach(item => {
      if (item.refrigerantId && item.volume) {
        const refrigerant = refrigerants.find(r => r.id === item.refrigerantId);
        if (!refrigerant) return;
        
        const gwpValue = refrigerant.gwp_value || 0;
        const unit = unitOptions.find(u => u.value === item.designation);
        if (!unit) return;
        
        const volumeValue = parseFloat(item.volume) || 0;
        const standardizedVolume = volumeValue * unit.factor;
        const co2Equivalent = standardizedVolume * gwpValue;
        
        total += co2Equivalent;
      }
    });
    setTotalCO2(total);
  }, [calculatorItems, refrigerants]);

  useEffect(() => {
    calculateTotalCO2();
  }, [calculatorItems, calculateTotalCO2]);

  const filteredRefrigerants = refrigerants.filter(refrigerant => {
    const searchLower = searchTerm.toLowerCase();
    return (
      refrigerant.ashrae?.toLowerCase().includes(searchLower) ||
      refrigerant.chemical_name?.toLowerCase().includes(searchLower) ||
      refrigerant.hs_code?.toLowerCase().includes(searchLower) ||
      refrigerant.type?.toLowerCase().includes(searchLower)
    );
  });

  const addCalculatorItem = () => {
    setCalculatorItems([
      ...calculatorItems,
      { id: Date.now().toString(), refrigerantId: '', volume: '', designation: 'kg' }
    ]);
  };

  const removeCalculatorItem = (id) => {
    if (calculatorItems.length > 1) {
      setCalculatorItems(calculatorItems.filter(item => item.id !== id));
    }
  };

  const updateCalculatorItem = (id, field, value) => {
    setCalculatorItems(calculatorItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const resetCalculator = () => {
    setCalculatorItems([
      { id: Date.now().toString(), refrigerantId: '', volume: '', designation: 'kg' }
    ]);
    setTotalCO2(0);
  };

  if (loading) {
    return (
      <CustomsLayout title="CO2 Calculator">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-700"></div>
          </div>
        </div>
      </CustomsLayout>
    );
  }

  return (
    <CustomsLayout title="CO2 Calculator">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">CO2 Equivalent Calculator</h2>
          <p className="text-sm text-gray-500">
            Calculate CO2 equivalent for refrigerants to verify import declarations
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-md border border-gray-200">
          <div className="bg-green-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-green-900">Calculator</h3>
            <p className="mt-1 text-sm text-green-700">
              Add refrigerants and quantities to calculate their CO2 equivalent
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Refrigerants
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, ASHRAE code, or HS code..."
                  className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Calculator Items */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Items</h4>
              
              {calculatorItems.map((item, index) => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Item #{index + 1}</h5>
                    {calculatorItems.length > 1 && (
                      <button
                        onClick={() => removeCalculatorItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Refrigerant
                      </label>
                      <select
                        value={item.refrigerantId}
                        onChange={(e) => updateCalculatorItem(item.id, 'refrigerantId', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select a refrigerant</option>
                        {filteredRefrigerants.map((ref) => (
                          <option key={ref.id} value={ref.id}>
                            {ref.ashrae} - {ref.chemical_name} (GWP: {ref.gwp_value})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Volume/Mass
                        </label>
                        <input
                          type="number"
                          value={item.volume}
                          onChange={(e) => updateCalculatorItem(item.id, 'volume', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          placeholder="Amount"
                          min="0.1"
                          step="0.1"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <select
                          value={item.designation}
                          onChange={(e) => updateCalculatorItem(item.id, 'designation', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        >
                          {unitOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Item Result */}
                  {item.refrigerantId && item.volume && (
                    <div className="mt-3 text-right">
                      <span className="text-sm text-gray-500">
                        {(() => {
                          const ref = refrigerants.find(r => r.id === item.refrigerantId);
                          if (!ref) return '0 CO2eq';
                          const gwp = ref.gwp_value || 0;
                          const unit = unitOptions.find(u => u.value === item.designation);
                          if (!unit) return '0 CO2eq';
                          const vol = parseFloat(item.volume) || 0;
                          const co2 = vol * unit.factor * gwp;
                          return `${co2.toLocaleString(undefined, { maximumFractionDigits: 2 })} CO2eq`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-center">
                <button
                  onClick={addCalculatorItem}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Another Item
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-md">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-green-900">Total CO2 Equivalent</h4>
                <span className="text-2xl font-bold text-green-800">
                  {totalCO2.toLocaleString(undefined, { maximumFractionDigits: 2 })} CO2eq
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
              <button
                onClick={resetCalculator}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Reset Calculator
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-white shadow-sm rounded-md border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">About CO2 Equivalent</h3>
          <p className="text-sm text-gray-500 mb-4">
            CO2 equivalent (CO2eq) is a metric measure used to compare the emissions from various 
            greenhouse gases based on their global-warming potential (GWP).
          </p>
          <p className="text-sm text-gray-500">
            The GWP values used in this calculator are based on the IPCC Fifth Assessment Report (AR5) 
            and represent the global warming potential over a 100-year time horizon.
          </p>
        </div>
      </div>
    </CustomsLayout>
  );
};

export default CustomsCalculator;