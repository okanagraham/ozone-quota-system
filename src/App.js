// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoModeProvider } from './context/DemoModeContext';

// Auth Pages
import LoginSelector from './pages/auth/LoginSelector';
import ImporterLogin from './pages/auth/ImporterLogin';
import AdminLogin from './pages/auth/AdminLogin';
import CustomsLogin from './pages/auth/CustomsLogin';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Demo Mode Components
import DemoModeBanner from './components/common/DemoModeBanner';
import DemoModeToggle from './components/common/DemoModeToggle';

// Main Components
import Dashboard from './components/dashboard/Dashboard';
import RegistrationForm from './components/registration/RegistrationForm';
import ImportLicenseForm from './components/imports/ImportLicenseForm';
import ImportsList from './components/imports/ImportsList';
import CO2Calculator from './components/calculator/CO2Calculator';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import AdminRegistrations from './components/admin/AdminRegistrations';
import AdminRegistrationView from './components/admin/AdminRegistrationView';
import AdminImports from './components/admin/AdminImports';
import AdminImporters from './components/admin/AdminImporters';
import AdminRefrigerants from './components/admin/AdminRefrigerants';
import FirebaseExport from './components/admin/FirebaseExport';

// Simple wrapper that checks auth
function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

// Admin only wrapper
function AdminRoute({ children }) {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login/admin" replace />;
  if (userRole !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

// The actual routes
function AppRoutes() {
  const { currentUser, userRole } = useAuth();
  
  return (
    <Routes>
      {/* PUBLIC - Auth pages */}
      <Route path="/login" element={
        currentUser ? <Navigate to="/dashboard" replace /> : <LoginSelector />
      } />
      <Route path="/login/importer" element={
        currentUser ? <Navigate to="/dashboard" replace /> : <ImporterLogin />
      } />
      <Route path="/login/admin" element={
        currentUser ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />
      } />
      <Route path="/login/customs" element={
        currentUser ? <Navigate to="/customs/dashboard" replace /> : <CustomsLogin />
      } />
      <Route path="/register" element={
        currentUser ? <Navigate to="/dashboard" replace /> : <Register />
      } />
      <Route path="/forgot-password" element={
        currentUser ? <Navigate to="/dashboard" replace /> : <ForgotPassword />
      } />
      
      {/* IMPORTER ROUTES */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/registration/create" element={<PrivateRoute><RegistrationForm /></PrivateRoute>} />
      <Route path="/imports" element={<PrivateRoute><ImportsList /></PrivateRoute>} />
      <Route path="/imports/create" element={<PrivateRoute><ImportLicenseForm /></PrivateRoute>} />
      <Route path="/calculator" element={<PrivateRoute><CO2Calculator /></PrivateRoute>} />
      
      {/* ADMIN ROUTES */}
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/registrations" element={<AdminRoute><AdminRegistrations /></AdminRoute>} />
      <Route path="/admin/registrations/:id" element={<AdminRoute><AdminRegistrationView /></AdminRoute>} />
      <Route path="/admin/imports" element={<AdminRoute><AdminImports /></AdminRoute>} />
      <Route path="/admin/importers" element={<AdminRoute><AdminImporters /></AdminRoute>} />
      <Route path="/admin/refrigerants" element={<AdminRoute><AdminRefrigerants /></AdminRoute>} />
      <Route path="/admin/export" element={<FirebaseExport />} />
      
      {/* CUSTOMS ROUTES */}
      <Route path="/customs/dashboard" element={
        <PrivateRoute><div className="p-8">Customs Dashboard - Coming Soon</div></PrivateRoute>
      } />
      
      {/* TECHNICIAN ROUTES */}
      <Route path="/technician/dashboard" element={
        <PrivateRoute><div className="p-8">Technician Dashboard - Coming Soon</div></PrivateRoute>
      } />
      
      {/* ROOT - redirect based on auth */}
      <Route path="/" element={
        currentUser 
          ? (userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />)
          : <Navigate to="/login" replace />
      } />
      
      {/* CATCH ALL */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <DemoModeProvider>
        <AuthProvider>
          <DemoModeBanner />
          <DemoModeToggle />
          <AppRoutes />
        </AuthProvider>
      </DemoModeProvider>
    </Router>
  );
}

export default App;