// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DemoModeProvider } from './context/DemoModeContext';

// Auth components
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ImporterLogin from './pages/auth/ImporterLogin';
import AdminLogin from './pages/auth/AdminLogin';
import CustomsLogin from './pages/auth/CustomsLogin';
import LoginSelector from './pages/auth/LoginSelector';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import CustomsRoute from './components/auth/CustomsRoute';

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

// Customs components (View Only)
import CustomsDashboard from './components/customs/CustomsDashboard';
import CustomsRegistrations from './components/customs/CustomsRegistrations';
import CustomsImports from './components/customs/CustomsImports';
import CustomsCalculator from './components/customs/CustomsCalculator';

// PDF Preview components
import PDFPreview from './components/pdf/PDFPreview';

// Notifications page
import NotificationsPage from './pages/NotificationsPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <DemoModeProvider>
          <Routes>
            {/* ============================================ */}
            {/* PUBLIC ROUTES - Login Selection             */}
            {/* ============================================ */}
            <Route path="/login" element={<LoginSelector />} />
            <Route path="/login/importer" element={<ImporterLogin />} />
            <Route path="/login/admin" element={<AdminLogin />} />
            <Route path="/login/customs" element={<CustomsLogin />} />
            <Route path="/register" element={<Register />} />
            
            {/* Legacy login route redirect */}
            <Route path="/auth/login" element={<Navigate to="/login" replace />} />
            
            {/* ============================================ */}
            {/* IMPORTER PRIVATE ROUTES                     */}
            {/* ============================================ */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/registration/create" 
              element={
                <PrivateRoute>
                  <RegistrationForm />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/imports" 
              element={
                <PrivateRoute>
                  <ImportsList />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/imports/create" 
              element={
                <PrivateRoute>
                  <ImportLicenseForm />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/imports/:id" 
              element={
                <PrivateRoute>
                  <ImportDetail />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/calculator" 
              element={
                <PrivateRoute>
                  <CO2Calculator />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/notifications" 
              element={
                <PrivateRoute>
                  <NotificationsPage />
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
                  <AdminImportsManagement />
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
            
            <Route 
              path="/admin/notifications" 
              element={
                <AdminRoute>
                  <NotificationsPage />
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
            
            <Route 
              path="/customs/calculator" 
              element={
                <CustomsRoute>
                  <CustomsCalculator />
                </CustomsRoute>
              } 
            />
            
            {/* ============================================ */}
            {/* PDF PREVIEW ROUTES                          */}
            {/* ============================================ */}
            <Route 
              path="/pdf/registration/:id" 
              element={
                <PrivateRoute>
                  <PDFPreview type="registration" />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/pdf/import/:id" 
              element={
                <PrivateRoute>
                  <PDFPreview type="import" />
                </PrivateRoute>
              } 
            />
            
            {/* ============================================ */}
            {/* REDIRECTS                                   */}
            {/* ============================================ */}
            {/* Redirect root to login selector */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </DemoModeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;