// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoModeProvider } from './context/DemoModeContext';

// Auth components
import Register from './pages/auth/Register';
import ImporterLogin from './pages/auth/ImporterLogin';
import AdminLogin from './pages/auth/AdminLogin';
import CustomsLogin from './pages/auth/CustomsLogin';
import LoginSelector from './pages/auth/LoginSelector';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Demo Mode Components
import DemoModeBanner from './components/common/DemoModeBanner';
import DemoModeToggle from './components/common/DemoModeToggle';

// Importer/User components
import Dashboard from './components/dashboard/Dashboard';
import RegistrationForm from './components/registration/RegistrationForm';
import ImportLicenseForm from './components/imports/ImportLicenseForm';
import ImportsList from './components/imports/ImportsList';
import ImportDetail from './components/imports/ImportDetail';
import CO2Calculator from './components/calculator/CO2Calculator';

// Admin components
import AdminDashboard from './components/admin/AdminDashboard';
import AdminRegistrations from './components/admin/AdminRegistrations';
import AdminRegistrationView from './components/admin/AdminRegistrationView';
import AdminImportsManagement from './components/admin/AdminImportsManagement';
import AdminRefrigerants from './components/admin/AdminRefrigerants';
import AdminUserManagement from './components/admin/AdminUserManagement';
import AdminSettings from './components/admin/AdminSettings';

// Customs components
import CustomsDashboard from './components/customs/CustomsDashboard';
import CustomsRegistrations from './components/customs/CustomsRegistrations';
import CustomsImports from './components/customs/CustomsImports';
import CustomsCalculator from './components/customs/CustomsCalculator';

// PDF Preview
import PDFPreview from './components/pdf/PDFPreview';
import PDFTestPage from './pages/test/PDFTestPage';

// Other components
import NotificationsPage from './pages/NotificationsPage';

// ============================================
// LOADING SPINNER COMPONENT
// ============================================
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-900 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// ============================================
// ROUTE GUARDS - All defined inline to use useAuth properly
// ============================================

// Private Route - Requires any authenticated user
const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!currentUser) return <Navigate to="/login" replace />;
  
  return children;
};

// Admin Route - Requires admin role
const AdminRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!currentUser) return <Navigate to="/login/admin" replace />;
  if (userRole !== 'admin') return <Navigate to="/dashboard" replace />;
  
  return children;
};

// Customs Route - Requires customs role
const CustomsRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!currentUser) return <Navigate to="/login/customs" replace />;
  if (userRole !== 'customs') return <Navigate to="/dashboard" replace />;
  
  return children;
};

// Public Route - Redirects to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (currentUser && userRole) {
    // Redirect to appropriate dashboard based on role
    switch (userRole) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'customs':
        return <Navigate to="/customs/dashboard" replace />;
      case 'technician':
        return <Navigate to="/technician/dashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }
  
  return children;
};

// Root Redirect - Smart redirect based on auth state
const RootRedirect = () => {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (!currentUser) return <Navigate to="/login" replace />;
  
  switch (userRole) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'customs':
      return <Navigate to="/customs/dashboard" replace />;
    case 'technician':
      return <Navigate to="/technician/dashboard" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

// ============================================
// APP ROUTES COMPONENT
// ============================================
function AppRoutes() {
  return (
    <>
      {/* Demo Mode Banner - shows at top when demo mode is active */}
      <DemoModeBanner />
      
      <Routes>
        {/* ROOT - Smart redirect */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<PublicRoute><LoginSelector /></PublicRoute>} />
        <Route path="/login/importer" element={<PublicRoute><ImporterLogin /></PublicRoute>} />
        <Route path="/login/admin" element={<PublicRoute><AdminLogin /></PublicRoute>} />
        <Route path="/login/customs" element={<PublicRoute><CustomsLogin /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        
        {/* PASSWORD RESET ROUTES */}
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route path="/test/pdf" element={<PDFTestPage />} />
        
        {/* IMPORTER ROUTES */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/registration/create" element={<PrivateRoute><RegistrationForm /></PrivateRoute>} />
        <Route path="/imports" element={<PrivateRoute><ImportsList /></PrivateRoute>} />
        <Route path="/imports/create" element={<PrivateRoute><ImportLicenseForm /></PrivateRoute>} />
        <Route path="/imports/:id" element={<PrivateRoute><ImportDetail /></PrivateRoute>} />
        <Route path="/calculator" element={<PrivateRoute><CO2Calculator /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        
        {/* ADMIN ROUTES */}
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/registrations" element={<AdminRoute><AdminRegistrations /></AdminRoute>} />
        <Route path="/admin/registrations/:id" element={<AdminRoute><AdminRegistrationView /></AdminRoute>} />
        <Route path="/admin/imports" element={<AdminRoute><AdminImportsManagement /></AdminRoute>} />
        <Route path="/admin/refrigerants" element={<AdminRoute><AdminRefrigerants /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUserManagement /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
        <Route path="/admin/notifications" element={<AdminRoute><NotificationsPage /></AdminRoute>} />
        
        {/* CUSTOMS ROUTES */}
        <Route path="/customs/dashboard" element={<CustomsRoute><CustomsDashboard /></CustomsRoute>} />
        <Route path="/customs/registrations" element={<CustomsRoute><CustomsRegistrations /></CustomsRoute>} />
        <Route path="/customs/imports" element={<CustomsRoute><CustomsImports /></CustomsRoute>} />
        <Route path="/customs/calculator" element={<CustomsRoute><CustomsCalculator /></CustomsRoute>} />
        
        {/* PDF PREVIEW ROUTES */}
        <Route path="/pdf/registration/:id" element={<PrivateRoute><PDFPreview type="registration" /></PrivateRoute>} />
        <Route path="/pdf/import/:id" element={<PrivateRoute><PDFPreview type="import" /></PrivateRoute>} />
        
        {/* CATCH ALL - Redirect to root (which will then redirect appropriately) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Demo Mode Toggle Button - floating button bottom-right */}
      <DemoModeToggle />
    </>
  );
}

// ============================================
// MAIN APP COMPONENT
// ============================================
function App() {
  return (
    <Router>
      <DemoModeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </DemoModeProvider>
    </Router>
  );
}

export default App;