// src/components/calculator/CO2Calculator.js
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import MainLayout from '../layout/MainLayout';

const CO2Calculator = () => {
  // State
  const [refrigerants, setRefrigerants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [calculatorItems, setCalculatorItems] = useState([
    { id: Date.now().toString(), refrigerantId: '', volume: '', designation: 'kg' }
  ]);
  const [totalCO2, setTotalCO2] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Unit options with conversion factors to kg
  const unitOptions = [
    { value: 'g', label: 'Grams (g)', factor: 0.001 },
    { value: 'kg', label: 'Kilograms (kg)', factor: 1 },
    { value: 'lb', label: 'Pounds (lb)', factor: 0.453592 },
    { value: 'oz', label: 'Ounces (oz)', factor: 0.0283495 },
    { value: 'ton', label: 'Metric Tons (ton)', factor: 1000 }
  ];
  
  // Fetch refrigerants
  useEffect(() => {
    const fetchRefrigerants = async () => {
      try {
        setLoading(true);
        
        const refrigerantsCollection = collection(db, 'refrigerants');
        const refrigerantsSnapshot = await getDocs(refrigerantsCollection);
        
        const refrigerantsList = refrigerantsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRefrigerants(refrigerantsList);
      } catch (err) {
        console.error('Error fetching refrigerants:', err);
        setError('Failed to load refrigerants. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRefrigerants();
  }, []);
  
  // Calculate total CO2 whenever calculator items change
  useEffect(() => {
    calculateTotalCO2();
  }, [calculatorItems]);
  
  // Filter refrigerants based on search term
  const filteredRefrigerants = refrigerants.filter(refrigerant => {
    const searchLower = searchTerm.toLowerCase();
    return (
      refrigerant.ashrae?.toLowerCase().includes(searchLower) ||
      refrigerant.chemical_name?.toLowerCase().includes(searchLower) ||
      refrigerant.hs_code?.toLowerCase().includes(searchLower) ||
      refrigerant.type?.toLowerCase().includes(searchLower)
    );
  });
  
  // Add calculator item
  const addCalculatorItem = () => {
    setCalculatorItems([
      ...calculatorItems,
      { id: Date.now().toString(), refrigerantId: '', volume: '', designation: 'kg' }
    ]);
  };
  
  // Remove calculator item
  const removeCalculatorItem = (id) => {
    if (calculatorItems.length > 1) {
      setCalculatorItems(calculatorItems.filter(item => item.id !== id));
    }
  };
  
  // Update calculator item
  const updateCalculatorItem = (id, field, value) => {
    setCalculatorItems(calculatorItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
  
  // Calculate total CO2 equivalent
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
  }, [calculatorItems, refrigerants, unitOptions]);
  
  // Reset calculator
  const resetCalculator = () => {
    setCalculatorItems([
      { id: Date.now().toString(), refrigerantId: '', volume: '', designation: 'kg' }
    ]);
    setTotalCO2(0);
  };
  
  if (loading) {
    return (
      <MainLayout title="CO2 Calculator">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (error) {
    return (
      <MainLayout title="CO2 Calculator">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="CO2 Calculator">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">CO2 Equivalent Calculator</h2>
          <div className="flex items-center">
            <div className="h-1 w-8 bg-blue-600 mr-2"></div>
            <div className="text-sm text-gray-500">Calculate CO2 equivalent for refrigerants</div>
          </div>
        </div>
        
        {/* Calculator Form */}
        <div className="bg-white shadow-sm rounded-md border border-gray-200">
          {/* Form header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">CO2 Equivalent Calculator</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add refrigerants and quantities to calculate their CO2 equivalent.
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Refrigerant search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Refrigerants
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  placeholder="Search refrigerants by name, code, or type..."
                  className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Calculator items */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Calculator Items</h4>
              
              {calculatorItems.map((item, index) => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Item #{index + 1}</h5>
                    {calculatorItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCalculatorItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Refrigerant selection */}
                    <div>
                      <label htmlFor={`refrigerant-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Refrigerant
                      </label>
                      <select
                        id={`refrigerant-${item.id}`}
                        value={item.refrigerantId}
                        onChange={(e) => updateCalculatorItem(item.id, 'refrigerantId', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select a refrigerant</option>
                        {filteredRefrigerants.map((refrigerant) => (
                          <option key={refrigerant.id} value={refrigerant.id}>
                            {refrigerant.ashrae} - {refrigerant.chemical_name} (GWP: {refrigerant.gwp_value})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Volume and unit */}
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <label htmlFor={`volume-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Volume/Mass
                        </label>
                        <input
                          type="number"
                          id={`volume-${item.id}`}
                          value={item.volume}
                          onChange={(e) => updateCalculatorItem(item.id, 'volume', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Volume"
                          min="0.1"
                          step="0.1"
                        />
                      </div>
                      
                      <div className="w-24">
                        <label htmlFor={`unit-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <select
                          id={`unit-${item.id}`}
                          value={item.designation}
                          onChange={(e) => updateCalculatorItem(item.id, 'designation', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          {unitOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Item CO2 calculation */}
                  {item.refrigerantId && item.volume && (
                    <div className="mt-3 text-right">
                      <span className="text-sm text-gray-500">
                        {(() => {
                          const refrigerant = refrigerants.find(r => r.id === item.refrigerantId);
                          if (!refrigerant) return '0 CO2eq';
                          
                          const gwpValue = refrigerant.gwp_value || 0;
                          const unit = unitOptions.find(u => u.value === item.designation);
                          if (!unit) return '0 CO2eq';
                          
                          const volumeValue = parseFloat(item.volume) || 0;
                          const standardizedVolume = volumeValue * unit.factor;
                          const co2Equivalent = standardizedVolume * gwpValue;
                          
                          return `${co2Equivalent.toLocaleString(undefined, { maximumFractionDigits: 2 })} CO2eq`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Add more button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={addCalculatorItem}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Another Item
                </button>
              </div>
            </div>
            
            {/* Total CO2 display */}
            <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-blue-900">Total CO2 Equivalent</h4>
                <span className="text-2xl font-bold text-blue-800">
                  {totalCO2.toLocaleString(undefined, { maximumFractionDigits: 2 })} CO2eq
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetCalculator}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset Calculator
              </button>
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-8 bg-white shadow-sm rounded-md border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">About CO2 Equivalent</h3>
          <p className="text-sm text-gray-500">
            CO2 equivalent (CO2eq) is a metric measure used to compare the emissions from various greenhouse gases on the basis of their global-warming potential (GWP), by converting amounts of other gases to the equivalent amount of carbon dioxide with the same global warming potential.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            The GWP values used in this calculator are based on the IPCC Fifth Assessment Report (AR5) and represent the global warming potential over a 100-year time horizon.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            This calculator can be used to estimate the climate impact of various refrigerants and to help plan imports within your quota limits.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default CO2Calculator;