// src/components/registration/RegistrationForm.js
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDemoMode } from '../../context/DemoModeContext'
import { supabase } from '../../lib/supabase'
import MainLayout from '../layout/MainLayout'

const RegistrationForm = () => {
  const { currentUser, userProfile } = useAuth()
  const { isDemoMode, simulateRegistrationSubmit } = useDemoMode()
  const navigate = useNavigate()
  
  const [refrigerants, setRefrigerants] = useState([])
  const [registrationPeriod, setRegistrationPeriod] = useState(null)
  const [selectedRefrigerants, setSelectedRefrigerants] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isRetail, setIsRetail] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Check registration period (TESTING MODE - always open)
        const currentYear = new Date().getFullYear()
        const periodStatus = {
          isOpen: true, // TESTING MODE
          registrationYear: (currentYear + 1).toString(),
          currentMonth: new Date().getMonth(),
          daysUntilOpen: 0,
          daysUntilClose: 365,
          showNotification: false // Don't show banner during testing
        }
        setRegistrationPeriod(periodStatus)
        
        // Set retail flag from user profile if available
        if (userProfile && userProfile.hasOwnProperty('retail')) {
          setIsRetail(userProfile.retail)
        }
        
        // Get all refrigerants from Supabase
        const { data: refrigerantsData, error: refrigerantsError } = await supabase
          .from('refrigerants')
          .select('*')
          .order('ashrae', { ascending: true })
        
        if (refrigerantsError) throw refrigerantsError
        
        setRefrigerants(refrigerantsData || [])
      } catch (err) {
        console.error('Error fetching initial data:', err)
        setError('Failed to load refrigerant data. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }
    
    if (currentUser) {
      fetchInitialData()
    }
  }, [currentUser, userProfile])
  
  // Filter refrigerants based on search term
  const filteredRefrigerants = refrigerants.filter(refrigerant => {
    const searchLower = searchTerm.toLowerCase()
    return (
      refrigerant.ashrae?.toLowerCase().includes(searchLower) ||
      refrigerant.chemical_name?.toLowerCase().includes(searchLower) ||
      refrigerant.hs_code?.toLowerCase().includes(searchLower) ||
      refrigerant.type?.toLowerCase().includes(searchLower)
    )
  })
  
  // Group refrigerants by type
  const groupedRefrigerants = filteredRefrigerants.reduce((groups, refrigerant) => {
    const type = refrigerant.type || 'Other'
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(refrigerant)
    return groups
  }, {})
  
  // Toggle refrigerant selection
  const toggleRefrigerant = (refrigerantId) => {
    if (selectedRefrigerants.includes(refrigerantId)) {
      setSelectedRefrigerants(selectedRefrigerants.filter(id => id !== refrigerantId))
    } else {
      setSelectedRefrigerants([...selectedRefrigerants, refrigerantId])
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form
    if (selectedRefrigerants.length === 0) {
      setError('Please select at least one refrigerant.')
      return
    }
    
    if (!agreedToTerms) {
      setError('You must agree to the declaration.')
      return
    }
    
    if (!registrationPeriod?.isOpen) {
      setError('Registration period is not currently open.')
      return
    }
    
    try {
      setIsSubmitting(true)
      setError(null)
      
      // Check if user already has a registration for this year
      const { data: existingReg, error: checkError } = await supabase
        .from('registrations')
        .select('id')
        .eq('user_id', currentUser.id)  // FIXED: Changed from 'user' to 'user_id'
        .eq('year', registrationPeriod.registrationYear)
        .maybeSingle()  // FIXED: Changed from single() to maybeSingle() to avoid error if no record exists
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is expected when no registration exists
        throw checkError
      }
      
      if (existingReg) {
        throw new Error(`You already have a registration application for ${registrationPeriod.registrationYear}`)
      }
      
      // Format selected refrigerants data
      const refrigerantsData = selectedRefrigerants.map(id => {
        const refrigerant = refrigerants.find(r => r.id === id)
        return {
          refrigerant: refrigerant.chemical_name,
          ashrae: refrigerant.ashrae,
          hs_code: refrigerant.hs_code,
          quota: refrigerant.gwp_value
        }
      })
      
      // Create registration document
      const registrationDoc = {
        user_id: currentUser.id,  // FIXED: Changed from 'user' to 'user_id'
        name: userProfile?.enterprise_name || currentUser.email,
        date: new Date().toISOString(),
        year: registrationPeriod.registrationYear,
        refrigerants: refrigerantsData,
        retail: isRetail,
        receipt_uploaded: false,
        paid: false,
        last_modified: new Date().toISOString(),
        completed: false,
        awaiting_admin_signature: false,
        status: 'Awaiting Approval',
      }
      
      // Insert into Supabase
      const { data, error: insertError } = await supabase
        .from('registrations')
        .insert(registrationDoc)
        .select()
        .single()
      
      if (insertError) throw insertError
      
      // Show success message
      setSuccess(true)
      
      // Navigate back to dashboard after delay
      setTimeout(() => {
        navigate('/dashboard')
      }, 3000)
    } catch (err) {
      console.error('Error submitting registration:', err)
      setError(err.message || 'Failed to submit registration. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle cancel
  const handleCancel = () => {
    navigate('/dashboard')
  }
  
  if (loading) {
    return (
      <MainLayout title="Registration Application">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        </div>
      </MainLayout>
    )
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
        
        {/* Registration period notice - Only show if NOT open */}
        {registrationPeriod && !registrationPeriod.isOpen && registrationPeriod.showNotification && (
          <div className="mb-8 p-4 rounded-md border bg-yellow-50 border-yellow-200">
            <div className="flex">
              <div className="flex-shrink-0 text-yellow-400">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Registration for {registrationPeriod.registrationYear} is not yet open
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Registration will open on December 1st. Please prepare your registration documents.
                    <br />
                    <span className="font-medium">Days until registration opens: {registrationPeriod.daysUntilOpen}</span>
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
                  Registration Submitted Successfully
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Your registration has been submitted for approval. You will be redirected to the dashboard in a moment.
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
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Registration form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-md border border-gray-200">
          {/* Form header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Registration Information</h3>
            <p className="mt-1 text-sm text-gray-500">
              Complete the form below to register as an importer for the calendar year {registrationPeriod?.registrationYear}.
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Business type section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Business Type</h4>
              <div className="flex items-center">
                <input
                  id="retail"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={isRetail}
                  onChange={() => setIsRetail(!isRetail)}
                  disabled={isSubmitting || !registrationPeriod?.isOpen}
                />
                <label htmlFor="retail" className="ml-2 block text-sm text-gray-900">
                  This is a retail business
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Check this if you sell these substances directly to end consumers.
              </p>
            </div>
            
            {/* Refrigerant selection section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Select Refrigerants to Import
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Select all refrigerants that you plan to import during {registrationPeriod?.registrationYear}.
                The administrator will review your selections and may adjust your allowed refrigerants.
              </p>
              
              {/* Search bar */}
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search refrigerants by name, code, or type..."
                  className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isSubmitting || !registrationPeriod?.isOpen}
                />
              </div>
              
              {/* Refrigerant selection */}
              <div className="border border-gray-200 rounded-md overflow-hidden max-h-96 overflow-y-auto">
                {Object.entries(groupedRefrigerants).map(([type, typeRefrigerants]) => (
                  <div key={type} className="border-b border-gray-200 last:border-b-0">
                    <div className="px-4 py-2 bg-gray-50">
                      <h5 className="text-sm font-medium text-gray-700">{type}</h5>
                    </div>
                    <ul>
                      {typeRefrigerants.map((refrigerant) => (
                        <li
                          key={refrigerant.id}
                          className={`px-4 py-3 hover:bg-gray-50 ${
                            selectedRefrigerants.includes(refrigerant.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <label className="flex items-start cursor-pointer">
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                checked={selectedRefrigerants.includes(refrigerant.id)}
                                onChange={() => toggleRefrigerant(refrigerant.id)}
                                disabled={isSubmitting || !registrationPeriod?.isOpen}
                              />
                            </div>
                            <div className="ml-3 text-sm flex-1">
                              <div className="font-medium text-gray-900 flex justify-between">
                                <span>{refrigerant.ashrae}</span>
                                <span className="text-gray-500">GWP: {refrigerant.gwp_value}</span>
                              </div>
                              <div className="text-gray-500 flex justify-between">
                                <span>{refrigerant.chemical_name}</span>
                                <span>{refrigerant.hs_code}</span>
                              </div>
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                
                {filteredRefrigerants.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No refrigerants found matching "{searchTerm}"
                  </div>
                )}
              </div>
              
              <div className="mt-2 text-sm text-gray-500 flex justify-between items-center">
                <span>{selectedRefrigerants.length} refrigerants selected</span>
                {selectedRefrigerants.length > 0 && (
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setSelectedRefrigerants([])}
                    disabled={isSubmitting || !registrationPeriod?.isOpen}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            
            {/* Declaration section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Declaration</h4>
              <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <input
                      id="declaration"
                      name="declaration"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={agreedToTerms}
                      onChange={() => setAgreedToTerms(!agreedToTerms)}
                      disabled={isSubmitting || !registrationPeriod?.isOpen}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="declaration" className="font-medium text-gray-700">I declare that:</label>
                    <p className="text-gray-500 mt-1">
                      All information provided in this application is accurate and complete. I understand that providing false information may result in rejection of my application and other legal consequences. I agree to comply with all regulations regarding the importation and handling of controlled substances.
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
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                registrationPeriod?.isOpen 
                  ? 'bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={isSubmitting || !registrationPeriod?.isOpen}
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
                'Submit Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}

export default RegistrationForm