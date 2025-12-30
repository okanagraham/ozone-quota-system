// src/components/layout/AdminLayout.js
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = ({ children, title = "Admin Dashboard" }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Admin navigation items
  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Registrations', href: '/admin/registrations' },
    { name: 'Import Licenses', href: '/admin/imports' },
    { name: 'Importers', href: '/admin/importers' },
    { name: 'Technicians', href: '/admin/technicians' },
    { name: 'Refrigerants', href: '/admin/refrigerants' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Settings', href: '/admin/settings' },
  ];
  
  // Current year
  const currentYear = new Date().getFullYear();
  
  // Check if a navigation item is active
  const isActive = (href) => {
    if (href === '/admin/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
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
    <div className="bg-gray-100 min-h-screen flex flex-col">
      {/* Top header with government seal/logo */}
      <header className="bg-gray-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold text-sm">
                  NOU
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold">{title}</h1>
                <p className="text-xs text-gray-300">License and Quota Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                {userProfile?.display_name || currentUser?.email}
              </span>
              <span className="px-2 py-1 bg-purple-600 text-xs rounded-full">Admin</span>
              <button 
                className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm font-medium transition"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive(item.href)
                    ? 'border-purple-600 text-purple-700 bg-purple-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              © {currentYear} National Ozone Unit, Ministry of Tourism & Sustainable Development
            </div>
            <div className="text-sm text-gray-400">
              <span>Admin Portal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;