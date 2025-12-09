import React from 'react';
import { useDemoMode } from '../../context/DemoModeContext';

const DemoModeBanner = () => {
  const { isDemoMode, showDemoBanner, hideBanner, toggleDemoMode } = useDemoMode();

  if (!isDemoMode || !showDemoBanner) return null;

  return (
    <div className="bg-purple-600 text-white px-4 py-2 text-center relative">
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">DEMO MODE ACTIVE</span>
        <span className="text-purple-200">|</span>
        <span className="text-sm">All restrictions bypassed • No data will be saved</span>
      </div>
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
        <button
          onClick={toggleDemoMode}
          className="text-xs bg-purple-700 hover:bg-purple-800 px-2 py-1 rounded"
        >
          Exit Demo
        </button>
        <button
          onClick={hideBanner}
          className="text-purple-200 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DemoModeBanner;