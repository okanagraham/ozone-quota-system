// src/components/registration/RegistrationForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDemoMode } from '../../context/DemoModeContext';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';

const RegistrationForm = () => {
  const { currentUser, userProfile } = useAuth();
  const { isDemoMode, isRegistrationPeriodOpen } = useDemoMode();
  const navigate = useNavigate();
  
  const [refrigerants, setRefrigerants] = useState([]);
  const [registrationPeriod, setRegistrationPeriod] = useState(null);
  const [selectedRefrigerants, setSelectedRefrigerants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRetail, setIsRetail] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Document upload state
  const [supportingDocuments, setSupportingDocuments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Check registration period (considers admin override and demo mode)
  const checkRegistrationPeriod = async () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const registrationYear = (currentYear + 1).toString();
    
    // Check for admin override in settings
    let adminOverride = false;
    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('registration_open_override')
        .single();
      
      adminOverride = settings?.registration_open_override || false;
    } catch (err) {
      console.log('No settings override found');
    }
    
    // Demo mode or admin override bypasses December restriction
    const isOpen = isDemoMode || adminOverride || currentMonth === 11;
    
    const decemberLast = new Date(currentYear, 11, 31, 23, 59, 59);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilClose = Math.ceil((decemberLast - now) / msPerDay);
    
    return {
      isOpen,
      registrationYear,
      daysUntilClose: isOpen && daysUntilClose > 0 ? daysUntilClose : 0,
      daysUntilOpen: currentMonth < 11 ? Math.ceil((new Date(currentYear, 11, 1) - now) / msPerDay) : 0,
      showNotification: true,
      adminOverride
    };
  };
  
  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const periodStatus = await checkRegistrationPeriod();
        setRegistrationPeriod(periodStatus);
        
        if (userProfile?.retail !== undefined) {
          setIsRetail(userProfile.retail);
        }
        
        // Fetch refrigerants from Supabase
        const { data: refrigerantData, error: refError } = await supabase
          .from('refrigerants')
          .select('*')
          .order('ashrae', { ascending: true });
        
        if (refError) throw refError;
        setRefrigerants(refrigerantData || []);
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
  }, [currentUser, userProfile, isDemoMode]);
  
  // Filter refrigerants based on search term
  const filteredRefrigerants = refrigerants.filter(r => {
    const s = searchTerm.toLowerCase();
    return (
      r.ashrae?.toLowerCase().includes(s) ||
      r.chemical_name?.toLowerCase().includes(s) ||
      r.hs_code?.toLowerCase().includes(s) ||
      r.type?.toLowerCase().includes(s)
    );
  });
  
  // Group refrigerants by type
  const groupedRefrigerants = filteredRefrigerants.reduce((groups, r) => {
    const type = r.type || 'Other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(r);
    return groups;
  }, {});
  
  const toggleRefrigerant = (id) => {
    setSelectedRefrigerants(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });
    
    if (validFiles.length !== files.length) {
      setUploadError('Some files were rejected. Only PDF and images under 10MB are allowed.');
    }
    
    setSupportingDocuments(prev => [...prev, ...validFiles]);
  };

  // Remove a document from the list
  const removeDocument = (index) => {
    setSupportingDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Upload documents to Supabase storage
  const uploadDocuments = async (registrationId) => {
    const uploadedDocs = [];
    
    for (const file of supportingDocuments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${registrationId}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('registration-documents')
        .upload(fileName, file);
      
      if (error) {
        console.error('Error uploading file:', error);
        continue;
      }
      
      const { data: urlData } = supabase.storage
        .from('registration-documents')
        .getPublicUrl(fileName);
      
      uploadedDocs.push({
        name: file.name,
        type: file.type,
        size: file.size,
        path: fileName,
        url: urlData.publicUrl,
        uploaded_at: new Date().toISOString()
      });
    }
    
    return uploadedDocs;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedRefrigerants.length === 0) {
      setError('Please select at least one refrigerant.');
      return;
    }
    
    if (!agreedToTerms) {
      setError('You must agree to the declaration.');
      return;
    }
    
    if (!registrationPeriod?.isOpen) {
      setError('Registration period is not currently open.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Format selected refrigerants
      const refrigerantsData = selectedRefrigerants.map(id => {
        const r = refrigerants.find(ref => ref.id === id);
        return {
          refrigerant: r.chemical_name,
          ashrae: r.ashrae,
          hs_code: r.hs_code,
          quota: r.gwp_value
        };
      });
      
      // Create registration record
      const registrationData = {
        user_id: currentUser.id,
        name: userProfile?.enterprise_name || userProfile?.display_name || '',
        year: registrationPeriod.registrationYear,
        refrigerants: refrigerantsData,
        retail: isRetail,
        status: 'Awaiting Approval',
        completed: false,
        awaiting_admin_signature: true,
        created_at: new Date().toISOString()
      };
      
      const { data: newReg, error: insertError } = await supabase
        .from('registrations')
        .insert(registrationData)
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Upload supporting documents if any
      if (supportingDocuments.length > 0) {
        setUploadingFiles(true);
        const uploadedDocs = await uploadDocuments(newReg.id);
        
        // Update registration with document references
        await supabase
          .from('registrations')
          .update({ supporting_documents: uploadedDocs })
          .eq('id', newReg.id);
        
        setUploadingFiles(false);
      }
      
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err) {
      console.error('Error submitting registration:', err);
      setError(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => navigate('/dashboard');
  
  if (loading) {
    return (
      <MainLayout title="Registration Application">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="Registration Application">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Registration Application</h2>
          <div className="flex items-center">
            <div className="h-1 w-8 bg-blue-600 mr-2"></div>
            <div className="text-sm text-gray-500">
              For calendar year {registrationPeriod?.registrationYear}
            </div>
          </div>
        </div>
        
        {/* Registration period notice */}
        {registrationPeriod && (
          <div className={`mb-8 p-4 rounded-md border ${
            registrationPeriod.isOpen ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex">
              <div className={`flex-shrink-0 ${registrationPeriod.isOpen ? 'text-blue-400' : 'text-yellow-400'}`}>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${registrationPeriod.isOpen ? 'text-blue-800' : 'text-yellow-800'}`}>
                  {registrationPeriod.isOpen 
                    ? `Registration for ${registrationPeriod.registrationYear} is now open!`
                    : `Registration for ${registrationPeriod.registrationYear} is not yet open`}
                  {registrationPeriod.adminOverride && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Admin Override Active</span>
                  )}
                </h3>
                <div className={`mt-2 text-sm ${registrationPeriod.isOpen ? 'text-blue-700' : 'text-yellow-700'}`}>
                  {registrationPeriod.isOpen ? (
                    <p>Complete your registration before December 31st to import during {registrationPeriod.registrationYear}.</p>
                  ) : (
                    <p>Registration will open on December 1st. Days until open: {registrationPeriod.daysUntilOpen}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Success/Error messages */}
        {success && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Registration Submitted Successfully</h3>
                <p className="mt-2 text-sm text-green-700">Redirecting to dashboard...</p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-2 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Registration form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-md border border-gray-200">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Registration Information</h3>
            <p className="mt-1 text-sm text-gray-500">
              Complete the form below to register for calendar year {registrationPeriod?.registrationYear}.
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Business type */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Business Type</h4>
              <div className="flex items-center">
                <input
                  id="retail"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  checked={isRetail}
                  onChange={() => setIsRetail(!isRetail)}
                  disabled={isSubmitting || !registrationPeriod?.isOpen}
                />
                <label htmlFor="retail" className="ml-2 text-sm text-gray-900">This is a retail business</label>
              </div>
            </div>
            
            {/* Refrigerant selection */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Select Refrigerants to Import
              </h4>
              
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search refrigerants..."
                  className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isSubmitting || !registrationPeriod?.isOpen}
                />
              </div>
              
              <div className="border border-gray-200 rounded-md overflow-hidden max-h-96 overflow-y-auto">
                {Object.entries(groupedRefrigerants).map(([type, typeRefs]) => (
                  <div key={type} className="border-b border-gray-200 last:border-b-0">
                    <div className="px-4 py-2 bg-gray-50">
                      <h5 className="text-sm font-medium text-gray-700">{type}</h5>
                    </div>
                    <ul>
                      {typeRefs.map((r) => (
                        <li key={r.id} className={`px-4 py-3 hover:bg-gray-50 ${selectedRefrigerants.includes(r.id) ? 'bg-blue-50' : ''}`}>
                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded"
                              checked={selectedRefrigerants.includes(r.id)}
                              onChange={() => toggleRefrigerant(r.id)}
                              disabled={isSubmitting || !registrationPeriod?.isOpen}
                            />
                            <div className="ml-3 text-sm flex-1">
                              <div className="font-medium text-gray-900 flex justify-between">
                                <span>{r.ashrae}</span>
                                <span className="text-gray-500">GWP: {r.gwp_value}</span>
                              </div>
                              <div className="text-gray-500 flex justify-between">
                                <span>{r.chemical_name}</span>
                                <span>{r.hs_code}</span>
                              </div>
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {filteredRefrigerants.length === 0 && (
                  <div className="p-4 text-center text-gray-500">No refrigerants found</div>
                )}
              </div>
              
              <div className="mt-2 text-sm text-gray-500 flex justify-between">
                <span>{selectedRefrigerants.length} refrigerants selected</span>
                {selectedRefrigerants.length > 0 && (
                  <button type="button" onClick={() => setSelectedRefrigerants([])} className="text-blue-600 hover:text-blue-800">
                    Clear all
                  </button>
                )}
              </div>
            </div>
            
            {/* Supporting Documents Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Supporting Documents
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Upload documents to support your ability to handle specific refrigerants (e.g., certifications, business licenses, training certificates).
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4 flex text-sm text-gray-600 justify-center">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                      <span>Upload files</span>
                      <input
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.gif"
                        onChange={handleFileSelect}
                        disabled={isSubmitting || !registrationPeriod?.isOpen}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">PDF, PNG, JPG, GIF up to 10MB each</p>
                </div>
              </div>
              
              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
              
              {/* Document list */}
              {supportingDocuments.length > 0 && (
                <ul className="mt-4 divide-y divide-gray-200 border border-gray-200 rounded-md">
                  {supportingDocuments.map((file, index) => (
                    <li key={index} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-gray-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-red-600 hover:text-red-800"
                        disabled={isSubmitting}
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* Declaration */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Declaration</h4>
              <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-start">
                  <input
                    id="declaration"
                    type="checkbox"
                    className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded"
                    checked={agreedToTerms}
                    onChange={() => setAgreedToTerms(!agreedToTerms)}
                    disabled={isSubmitting || !registrationPeriod?.isOpen}
                  />
                  <div className="ml-3 text-sm">
                    <label htmlFor="declaration" className="font-medium text-gray-700">I declare that:</label>
                    <p className="text-gray-500 mt-1">
                      All information provided is accurate and complete. I agree to comply with all regulations regarding importation and handling of controlled substances.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Form actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                registrationPeriod?.isOpen ? 'bg-blue-800 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={isSubmitting || !registrationPeriod?.isOpen}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {uploadingFiles ? 'Uploading documents...' : 'Submitting...'}
                </span>
              ) : 'Submit Registration'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default RegistrationForm;