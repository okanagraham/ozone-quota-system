// src/components/customs/CustomsLayout.js
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase/supabaseClient';

const CustomsLayout = ({ children, title = "Customs & Excise Portal" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const navigation = [
    { name: 'Dashboard', href: '/customs/dashboard' },
    { name: 'Registered Importers', href: '/customs/registrations' },
    { name: 'Approved Imports', href: '/customs/imports' },
    { name: 'CO2 Calculator', href: '/customs/calculator' },
  ];

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-green-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-green-800 flex items-center justify-center text-white font-semibold text-xs">
                  C&E
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold">{title}</h1>
                <p className="text-xs text-green-200">NOU Quota Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-green-700 rounded text-xs font-medium">
                VIEW ONLY
              </span>
              <span className="text-sm">Year: <span className="font-semibold">{currentYear}</span></span>
              <button 
                className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded-sm text-sm font-semibold transition"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-4 text-sm font-medium ${
                  isActive(item.href)
                    ? 'border-b-2 border-green-700 text-green-800'
                    : 'text-gray-500 hover:text-green-800 hover:border-b-2 hover:border-green-200'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-green-800 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              © {currentYear} National Ozone Unit - Customs Portal
            </div>
            <div className="text-sm text-green-200">
              Read-only access for Customs & Excise officials
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomsLayout;