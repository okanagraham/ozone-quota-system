// src/context/DemoModeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const DemoModeContext = createContext();

export function useDemoMode() {
  return useContext(DemoModeContext);
}

// Complete demo data for PDF previews and testing
export const DEMO_DATA = {
  user: {
    id: 'demo-user-001',
    email: 'demo@example.com',
    display_name: 'John Smith',
    enterprise_name: 'Caribbean Cooling Solutions Ltd.',
    business_address: '123 Main Street, Kingstown',
    business_location: 'Kingstown, St. Vincent',
    telephone: '+1 (784) 456-7890',
    importer_number: 'IMP-2025-0042',
    role: 'importer',
    import_quota: 50000,
    cumulative_imports: 15000,
    balance_imports: 35000
  },
  
  registration: {
    id: 'demo-reg-001',
    user_id: 'demo-user-001',
    name: 'Caribbean Cooling Solutions Ltd.',
    year: new Date().getFullYear().toString(),
    cert_no: 'RC-2025-0042',
    status: 'complete',
    completed: true,
    retail: false,
    download_ready: true,
    can_generate: true,
    refrigerants: [
      { ashrae: 'R-134a', refrigerant: '1,1,1,2-Tetrafluoroethane', hs_code: '2903.45', quota: 1430 },
      { ashrae: 'R-410A', refrigerant: 'Difluoromethane/Pentafluoroethane', hs_code: '3824.78', quota: 2088 },
      { ashrae: 'R-32', refrigerant: 'Difluoromethane', hs_code: '2903.39', quota: 675 },
      { ashrae: 'R-404A', refrigerant: 'R-125/143a/134a', hs_code: '3824.78', quota: 3922 }
    ],
    signature_url: null,
    admin_signature: null,
    admin_name: 'Maria Johnson',
    admin_role: 'NOU Director',
    admin_signature_date: '2024-12-15T14:30:00Z',
    created_at: '2024-12-01T09:00:00Z'
  },
  
  import: {
    id: 'demo-imp-001',
    user_id: 'demo-user-001',
    registration_id: 'demo-reg-001',
    name: 'Caribbean Cooling Solutions Ltd.',
    import_year: new Date().getFullYear().toString(),
    import_number: 1001,
    status: 'Approved',
    arrived: true,
    approved: true,
    inspected: true,
    pending: false,
    invoice_uploaded: true,
    inspection_date: '2025-01-20T10:00:00Z',
    admin_name: 'Maria Johnson',
    admin_role: 'NOU Director',
    admin_signature: null,
    admin_signature_date: '2025-01-22T15:00:00Z',
    can_generate: true,
    download_ready: true,
    imported_items: [
      {
        ashrae: 'R-134a',
        cs_name: '1,1,1,2-Tetrafluoroethane',
        hs_code: '2903.45',
        export_country: 'China',
        quantity: 50,
        volume: 13.6,
        designation: 'kg',
        co2_equivalent: '971800.00'
      },
      {
        ashrae: 'R-410A',
        cs_name: 'Difluoromethane/Pentafluoroethane',
        hs_code: '3824.78',
        export_country: 'United States',
        quantity: 25,
        volume: 11.3,
        designation: 'kg',
        co2_equivalent: '589860.00'
      }
    ],
    documents: [
      { name: 'Invoice_2025_001.pdf', url: '#', uploadedAt: '2025-01-15T08:00:00Z' },
      { name: 'Bill_of_Lading.pdf', url: '#', uploadedAt: '2025-01-15T08:05:00Z' }
    ],
    created_at: '2025-01-10T11:00:00Z'
  },
  
  refrigerants: [
    { id: 'ref-1', ashrae: 'R-134a', chemical_name: '1,1,1,2-Tetrafluoroethane', hs_code: '2903.45', gwp_value: 1430, type: 'HFC' },
    { id: 'ref-2', ashrae: 'R-410A', chemical_name: 'Difluoromethane/Pentafluoroethane', hs_code: '3824.78', gwp_value: 2088, type: 'HFC' },
    { id: 'ref-3', ashrae: 'R-32', chemical_name: 'Difluoromethane', hs_code: '2903.39', gwp_value: 675, type: 'HFC' },
    { id: 'ref-4', ashrae: 'R-404A', chemical_name: 'R-125/143a/134a', hs_code: '3824.78', gwp_value: 3922, type: 'HFC' },
    { id: 'ref-5', ashrae: 'R-407C', chemical_name: 'R-32/125/134a', hs_code: '3824.78', gwp_value: 1774, type: 'HFC' },
    { id: 'ref-6', ashrae: 'R-22', chemical_name: 'Chlorodifluoromethane', hs_code: '2903.71', gwp_value: 1810, type: 'HCFC' }
  ]
};

