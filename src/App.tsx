// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Auth components
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PrivateRoute from './components/auth/PrivateRoute';

// Main components
import Dashboard from './components/dashboard/Dashboard';
import RegistrationForm from './components/registration/RegistrationForm';
import ImportLicenseForm from './components/imports/ImportLicenseForm';
import ImportsList from './components/imports/ImportsList';
import CO2Calculator from './components/calculator/CO2Calculator';

function App() {
  return (
    <Router>
      <AuthProvider>
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
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;