// src/context/DemoModeContext.js
// FIXED VERSION - Preserves all functionality, fixes potential loops
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const DemoModeContext = createContext(null);

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    // Return safe defaults if used outside provider
    return {
      isDemoMode: false,
      toggleDemoMode: () => {},
      demoData: {},
      isRegistrationPeriodOpen: () => false,
      canCreateImport: () => false,
    };
  }
  return context;
}

// Sample demo data - defined outside component to prevent recreation
const DEMO_DATA = {
  sampleRegistration: {
    id: 'demo-reg-001',
    cert_no: 'DEMO-2025-001',
    year: '2025',
    name: 'Demo Enterprise Ltd',
    status: 'complete',
    completed: true,
    refrigerants: [
      { ashrae: 'R-134a', refrigerant: 'Tetrafluoroethane', hs_code: '2903.39', quota: 1430 },
      { ashrae: 'R-410A', refrigerant: 'Difluoromethane/Pentafluoroethane', hs_code: '3824.78', quota: 2088 },
    ],
    admin_signature_date: new Date().toISOString(),
  },
  sampleImport: {
    id: 'demo-imp-001',
    import_number: 'DEMO-IMP-001',
    import_year: '2025',
    name: 'Demo Enterprise Ltd',
    status: 'Approved',
    approved: true,
    imported_items: [
      { ashrae: 'R-134a', export_country: 'China', quantity: 100, volume: 13.6, designation: 'kg', co2_equivalent: '194480' },
    ],
    submission_date: new Date().toISOString(),
  },
  sampleUser: {
    id: 'demo-user-001',
    display_name: 'Demo User',
    enterprise_name: 'Demo Enterprise Ltd',
    importer_number: 9999,
    import_quota: 500000,
    balance_imports: 450000,
    cumulative_imports: 50000,
  },
};

// Safe localStorage helper
const safeLocalStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('DemoMode: localStorage not available:', e.message);
    }
    return null;
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn('DemoMode: localStorage not available:', e.message);
    }
    return false;
  },
};

export function DemoModeProvider({ children }) {
  // Initialize state with lazy initializer to read localStorage only once
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const saved = safeLocalStorage.getItem('nouDemoMode');
    return saved === 'true';
  });

  // Toggle function - memoized to prevent unnecessary re-renders
  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      const newValue = !prev;
      safeLocalStorage.setItem('nouDemoMode', String(newValue));
      console.log('DemoMode:', newValue ? 'ENABLED' : 'DISABLED');
      return newValue;
    });
  }, []);

  // Demo mode bypass functions - memoized
  const isRegistrationPeriodOpen = useCallback(() => {
    if (isDemoMode) {
      console.log('DemoMode: Bypassing registration period check');
      return true;
    }
    const month = new Date().getMonth();
    return month === 11; // December (0-indexed)
  }, [isDemoMode]);

  const canCreateImport = useCallback((hasApprovedRegistration) => {
    if (isDemoMode) {
      console.log('DemoMode: Bypassing import registration check');
      return true;
    }
    return hasApprovedRegistration;
  }, [isDemoMode]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    isDemoMode,
    toggleDemoMode,
    demoData: DEMO_DATA,
    isRegistrationPeriodOpen,
    canCreateImport,
  }), [isDemoMode, toggleDemoMode, isRegistrationPeriodOpen, canCreateImport]);

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export default DemoModeContext;