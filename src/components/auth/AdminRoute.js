// src/components/auth/AdminRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * AdminRoute component that redirects to dashboard if user is not an admin
 */
const AdminRoute = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  
  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-900"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to dashboard if not admin
  if (userProfile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Render children if authenticated and admin
  return children;
};

export default AdminRoute;