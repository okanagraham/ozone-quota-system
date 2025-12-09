// src/context/DemoModeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const DemoModeContext = createContext();

export function useDemoMode() {
  return useContext(DemoModeContext);
}

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

  // Save demo mode state to localStorage
  const toggleDemoMode = () => {
    const newState = !isDemoMode;
    setIsDemoMode(newState);
    localStorage.setItem('nouDemoMode', newState.toString());
    setShowDemoBanner(true);
  };

  const hideBanner = () => {
    setShowDemoBanner(false);
  };

  // Demo data for simulations
  const demoUserProfile = {
    id: 'demo-user-001',
    display_name: 'Demo User',
    enterprise_name: 'Demo Import Company Ltd.',
    business_address: '123 Demo Street, Capital City',
    business_location: 'Capital District',
    telephone: '+1-555-DEMO',
    email: 'demo@example.com',
    role: 'importer',
    importer_number: 9999,
    import_quota: 50000,
    balance_imports: 35000,
    cumulative_imports: 15000
  };

  const demoRegistration = {
    id: 'demo-reg-001',
    user_id: 'demo-user-001',
    year: new Date().getFullYear().toString(),
    status: 'complete',
    completed: true,
    cert_no: 'DEMO-001',
    refrigerants: [
      { ashrae: 'R-134a', refrigerant: 'Tetrafluoroethane', hs_code: '2903.39', quota: 1430 },
      { ashrae: 'R-410A', refrigerant: 'R-32/125 (50/50)', hs_code: '3824.78', quota: 2088 },
      { ashrae: 'R-404A', refrigerant: 'R-125/143a/134a', hs_code: '3824.78', quota: 3922 }
    ],
    admin_signature_date: new Date().toISOString()
  };

  const demoRefrigerants = [
    { id: '1', ashrae: 'R-134a', chemical_name: 'Tetrafluoroethane', hs_code: '2903.39', gwp_value: 1430, type: 'HFC' },
    { id: '2', ashrae: 'R-410A', chemical_name: 'R-32/125 (50/50)', hs_code: '3824.78', gwp_value: 2088, type: 'HFC' },
    { id: '3', ashrae: 'R-404A', chemical_name: 'R-125/143a/134a', hs_code: '3824.78', gwp_value: 3922, type: 'HFC' },
    { id: '4', ashrae: 'R-22', chemical_name: 'Chlorodifluoromethane', hs_code: '2903.45', gwp_value: 1810, type: 'HCFC' },
    { id: '5', ashrae: 'R-32', chemical_name: 'Difluoromethane', hs_code: '2903.39', gwp_value: 675, type: 'HFC' }
  ];

  // DEMO MODE BYPASS FUNCTIONS
  
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
   * Get demo registration for import license form
   */
  const getDemoRegistration = () => {
    return demoRegistration;
  };

  /**
   * Get demo user profile
   */
  const getDemoUserProfile = () => {
    return demoUserProfile;
  };

  /**
   * Get demo refrigerants list
   */
  const getDemoRefrigerants = () => {
    return demoRefrigerants;
  };

  /**
   * Get demo approved refrigerants (from registration)
   */
  const getDemoApprovedRefrigerants = () => {
    return demoRegistration.refrigerants;
  };

  const value = {
    isDemoMode,
    showDemoBanner,
    toggleDemoMode,
    hideBanner,
    
    // Bypass functions
    isRegistrationPeriodOpen,
    getRegistrationPeriodStatus,
    canCreateRegistration,
    canCreateImportLicense,
    canImportWithinQuota,
    
    // Demo data
    getDemoUserProfile,
    getDemoRegistration,
    getDemoRefrigerants,
    getDemoApprovedRefrigerants,
    
    // Simulation
    simulateSubmit
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}