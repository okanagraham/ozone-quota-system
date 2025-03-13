// src/components/dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { QuotaService } from '../../services/quota/quotaService';
import { RegistrationService } from '../../services/registration/registrationService';
import MainLayout from '../layout/MainLayout';

const Dashboard = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [approvedRefrigerants, setApprovedRefrigerants] = useState([]);
  const [registrationPeriod, setRegistrationPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login');
    }
  }, [authLoading, currentUser, navigate]);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (authLoading || !currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Check registration period status
        const periodStatus = RegistrationService.checkRegistrationPeriodStatus();
        setRegistrationPeriod(periodStatus);
        
        // Execute parallel requests
        const [quotaData, registrationData, refrigerantsData] = await Promise.all([
          QuotaService.getQuotaInfo(currentUser.uid),
          RegistrationService.getRegistrationStatus(currentUser.uid),
          RegistrationService.getApprovedRefrigerants(currentUser.uid)
        ]);
        
        setQuotaInfo(quotaData);
        setRegistrationStatus(registrationData);
        setApprovedRefrigerants(refrigerantsData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser, authLoading]);
  
  // Show loading indicator while authentication is in progress
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-900"></div>
      </div>
    );
  }
  
  // If user is not logged in, they will be redirected by the useEffect hook
  if (!currentUser) {
    return null;
  }
  
  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (error) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Importer Information</h2>
          <div className="text-sm text-gray-500 flex">
            <Link to="/registration/view" className="hover:underline">View Registration Information</Link>
            <span className="mx-2">/</span>
            <Link to="/registration/create" className="hover:underline">Application Form</Link>
          </div>
        </div>
        
        {/* Registration Notice */}
        {registrationPeriod && registrationPeriod.showNotification && !registrationStatus?.isRegistered && (
          <div className={`mb-6 p-4 rounded-md border ${
            registrationPeriod.isOpen ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex">
              <div className={`flex-shrink-0 ${
                registrationPeriod.isOpen ? 'text-blue-400' : 'text-yellow-400'
              }`}>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  registrationPeriod.isOpen ? 'text-blue-800' : 'text-yellow-800'
                }`}>
                  {registrationPeriod.isOpen 
                    ? `Registration for ${registrationPeriod.registrationYear} is now open!` 
                    : `Registration for ${registrationPeriod.registrationYear} opens soon`}
                </h3>
                <div className={`mt-2 text-sm ${
                  registrationPeriod.isOpen ? 'text-blue-700' : 'text-yellow-700'
                }`}>
                  {registrationPeriod.isOpen ? (
                    <p>
                      You must complete your registration before December 31st to be able to import during {registrationPeriod.registrationYear}.
                      <br />
                      <span className="font-medium">Time remaining: {registrationPeriod.daysUntilClose} days</span>
                    </p>
                  ) : (
                    <p>
                      Registration will open on December 1st. Please prepare your registration documents.
                      <br />
                      <span className="font-medium">Days until registration opens: {registrationPeriod.daysUntilOpen}</span>
                    </p>
                  )}
                </div>
                {registrationPeriod.isOpen && (
                  <div className="mt-4">
                    <Link
                      to="/registration/create"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Register Now
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Active Registrations</div>
            <div className="text-3xl font-bold text-blue-800">
              {registrationStatus?.isRegistered ? '1' : '0'}
            </div>
          </div>
          
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Expiry</div>
            <div className="text-3xl font-bold text-blue-800">
              {registrationStatus?.isRegistered ? `${registrationStatus.expiryDays}` : '0'} 
              <span className="text-sm font-normal"> days</span>
            </div>
          </div>
          
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Importer Number</div>
            <div className="text-3xl font-bold text-blue-800">
              {userProfile?.importer_number || 'N/A'}
            </div>
          </div>
          
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Status</div>
            <div className="text-xl font-semibold text-red-600">
              {registrationStatus?.isRegistered 
                ? registrationStatus.registration.status || 'Approved' 
                : 'Not Registered'}
            </div>
          </div>
        </div>
        
        {/* User Profile */}
        <div className="bg-white rounded border border-gray-200 shadow-sm p-6 mb-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-blue-900 mb-4">{userProfile?.displayName || currentUser?.email}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Enterprise Name</div>
                <div className="font-medium">{userProfile?.enterprise_name || 'Not provided'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Business Address</div>
                <div className="font-medium">{userProfile?.business_address || 'Not provided'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Business Telephone</div>
                <div className="font-medium">{userProfile?.telephone || 'Not provided'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Business Location</div>
                <div className="font-medium">{userProfile?.business_location || 'Not provided'}</div>
              </div>
            </div>
          </div>
          
          {/* Quota visualization */}
          {quotaInfo && (
            <div className="mt-8">
              <div className="flex justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-800">CO2 Equivalent Quota</h3>
                <div className="text-sm bg-blue-50 text-blue-700 rounded-full px-3 py-1">
                  Import Year {new Date().getFullYear()}
                </div>
              </div>
              
              <div className="bg-gray-100 rounded-full h-4 mb-4">
                <div 
                  className={`h-4 rounded-full ${
                    quotaInfo.percentage >= 90 ? 'bg-red-600' :
                    quotaInfo.percentage >= 75 ? 'bg-orange-500' :
                    quotaInfo.percentage >= 50 ? 'bg-yellow-500' :
                    'bg-blue-600'
                  }`}
                  style={{ width: `${quotaInfo.percentage}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-2 text-center">
                <div>
                  <div className="text-sm text-gray-500">Quota Remaining</div>
                  <div className="text-lg font-semibold text-blue-800">
                    {quotaInfo.remaining.toLocaleString()} <span className="text-xs font-normal">CO2eq</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Quota</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {quotaInfo.total.toLocaleString()} <span className="text-xs font-normal">CO2eq</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Approved Refrigerants Table */}
        <div className="bg-white rounded border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800">Approved Controlled Substance(s)</h3>
          </div>
          
          <div className="overflow-x-auto">
            {approvedRefrigerants.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Refrigerant
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chemical Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HS Code
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GWP Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approvedRefrigerants.map((refrigerant, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {refrigerant.ashrae}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {refrigerant.refrigerant || refrigerant.cs_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {refrigerant.hs_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {refrigerant.quota}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">
                {registrationStatus?.isRegistered 
                  ? 'No approved refrigerants found. Please contact the administrator.'
                  : 'You must register to view approved refrigerants.'
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;