// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DemoModeProvider } from './context/DemoModeContext';


// Auth components
import Login from './pages/auth/Login';
import AdminLogin from './pages/auth/AdminLogin';
import ImporterLogin from './pages/auth/ImporterLogin';
import TechnicianLogin from './pages/auth/TechnicianLogin';
import Register from './pages/auth/Register';
import TechnicianRegister from './pages/auth/TechnicianRegister';
import PrivateRoute from './components/auth/PrivateRoute';

// Main components
import Dashboard from './components/dashboard/Dashboard';
import RegistrationForm from './components/registration/RegistrationForm';
import ImportLicenseForm from './components/imports/ImportLicenseForm';
import ImportsList from './components/imports/ImportsList';
import CO2Calculator from './components/calculator/CO2Calculator';


// Demo Mode Components
import DemoModeBanner from './components/common/DemoModeBanner';
import DemoModeToggle from './components/common/DemoModeToggle';

//Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import AdminRegistrations from './components/admin/AdminRegistrations';
import AdminImports from './components/admin/AdminImports';
import AdminImporters from './components/admin/AdminImporters';
import AdminRefrigerants from './components/admin/AdminRefrigerants';



function App() {
  return (
    <Router>
      <DemoModeProvider>
        <AuthProvider>
          {/* Demo Mode Banner - Shows across all pages when in demo mode */}
          <DemoModeBanner />
          
          {/* Demo Mode Toggle - Floating button for enabling/disabling demo mode */}
          <DemoModeToggle />
          
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Private routes */}
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
              path="/calculator" 
              element={
                <PrivateRoute>
                  <CO2Calculator />
                </PrivateRoute>
              } 
            />
            
            {/* Redirect to dashboard by default */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

            // Inside your Routes component:
            <Route 
              path="/admin/dashboard" 
              element={
                <PrivateRoute>
                  <AdminDashboard />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/admin/registrations" 
              element={
                <PrivateRoute>
                  <AdminRegistrations />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/admin/imports" 
              element={
                <PrivateRoute>
                  <AdminImports />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/admin/importers" 
              element={
                <PrivateRoute>
                  <AdminImporters />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/admin/refrigerants" 
              element={
                <PrivateRoute>
                  <AdminRefrigerants />
                </PrivateRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </DemoModeProvider>
    </Router>
  );
}

export default App;