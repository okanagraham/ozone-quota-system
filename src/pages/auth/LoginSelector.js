// src/pages/auth/LoginSelector.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LoginSelector = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const loginOptions = [
    {
      title: 'Importer / Technician',
      description: 'Access your import licenses, registrations, and certifications',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'blue',
      route: '/login/importer'
    },
    {
      title: 'Administrator',
      description: 'Manage registrations, approvals, and system settings',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: 'gray',
      route: '/login/admin'
    },
    {
      title: 'Customs Officer',
      description: 'View approved registrations and import licenses',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      color: 'green',
      route: '/login/customs'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        hover: 'hover:border-blue-500',
        text: 'text-blue-900',
        icon: 'text-blue-600'
      },
      gray: {
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        hover: 'hover:border-gray-600',
        text: 'text-gray-900',
        icon: 'text-gray-700'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        hover: 'hover:border-green-500',
        text: 'text-green-900',
        icon: 'text-green-600'
      }
    };
    return colors[color];
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-blue-900 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              NOU
            </div>
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
            National Ozone Unit
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            Quota Management System
          </p>
          <p className="text-sm text-gray-500">
            Please select your account type to continue
          </p>
        </div>

        {/* Login Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {loginOptions.map((option) => {
            const colors = getColorClasses(option.color);
            return (
              <button
                key={option.route}
                onClick={() => navigate(option.route)}
                className={`${colors.bg} ${colors.border} ${colors.hover} border-2 rounded-lg p-8 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1 text-left`}
              >
                <div className={`${colors.icon} mb-4`}>
                  {option.icon}
                </div>
                <h3 className={`text-xl font-bold ${colors.text} mb-2`}>
                  {option.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {option.description}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-gray-700">
                  <span>Sign in</span>
                  <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* New Account */}
        <div className="text-center pt-8">
          <p className="text-gray-600">
            Need to register as an importer?{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Create an account
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-200">
          <p>© {currentYear} National Ozone Unit, Ministry of Environment</p>
          <p className="mt-1">All rights reserved</p>
        </div>
      </div>
    </div>
  );
};

export default LoginSelector;