// src/components/layout/MainLayout.js
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MainLayout = ({ children, title = "National Ozone Unit" }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Navigation items
  const navigation = [
    { name: 'Registered Importer', href: '/dashboard' },
    { name: 'Import License', href: '/imports' },
    { name: 'CO2 Calculator', href: '/calculator' }
  ];
  
  // Current year
  const currentYear = new Date().getFullYear();
  
  // Check if a navigation item is active
  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Top header with government seal/logo */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold">
                  NOU
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold">{title}</h1>
                <p className="text-xs">Quota Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm">Current Year: <span className="font-semibold">{currentYear}</span></span>
              <button 
                className="bg-blue-800 hover:bg-blue-700 px-3 py-1 rounded-sm text-sm font-semibold transition"
                onClick={() => navigate('/support')}
              >
                Support
              </button>
              <button 
                className="bg-blue-800 hover:bg-blue-700 px-3 py-1 rounded-sm text-sm font-semibold transition"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-4 text-sm font-medium ${
                  isActive(item.href)
                    ? 'border-b-2 border-blue-900 text-blue-900'
                    : 'text-gray-500 hover:text-blue-900 hover:border-b-2 hover:border-blue-200'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content - flex-1 makes it take remaining space */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer - will be pushed to bottom */}
      <footer className="bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              © {currentYear} National Ozone Unit, Ministry of Environment
            </div>
            <div className="text-sm">
              <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
              <span className="mx-2">|</span>
              <Link to="/terms" className="hover:underline">Terms of Service</Link>
              <span className="mx-2">|</span>
              <Link to="/contact" className="hover:underline">Contact Us</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;