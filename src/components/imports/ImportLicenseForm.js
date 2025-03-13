// src/components/imports/ImportLicenseForm.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RegistrationService } from '../../services/registration/registrationService';
import { QuotaService } from '../../services/quota/quotaService';
import { db, storage } from '../../services/firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import MainLayout from '../layout/MainLayout';

const ImportLicenseForm = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [approvedRefrigerants, setApprovedRefrigerants] = useState([]);
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [importItems, setImportItems] = useState([
    { id: Date.now().toString(), ashrae: '', export_country: '', quantity: '', volume: '', designation: 'kg' }
  ]);
  const [file, setFile] = useState(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [estimatedCO2, setEstimatedCO2] = useState(0);
  const [willExceedQuota, setWillExceedQuota] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Unit options
  const unitOptions = [
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'lb', label: 'Pounds (lb)' },
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'ton', label: 'Metric Tons (ton)' }
  ];
  
  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Execute parallel requests
        const [registrationData, refrigerantsData, quotaData] = await Promise.all([
          RegistrationService.getRegistrationStatus(currentUser.uid),
          RegistrationService.getApprovedRefrigerants(currentUser.uid),
          QuotaService.getQuotaInfo(currentUser.uid)
        ]);
        
        setRegistrationStatus(registrationData);
        setApprovedRefrigerants(refrigerantsData);
        setQuotaInfo(quotaData);
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load refrigerant data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser) {
      fetchInitialData();
    }
  }, [currentUser]);
  
  // Calculate CO2 equivalent whenever import items change
  useEffect(() => {
    const calculateCO2 = async () => {
      try {
        // Only calculate if we have valid import items
        const validItems = importItems.filter(item => 
          item.ashrae && item.volume && item.quantity
        );
        
        if (validItems.length === 0) {
          setEstimatedCO2(0);
          setWillExceedQuota(false);
          return;
        }
        
        // Check quota
        const quotaCheck = await QuotaService.checkImportQuota(currentUser.uid, validItems);
        
        setEstimatedCO2(quotaCheck.importCO2);
        setWillExceedQuota(quotaCheck.willExceedQuota);
      } catch (err) {
        console.error('Error calculating CO2:', err);
      }
    };
    
    if (currentUser) {
      calculateCO2();
    }
  }, [importItems, currentUser]);
  
  // Add new import item
  const addImportItem = () => {
    setImportItems([
      ...importItems,
      { id: Date.now().toString(), ashrae: '', export_country: '', quantity: '', volume: '', designation: 'kg' }
    ]);
  };
  
  // Remove import item
  const removeImportItem = (id) => {
    if (importItems.length > 1) {
      setImportItems(importItems.filter(item => item.id !== id));
    }
  };
  
  // Update import item
  const updateImportItem = (id, field, value) => {
    setImportItems(importItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
  
  // Handle file change
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!registrationStatus?.isRegistered) {
      setError('You must have an active registration to submit an import license request.');
      return;
    }
    
    if (importItems.some(item => !item.ashrae || !item.export_country || !item.quantity || !item.volume)) {
      setError('Please fill out all fields for each import item.');
      return;
    }
    
    if (willExceedQuota) {
      setError('This import would exceed your remaining quota. Please reduce the quantities.');
      return;
    }
    
    if (!file && hasArrived) {
      setError('Please upload an invoice for the arrived shipment.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Calculate CO2 equivalent for each item
      const itemsWithCO2 = await Promise.all(
        importItems.map(async item => {
          const co2Equivalent = await QuotaService.calculateCO2Equivalent(
            item.ashrae,
            item.volume,
            item.designation,
            item.quantity
          );
          
          return {
            ...item,
            co2_equivalent: co2Equivalent.toString()
          };
        })
      );
      
      // Upload invoice if provided
      let invoiceUrl = '';
      if (file) {
        const storageRef = ref(storage, `invoices/${registrationStatus.registration.id}/${file.name}`);
        await uploadBytes(storageRef, file);
        invoiceUrl = await getDownloadURL(storageRef);
      }
      
      // Get next import number from the active registration
      const nextImportNumber = registrationStatus.registration.next_importer_number || 1000;
      
      // Create import document
      const importData = {
        user: currentUser.uid,
        name: userProfile?.enterprise_name || '',
        registration: {
          __datatype__: "documentReference",
          value: `registrations/${registrationStatus.registration.id}`
        },
        import_year: new Date().getFullYear().toString(),
        submission_date: serverTimestamp(),
        imported_items: itemsWithCO2,
        import_number: nextImportNumber + 1,
        arrived: hasArrived,
        invoice_uploaded: !!file,
        invoice_url: invoiceUrl,
        pending: true,
        approved: false,
        inspected: false,
        paid: false,
        status: hasArrived ? 'Awaiting Inspection Schedule' : 'Awaiting Arrival'
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'imports'), importData);
      
      // Show success message
      setSuccess(true);
      
      // Navigate back to imports list after delay
      setTimeout(() => {
        navigate('/imports');
      }, 3000);
    } catch (err) {
      console.error('Error submitting import license request:', err);
      setError(err.message || 'Failed to submit import license request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    navigate('/imports');
  };
  
  if (loading) {
    return (
      <MainLayout title="Import License Application">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="Import License Application">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Import License Application</h2>
          <div className="flex items-center">
            <div className="h-1 w-8 bg-blue-600 mr-2"></div>
            <div className="text-sm text-gray-500">Request permission to import controlled substances</div>
          </div>
        </div>
        
        {/* Registration notice if not registered */}
        {!registrationStatus?.isRegistered && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  You need an active registration
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You must have an active registration for the current year before you can submit an import license request.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Success message */}
        {success && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Import License Request Submitted Successfully
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Your import license request has been submitted. You will be redirected to the imports list in a moment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Quota information */}
        {quotaInfo && (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4 mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Your Import Quota</h3>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Total Quota:</span>
              <span className="text-sm font-medium">{quotaInfo.total.toLocaleString()} CO2eq</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Used:</span>
              <span className="text-sm font-medium">{quotaInfo.used.toLocaleString()} CO2eq</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Remaining:</span>
              <span className="text-sm font-medium text-blue-800">{quotaInfo.remaining.toLocaleString()} CO2eq</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${quotaInfo.percentage}%` }}></div>
            </div>
          </div>
        )}
        
        {/* Import form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-md border border-gray-200">
          {/* Form header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Import Details</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add the substances you wish to import. You may only select from substances you are registered to import.
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Import items */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Import Items</h4>
              
              {importItems.map((item, index) => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Item #{index + 1}</h5>
                    {importItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImportItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        disabled={isSubmitting || !registrationStatus?.isRegistered}
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
                        value={item.ashrae}
                        onChange={(e) => updateImportItem(item.id, 'ashrae', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        disabled={isSubmitting || !registrationStatus?.isRegistered}
                      >
                        <option value="">Select a refrigerant</option>
                        {approvedRefrigerants.map((refrigerant, idx) => (
                          <option key={idx} value={refrigerant.ashrae}>
                            {refrigerant.ashrae} - {refrigerant.refrigerant || refrigerant.cs_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Export country */}
                    <div>
                      <label htmlFor={`country-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Export Country
                      </label>
                      <input
                        type="text"
                        id={`country-${item.id}`}
                        value={item.export_country}
                        onChange={(e) => updateImportItem(item.id, 'export_country', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Country of export"
                        disabled={isSubmitting || !registrationStatus?.isRegistered}
                      />
                    </div>
                    
                    {/* Quantity */}
                    <div>
                      <label htmlFor={`quantity-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity (No. of containers)
                      </label>
                      <input
                        type="number"
                        id={`quantity-${item.id}`}
                        value={item.quantity}
                        onChange={(e) => updateImportItem(item.id, 'quantity', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Quantity"
                        min="1"
                        disabled={isSubmitting || !registrationStatus?.isRegistered}
                      />
                    </div>
                    
                    {/* Volume and unit */}
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <label htmlFor={`volume-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Volume/Mass per Container
                        </label>
                        <input
                          type="number"
                          id={`volume-${item.id}`}
                          value={item.volume}
                          onChange={(e) => updateImportItem(item.id, 'volume', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Volume"
                          min="0.1"
                          step="0.1"
                          disabled={isSubmitting || !registrationStatus?.isRegistered}
                        />
                      </div>
                      
                      <div className="w-24">
                        <label htmlFor={`unit-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <select
                          id={`unit-${item.id}`}
                          value={item.designation}
                          onChange={(e) => updateImportItem(item.id, 'designation', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          disabled={isSubmitting || !registrationStatus?.isRegistered}
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
                </div>
              ))}
              
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={addImportItem}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSubmitting || !registrationStatus?.isRegistered}
                >
                  <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Another Item
                </button>
              </div>
            </div>
            
            {/* Shipment arrived and invoice upload */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Shipment Status</h4>
              
              <div className="mb-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="arrived"
                      name="arrived"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={hasArrived}
                      onChange={() => setHasArrived(!hasArrived)}
                      disabled={isSubmitting || !registrationStatus?.isRegistered}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="arrived" className="font-medium text-gray-700">
                      Shipment has arrived
                    </label>
                    <p className="text-gray-500">
                      Check this if the shipment has already arrived in the country and is ready for inspection.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Invoice upload (only show if shipment has arrived) */}
              {hasArrived && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Invoice (Required)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload a file</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only"
                            onChange={handleFileChange}
                            accept=".pdf"
                            disabled={isSubmitting || !registrationStatus?.isRegistered}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PDF up to 10MB
                      </p>
                    </div>
                  </div>
                  {file && (
                    <p className="mt-2 text-sm text-green-600">
                      File selected: {file.name}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* CO2 Equivalent Calculation */}
            <div className={`mt-6 p-4 rounded-md border ${
              willExceedQuota ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <h4 className={`text-sm font-semibold mb-2 ${
                willExceedQuota ? 'text-red-800' : 'text-blue-800'
              }`}>
                CO2 Equivalent Calculation
              </h4>
              <p className={`text-sm mb-3 ${
                willExceedQuota ? 'text-red-700' : 'text-blue-700'
              }`}>
                Based on your current selections, this import will use the following amount of your quota:
              </p>
              <div className="flex justify-between">
                <span className={`text-sm font-medium ${
                  willExceedQuota ? 'text-red-700' : 'text-blue-700'
                }`}>
                  Estimated CO2 Equivalent:
                </span>
                <span className={`text-sm font-bold ${
                  willExceedQuota ? 'text-red-800' : 'text-blue-800'
                }`}>
                  {estimatedCO2.toLocaleString()} CO2eq
                </span>
              </div>
              
              {willExceedQuota && quotaInfo && (
                <div className="mt-3 flex justify-between text-red-700">
                  <span className="text-sm font-medium">Quota deficit:</span>
                  <span className="text-sm font-bold">
                    {(estimatedCO2 - quotaInfo.remaining).toLocaleString()} CO2eq
                  </span>
                </div>
              )}
              
              <div className={`mt-2 text-xs ${
                willExceedQuota ? 'text-red-600' : 'text-blue-600'
              }`}>
                {willExceedQuota 
                  ? 'Warning: This import would exceed your remaining quota. Please reduce quantities.'
                  : 'Note: This is an estimate. Final values will be calculated upon approval.'}
              </div>
            </div>
          </div>
          
          {/* Form actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                registrationStatus?.isRegistered && !willExceedQuota
                  ? 'bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={isSubmitting || !registrationStatus?.isRegistered || willExceedQuota}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Import Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ImportLicenseForm;