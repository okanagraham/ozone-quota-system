import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext_working';

const PrivateRoute = ({ children, allowedRoles = ['importer', 'technician'] }) => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-900"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login/importer" replace />;
  }
  
  if (!allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (userRole === 'customs') return <Navigate to="/customs/dashboard" replace />;
    return <Navigate to="/login/importer" replace />;
  }
  
  return children;
};

export default PrivateRoute;