import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const CustomsRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-700"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login/customs" replace />;
  }
  
  if (userRole !== 'customs') {
    // Non-customs trying to access customs routes
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (userRole === 'importer' || userRole === 'technician') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/login/customs" replace />;
  }
  
  return children;
};

export default CustomsRoute;