export function DemoModeProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(true);

  // Load demo mode state from localStorage on mount
  useEffect(() => {
    const savedDemoMode = localStorage.getItem('nouDemoMode');
    if (savedDemoMode === 'true') {
      setIsDemoMode(true);
    }
  }, []);

  // Toggle demo mode and save to localStorage
  const toggleDemoMode = () => {
    const newState = !isDemoMode;
    setIsDemoMode(newState);
    localStorage.setItem('nouDemoMode', newState.toString());
    setShowDemoBanner(true);
  };

  // Enable demo mode
  const enableDemoMode = () => {
    setIsDemoMode(true);
    localStorage.setItem('nouDemoMode', 'true');
    setShowDemoBanner(true);
  };

  // Disable demo mode
  const disableDemoMode = () => {
    setIsDemoMode(false);
    localStorage.setItem('nouDemoMode', 'false');
  };

  // Hide banner (session only)
  const hideBanner = () => {
    setShowDemoBanner(false);
  };

  // =============================================
  // DEMO MODE BYPASS FUNCTIONS
  // =============================================
  
  /**
   * Check if registration period is open
   * In demo mode: ALWAYS returns true (bypasses December restriction)
   */
  const isRegistrationPeriodOpen = () => {
    if (isDemoMode) {
      return true; // Always open in demo mode
    }
    const currentMonth = new Date().getMonth();
    return currentMonth === 11; // December only in production
  };

  /**
   * Check registration period status with full details
   * In demo mode: Shows as open with simulated countdown
   */
  const getRegistrationPeriodStatus = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const registrationYear = (currentYear + 1).toString();

    if (isDemoMode) {
      return {
        isOpen: true,
        registrationYear,
        daysUntilOpen: 0,
        daysUntilClose: 25, // Simulated
        showNotification: true,
        message: 'DEMO MODE: Registration period restrictions bypassed'
      };
    }

    const currentMonth = now.getMonth();
    const isOpen = currentMonth === 11;
    
    const decemberFirst = new Date(currentYear, 11, 1);
    const decemberLast = new Date(currentYear, 11, 31, 23, 59, 59);
    
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilOpen = Math.max(0, Math.ceil((decemberFirst - now) / msPerDay));
    const daysUntilClose = isOpen ? Math.ceil((decemberLast - now) / msPerDay) : 0;

    return {
      isOpen,
      registrationYear,
      daysUntilOpen,
      daysUntilClose,
      showNotification: currentMonth >= 10 || currentMonth === 0
    };
  };

  /**
   * Check if user can create registration
   * In demo mode: ALWAYS returns true (bypasses existing registration check)
   */
  const canCreateRegistration = (existingRegistration) => {
    if (isDemoMode) {
      return true; // Always allow in demo mode
    }
    return !existingRegistration;
  };

  /**
   * Check if user can create import license
   * In demo mode: ALWAYS returns true (bypasses registration requirement)
   */
  const canCreateImportLicense = (hasActiveRegistration) => {
    if (isDemoMode) {
      return true; // Always allow in demo mode
    }
    return hasActiveRegistration;
  };

  /**
   * Check if quota allows import
   * In demo mode: ALWAYS returns true (bypasses quota check)
   */
  const canImportWithinQuota = (requestedAmount, remainingQuota) => {
    if (isDemoMode) {
      return true; // Always allow in demo mode
    }
    return requestedAmount <= remainingQuota;
  };

  /**
   * Check if user has approved registration for current year
   * In demo mode: ALWAYS returns true with demo registration
   */
  const hasApprovedRegistration = (userRegistrations) => {
    if (isDemoMode) {
      return {
        hasRegistration: true,
        registration: DEMO_DATA.registration
      };
    }
    
    const currentYear = new Date().getFullYear().toString();
    const approved = userRegistrations?.find(
      r => r.year === currentYear && r.completed && r.status === 'complete'
    );
    
    return {
      hasRegistration: !!approved,
      registration: approved || null
    };
  };

  // =============================================
  // DEMO DATA GETTERS
  // =============================================

  /**
   * Get demo user profile
   */
  const getDemoUser = () => DEMO_DATA.user;
  const getDemoUserProfile = () => DEMO_DATA.user; // Alias for compatibility

  /**
   * Get demo registration
   */
  const getDemoRegistration = () => DEMO_DATA.registration;

  /**
   * Get demo import
   */
  const getDemoImport = () => DEMO_DATA.import;

  /**
   * Get demo refrigerants list
   */
  const getDemoRefrigerants = () => DEMO_DATA.refrigerants;

  /**
   * Get demo approved refrigerants (from registration)
   */
  const getDemoApprovedRefrigerants = () => DEMO_DATA.registration.refrigerants;

  /**
   * Get demo data by type
   */
  const getDemoData = (type) => {
    switch (type) {
      case 'user':
        return DEMO_DATA.user;
      case 'registration':
        return DEMO_DATA.registration;
      case 'import':
        return DEMO_DATA.import;
      case 'refrigerants':
        return DEMO_DATA.refrigerants;
      default:
        return null;
    }
  };

  // =============================================
  // DEMO SIMULATION FUNCTIONS
  // =============================================

  /**
   * Simulate form submission in demo mode
   * Returns success without actually saving to database
   */
  const simulateSubmit = async (formType, data) => {
    if (!isDemoMode) {
      throw new Error('simulateSubmit should only be called in demo mode');
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`[DEMO MODE] Simulated ${formType} submission:`, data);

    return {
      success: true,
      message: `[DEMO] ${formType} submitted successfully (not saved)`,
      data: {
        id: `demo-${formType}-${Date.now()}`,
        ...data,
        created_at: new Date().toISOString()
      }
    };
  };

  /**
   * Simulate API call in demo mode
   */
  const simulateApiCall = async (operation, delay = 800) => {
    if (!isDemoMode) {
      throw new Error('simulateApiCall should only be called in demo mode');
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    console.log(`[DEMO MODE] Simulated API call: ${operation}`);
    return { success: true, operation };
  };

  /**
   * Get quota info - returns demo data in demo mode
   */
  const getQuotaInfo = (actualQuotaInfo) => {
    if (isDemoMode) {
      return {
        total: DEMO_DATA.user.import_quota,
        used: DEMO_DATA.user.cumulative_imports,
        remaining: DEMO_DATA.user.balance_imports,
        percentage: Math.round((DEMO_DATA.user.cumulative_imports / DEMO_DATA.user.import_quota) * 100)
      };
    }
    return actualQuotaInfo;
  };

  /**
   * Get registration status - returns demo data in demo mode
   */
  const getRegistrationStatus = (actualStatus) => {
    if (isDemoMode) {
      return {
        isRegistered: true,
        registration: DEMO_DATA.registration,
        expiryDays: 365 - Math.floor((new Date() - new Date(DEMO_DATA.registration.created_at)) / (1000 * 60 * 60 * 24))
      };
    }
    return actualStatus;
  };

  // =============================================
  // CONTEXT VALUE
  // =============================================

  const value = {
    // State
    isDemoMode,
    showDemoBanner,
    showBanner: showDemoBanner, // Alias for compatibility
    
    // Mode controls
    toggleDemoMode,
    enableDemoMode,
    disableDemoMode,
    hideBanner,
    
    // Bypass functions (CRITICAL - do not remove)
    isRegistrationPeriodOpen,
    getRegistrationPeriodStatus,
    canCreateRegistration,
    canCreateImportLicense,
    canImportWithinQuota,
    hasApprovedRegistration,
    
    // Demo data getters
    getDemoUser,
    getDemoUserProfile,
    getDemoRegistration,
    getDemoImport,
    getDemoRefrigerants,
    getDemoApprovedRefrigerants,
    getDemoData,
    
    // Status helpers
    getQuotaInfo,
    getRegistrationStatus,
    
    // Simulation functions
    simulateSubmit,
    simulateApiCall,
    
    // Raw demo data (for direct access)
    DEMO_DATA
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export default DemoModeContext;