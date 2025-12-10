// src/components/pdf/PDFPreview.js
import React, { useState } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import RegistrationCertificatePDF from './RegistrationCertificatePDF';
import ImportLicensePDF from './ImportLicensePDF';
import { useDemoMode } from '../../context/DemoModeContext';

const PDFPreview = ({ type, data, user, registration, onClose }) => {
  const { isDemoMode, getDemoRegistration, getDemoImport, getDemoUser } = useDemoMode();
  const [loading, setLoading] = useState(true);
  
  // Use demo data if in demo mode and no data provided
  const effectiveData = data || (isDemoMode ? (type === 'registration' ? getDemoRegistration() : getDemoImport()) : null);
  const effectiveUser = user || (isDemoMode ? getDemoUser() : null);
  const effectiveRegistration = registration || (isDemoMode ? getDemoRegistration() : null);
  
  if (!effectiveData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-4">No Data Available</h3>
          <p className="text-gray-600 mb-4">
            {isDemoMode 
              ? 'Demo data could not be loaded. Please try again.'
              : 'No document data available. Please ensure the document has been approved.'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }
  
  const getFileName = () => {
    if (type === 'registration') {
      return `Registration_Certificate_${effectiveData.cert_no || effectiveData.year}.pdf`;
    } else {
      return `Import_License_${effectiveData.import_year}_${effectiveData.import_number}.pdf`;
    }
  };
  
  const PDFDocument = type === 'registration' 
    ? <RegistrationCertificatePDF registration={effectiveData} user={effectiveUser} />
    : <ImportLicensePDF importData={effectiveData} user={effectiveUser} registration={effectiveRegistration} />;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${type === 'registration' ? 'bg-blue-100' : 'bg-green-100'}`}>
              <svg className={`w-6 h-6 ${type === 'registration' ? 'text-blue-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {type === 'registration' ? 'Registration Certificate' : 'Import License'}
              </h2>
              <p className="text-sm text-gray-500">
                {type === 'registration' 
                  ? `Certificate No: ${effectiveData.cert_no || 'N/A'}`
                  : `License No: IL-${effectiveData.import_year}-${effectiveData.import_number}`
                }
              </p>
            </div>
            {isDemoMode && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                Demo Preview
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <PDFDownloadLink
              document={PDFDocument}
              fileName={getFileName()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              {({ loading: pdfLoading }) => (
                <>
                  {pdfLoading ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  Download PDF
                </>
              )}
            </PDFDownloadLink>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-200 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating PDF preview...</p>
              </div>
            </div>
          )}
          <PDFViewer 
            width="100%" 
            height="100%" 
            showToolbar={true}
            className="border-0"
            onLoadSuccess={() => setLoading(false)}
          >
            {PDFDocument}
          </PDFViewer>
        </div>
      </div>
    </div>
  );
};

// Demo Preview Button Component
export const DemoPDFButton = ({ type = 'registration' }) => {
  const [showPreview, setShowPreview] = useState(false);
  const { isDemoMode } = useDemoMode();
  
  if (!isDemoMode) return null;
  
  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        className={`inline-flex items-center px-4 py-2 rounded-md text-white transition ${
          type === 'registration' 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Preview Demo {type === 'registration' ? 'Certificate' : 'License'}
      </button>
      
      {showPreview && (
        <PDFPreview
          type={type}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

export default PDFPreview;