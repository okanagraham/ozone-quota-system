// src/App.tsx (or App.js)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoModeProvider } from './context/DemoModeContext';
import SupabaseDiagnostic from './components/debug/SupabaseDiagnostic';

// Auth Pages
import LoginSelector from './pages/auth/LoginSelector';
import ImporterLogin from './pages/auth/ImporterLogin';
import AdminLogin from './pages/auth/AdminLogin';
import CustomsLogin from './pages/auth/CustomsLogin';
import Register from './pages/auth/Register';

// Demo Mode Components
import DemoModeBanner from './components/common/DemoModeBanner';
import DemoModeToggle from './components/common/DemoModeToggle';

// Importer Components
import Dashboard from './components/dashboard/Dashboard';
import RegistrationForm from './components/registration/RegistrationForm';
import ImportLicenseForm from './components/imports/ImportLicenseForm';
import ImportsList from './components/imports/ImportsList';
import ImportDetail from './components/imports/ImportDetail';
import CO2Calculator from './components/calculator/CO2Calculator';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import AdminRegistrations from './components/admin/AdminRegistrations';
import AdminRegistrationView from './components/admin/AdminRegistrationView';
import AdminImports from './components/admin/AdminImports';
import AdminImporters from './components/admin/AdminImporters';
import AdminRefrigerants from './components/admin/AdminRefrigerants';

// Customs Components
import CustomsDashboard from './components/customs/CustomsDashboard';
import CustomsRegistrations from './components/customs/CustomsRegistrations';
import CustomsImports from './components/customs/CustomsImports';

// ============================================================
// ROUTE GUARD COMPONENTS (Inline to avoid circular imports)
// ============================================================

