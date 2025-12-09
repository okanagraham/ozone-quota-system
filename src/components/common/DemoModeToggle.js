import React from 'react';
import { useDemoMode } from '../../context/DemoModeContext';

const DemoModeToggle = () => {
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  return (
    <button
      onClick={toggleDemoMode}
      className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-full shadow-lg transition-all duration-300 flex items-center space-x-2 ${
        isDemoMode 
          ? 'bg-purple-600 text-white hover:bg-purple-700' 
          : 'bg-gray-700 text-white hover:bg-gray-600'
      }`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isDemoMode ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        )}
      </svg>
      <span className="text-sm font-medium">
        Demo: {isDemoMode ? 'ON' : 'OFF'}
      </span>
    </button>
  );
};

export default DemoModeToggle;