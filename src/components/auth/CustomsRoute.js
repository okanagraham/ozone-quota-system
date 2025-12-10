// src/components/auth/CustomsRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * CustomsRoute - Protects routes that should only be accessible by customs users
 * Customs users have view-only access to approved registrations and imports
 */
const CustomsRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  
  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-700"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login/customs" replace />;
  }
  
  // Redirect to appropriate dashboard if wrong role
  if (userRole !== 'customs') {
    switch (userRole) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'importer':
        return <Navigate to="/dashboard" replace />;
      case 'technician':
        return <Navigate to="/technician/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }
  
  // Render children if user is customs
  return children;
};

export default CustomsRoute;