// Loading Spinner Component
const LoadingSpinner = ({ color = 'blue-900' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-${color}`}></div>
  </div>
);

// Smart Root Redirect - Waits for auth before deciding where to go
const RootRedirect = () => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // If logged in, redirect to appropriate dashboard
  if (currentUser && userRole) {
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (userRole === 'customs') return <Navigate to="/customs/dashboard" replace />;
    if (userRole === 'technician') return <Navigate to="/technician/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  
  // If not logged in, go to login selector
  return <Navigate to="/login" replace />;
};

// Private Route - For importers/technicians
const PrivateRoute = ({ children, allowedRoles = ['importer', 'technician'] }) => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Wait for userRole to load
  if (!userRole) {
    return <LoadingSpinner />;
  }
  
  if (!allowedRoles.includes(userRole)) {
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (userRole === 'customs') return <Navigate to="/customs/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Admin Route
const AdminRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return <LoadingSpinner color="gray-800" />;
  
  if (!currentUser) {
    return <Navigate to="/login/admin" replace />;
  }
  
  // Wait for userRole to load
  if (!userRole) {
    return <LoadingSpinner color="gray-800" />;
  }
  
  if (userRole !== 'admin') {
    if (userRole === 'importer' || userRole === 'technician') {
      return <Navigate to="/dashboard" replace />;
    }
    if (userRole === 'customs') {
      return <Navigate to="/customs/dashboard" replace />;
    }
    return <Navigate to="/login/admin" replace />;
  }
  
  return children;
};

// Customs Route
const CustomsRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return <LoadingSpinner color="green-700" />;
  
  if (!currentUser) {
    return <Navigate to="/login/customs" replace />;
  }
  
  // Wait for userRole to load
  if (!userRole) {
    return <LoadingSpinner color="green-700" />;
  }
  
  if (userRole !== 'customs') {
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (userRole === 'importer' || userRole === 'technician') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/login/customs" replace />;
  }
  
  return children;
};

// Public Route - Redirect to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  // If logged in, redirect to appropriate dashboard
  if (currentUser && userRole) {
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (userRole === 'customs') return <Navigate to="/customs/dashboard" replace />;
    if (userRole === 'technician') return <Navigate to="/technician/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// ============================================================
// MAIN APP COMPONENT
// ============================================================

function AppRoutes() {
  return (
    <Routes>
      {/* ============================================ */}
      {/* ROOT & DEBUG ROUTES                         */}
      {/* ============================================ */}
      
      {/* Root - Smart redirect based on auth state */}
      <Route path="/" element={<RootRedirect />} />
      
      {/* Diagnostic page */}
      <Route path="/diagnostic" element={<SupabaseDiagnostic />} />
      
      {/* ============================================ */}
      {/* PUBLIC ROUTES - Login Pages                 */}
      {/* ============================================ */}
      
      {/* Login Selector - Choose account type */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginSelector />
          </PublicRoute>
        } 
      />
      
      {/* Importer/Technician Login */}
      <Route 
        path="/login/importer" 
        element={
          <PublicRoute>
            <ImporterLogin />
          </PublicRoute>
        } 
      />
      
      {/* Admin Login */}
      <Route 
        path="/login/admin" 
        element={
          <PublicRoute>
            <AdminLogin />
          </PublicRoute>
        } 
      />
      
      {/* Customs Login */}
      <Route 
        path="/login/customs" 
        element={
          <PublicRoute>
            <CustomsLogin />
          </PublicRoute>
        } 
      />
      
      {/* Registration */}
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* IMPORTER ROUTES                             */}
      {/* ============================================ */}
      <Route 
        path="/dashboard" 
        element={
          <PrivateRoute allowedRoles={['importer']}>
            <Dashboard />
          </PrivateRoute>
        } 
      />
      
      <Route 
        path="/registration/create" 
        element={
          <PrivateRoute allowedRoles={['importer']}>
            <RegistrationForm />
          </PrivateRoute>
        } 
      />
      
      <Route 
        path="/imports" 
        element={
          <PrivateRoute allowedRoles={['importer']}>
            <ImportsList />
          </PrivateRoute>
        } 
      />
      
      <Route 
        path="/imports/create" 
        element={
          <PrivateRoute allowedRoles={['importer']}>
            <ImportLicenseForm />
          </PrivateRoute>
        } 
      />
      
      <Route 
        path="/imports/:id" 
        element={
          <PrivateRoute allowedRoles={['importer']}>
            <ImportDetail />
          </PrivateRoute>
        } 
      />
      
      <Route 
        path="/calculator" 
        element={
          <PrivateRoute allowedRoles={['importer', 'admin', 'technician']}>
            <CO2Calculator />
          </PrivateRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* ADMIN ROUTES                                */}
      {/* ============================================ */}
      <Route 
        path="/admin/dashboard" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />
      
      <Route 
        path="/admin/registrations" 
        element={
          <AdminRoute>
            <AdminRegistrations />
          </AdminRoute>
        } 
      />
      
      <Route 
        path="/admin/registrations/:id" 
        element={
          <AdminRoute>
            <AdminRegistrationView />
          </AdminRoute>
        } 
      />
      
      <Route 
        path="/admin/imports" 
        element={
          <AdminRoute>
            <AdminImports />
          </AdminRoute>
        } 
      />
      
      <Route 
        path="/admin/importers" 
        element={
          <AdminRoute>
            <AdminImporters />
          </AdminRoute>
        } 
      />
      
      <Route 
        path="/admin/refrigerants" 
        element={
          <AdminRoute>
            <AdminRefrigerants />
          </AdminRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* CUSTOMS ROUTES (View Only)                  */}
      {/* ============================================ */}
      <Route 
        path="/customs/dashboard" 
        element={
          <CustomsRoute>
            <CustomsDashboard />
          </CustomsRoute>
        } 
      />
      
      <Route 
        path="/customs/registrations" 
        element={
          <CustomsRoute>
            <CustomsRegistrations />
          </CustomsRoute>
        } 
      />
      
      <Route 
        path="/customs/imports" 
        element={
          <CustomsRoute>
            <CustomsImports />
          </CustomsRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* TECHNICIAN ROUTES (Placeholder)             */}
      {/* ============================================ */}
      <Route 
        path="/technician/dashboard" 
        element={
          <PrivateRoute allowedRoles={['technician']}>
            <div className="min-h-screen bg-gray-100 p-8">
              <h1 className="text-2xl font-bold">Technician Dashboard</h1>
              <p className="text-gray-600 mt-2">Coming Soon</p>
            </div>
          </PrivateRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* CATCH ALL - Redirect to root                */}
      {/* ============================================ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <DemoModeProvider>
          {/* Demo Mode Banner */}
          <DemoModeBanner />
          
          {/* App Routes */}
          <AppRoutes />
          
          {/* Demo Mode Toggle Button */}
          <DemoModeToggle />
        </DemoModeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;