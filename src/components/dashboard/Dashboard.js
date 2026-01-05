// src/components/dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDemoMode } from '../../context/DemoModeContext';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';
import EditProfileModal from '../profile/EditProfileModal';

const Dashboard = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { isDemoMode, isRegistrationPeriodOpen } = useDemoMode();
  const navigate = useNavigate();
  
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [approvedRefrigerants, setApprovedRefrigerants] = useState([]);
  const [registrationPeriod, setRegistrationPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [localUserProfile, setLocalUserProfile] = useState(null);
  
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login');
    }
  }, [authLoading, currentUser, navigate]);
  
  useEffect(() => {
    if (userProfile) {
      setLocalUserProfile(userProfile);
    }
  }, [userProfile]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (authLoading || !currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const currentYear = new Date().getFullYear().toString();
        const upcomingYear = (new Date().getFullYear() + 1).toString();
        
        // Check registration period (with admin override)
        let adminOverride = false;
        try {
          const { data: settings } = await supabase
            .from('settings')
            .select('registration_open_override')
            .single();
          adminOverride = settings?.registration_open_override || false;
        } catch (err) {
          console.log('No settings found');
        }
        
        const currentMonth = new Date().getMonth();
        const isOpen = isDemoMode || adminOverride || currentMonth === 11;
        
        setRegistrationPeriod({
          isOpen,
          registrationYear: upcomingYear,
          showNotification: true,
          adminOverride
        });
        
        // Check for APPROVED registration for current year
        const { data: approvedReg, error: approvedError } = await supabase
          .from('registrations')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('year', currentYear)
          .eq('completed', true)
          .eq('status', 'complete')
          .maybeSingle();
        
        if (approvedReg) {
          // Calculate days until expiry (end of current year)
          const endOfYear = new Date(parseInt(currentYear), 11, 31);
          const today = new Date();
          const daysUntilExpiry = Math.ceil((endOfYear - today) / (1000 * 60 * 60 * 24));
          
          setRegistrationStatus({
            isRegistered: true,
            registration: approvedReg,
            expiryDays: daysUntilExpiry > 0 ? daysUntilExpiry : 0
          });
          
          // Set approved refrigerants from this registration
          setApprovedRefrigerants(approvedReg.refrigerants || []);
        } else {
          setRegistrationStatus({
            isRegistered: false,
            registration: null,
            expiryDays: 0
          });
        }
        
        // Check for PENDING registration for upcoming year
        const { data: pendingReg, error: pendingError } = await supabase
          .from('registrations')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('year', upcomingYear)
          .neq('status', 'complete')
          .neq('status', 'Rejected')
          .maybeSingle();
        
        if (pendingReg) {
          setPendingRegistration(pendingReg);
        } else {
          setPendingRegistration(null);
        }
        
        // Get quota info from user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('import_quota, cumulative_imports, balance_imports')
          .eq('id', currentUser.id)
          .single();
        
        if (userData) {
          const total = userData.import_quota || 0;
          const used = userData.cumulative_imports || 0;
          const remaining = userData.balance_imports || 0;
          const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
          
          setQuotaInfo({ total, used, remaining, percentage });
        }
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser, authLoading, isDemoMode]);
  
  const handleProfileUpdated = (updatedProfile) => {
    setLocalUserProfile(prev => ({ ...prev, ...updatedProfile }));
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-900"></div>
      </div>
    );
  }
  
  if (!currentUser) return null;
  
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
  
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Importer Information</h2>
            <div className="text-sm text-gray-500">
              View Registration Information / Application Form
            </div>
          </div>
          
          {/* Registration Button Logic */}
          <div>
            {pendingRegistration ? (
              // Has pending registration for upcoming year
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-sm">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">
                      Pending Application for {pendingRegistration.year}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Status: {pendingRegistration.status}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Submitted: {new Date(pendingRegistration.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : registrationPeriod?.isOpen ? (
              // Registration period is open and no pending application
              <Link
                to="/registration/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-800 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Apply for {registrationPeriod.registrationYear} Registration
              </Link>
            ) : (
              // Registration period is closed
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-sm">
                <p className="text-sm text-gray-600">
                  Registration for {registrationPeriod?.registrationYear} opens in December
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Registration Notice for upcoming year */}
        {registrationPeriod && registrationPeriod.isOpen && !pendingRegistration && !registrationStatus?.isRegistered && (
          <div className="mb-6 p-4 rounded-md border bg-blue-50 border-blue-200">
            <div className="flex">
              <div className="flex-shrink-0 text-blue-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Registration for {registrationPeriod.registrationYear} is now open!
                  {registrationPeriod.adminOverride && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Override Active</span>
                  )}
                </h3>
                <p className="mt-2 text-sm text-blue-700">
                  Complete your registration before December 31st to import during {registrationPeriod.registrationYear}.
                </p>
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
              {registrationStatus?.isRegistered ? registrationStatus.expiryDays : '0'} 
              <span className="text-sm font-normal"> days</span>
            </div>
          </div>
          
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Importer Number</div>
            <div className="text-3xl font-bold text-blue-800">
              {localUserProfile?.importer_number || 'N/A'}
            </div>
          </div>
          
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Status</div>
            <div className={`text-xl font-semibold ${registrationStatus?.isRegistered ? 'text-green-600' : 'text-red-600'}`}>
              {registrationStatus?.isRegistered 
                ? registrationStatus.registration.status || 'Approved' 
                : pendingRegistration ? 'Pending' : 'Not Registered'}
            </div>
          </div>
        </div>
        
        {/* User Profile with Edit Button */}
        <div className="bg-white rounded border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-semibold text-blue-900">
              {localUserProfile?.display_name || localUserProfile?.displayName || currentUser?.email}
            </h3>
            <button
              onClick={() => setShowEditProfile(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Profile
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Enterprise Name</div>
              <div className="font-medium">{localUserProfile?.enterprise_name || 'Not provided'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Business Address</div>
              <div className="font-medium">{localUserProfile?.business_address || 'Not provided'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Business Telephone</div>
              <div className="font-medium">{localUserProfile?.telephone || 'Not provided'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Business Location</div>
              <div className="font-medium">{localUserProfile?.business_location || 'Not provided'}</div>
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
                  style={{ width: `${Math.min(quotaInfo.percentage, 100)}%` }}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refrigerant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chemical Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HS Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GWP Value</th>
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
                  : pendingRegistration
                    ? 'Your registration is pending approval. Approved refrigerants will appear here once approved.'
                    : 'You must register to view approved refrigerants.'
                }
              </div>
            )}
          </div>
        </div>
        
        {/* Edit Profile Modal */}
        {showEditProfile && (
          <EditProfileModal
            isOpen={showEditProfile}
            onClose={() => setShowEditProfile(false)}
            userProfile={localUserProfile}
            onProfileUpdated={handleProfileUpdated}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;