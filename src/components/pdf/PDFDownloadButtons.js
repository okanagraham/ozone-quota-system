// src/components/pdf/PDFDownloadButtons.js
import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import RegistrationCertificatePDF from './RegistrationCertificatePDF';
import ImportLicensePDF from './ImportLicensePDF';
import { supabase } from '../../services/supabase/supabaseClient';

/**
 * Registration Certificate Download Button
 * Fetches data and provides download link
 */
export const RegistrationDownloadButton = ({ 
  registrationId, 
  className = '',
  children,
  variant = 'primary' // 'primary', 'secondary', 'link'
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (data) return; // Already fetched

    try {
      setLoading(true);
      setError(null);

      // Fetch registration
      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationId)
        .single();

      if (regError) throw regError;

      // Fetch user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', registration.user_id)
        .single();

      if (userError) throw userError;

      setData({
        registration,
        user,
        refrigerants: registration.refrigerants || [],
      });
    } catch (err) {
      console.error('Error fetching registration data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-colors';
    switch (variant) {
      case 'secondary':
        return `${baseStyles} px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50`;
      case 'link':
        return `${baseStyles} text-blue-600 hover:text-blue-800 underline`;
      default:
        return `${baseStyles} px-4 py-2 text-white bg-green-600 hover:bg-green-700`;
    }
  };

  if (error) {
    return (
      <span className="text-red-600 text-sm">Error loading certificate</span>
    );
  }

  if (!data) {
    return (
      <button
        onClick={fetchData}
        disabled={loading}
        className={`${getButtonStyles()} ${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </>
        ) : (
          children || (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Certificate
            </>
          )
        )}
      </button>
    );
  }

  const { registration, user, refrigerants } = data;
  const filename = `Registration_Certificate_${registration.year}_${registration.cert_no}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <RegistrationCertificatePDF
          registration={registration}
          user={user}
          refrigerants={refrigerants}
        />
      }
      fileName={filename}
      className={`${getButtonStyles()} ${className}`}
    >
      {({ loading: pdfLoading }) =>
        pdfLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Preparing...
          </>
        ) : (
          children || (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Certificate
            </>
          )
        )
      }
    </PDFDownloadLink>
  );
};

/**
 * Import License Download Button
 * Fetches data and provides download link
 */
export const ImportLicenseDownloadButton = ({ 
  importId, 
  className = '',
  children,
  variant = 'primary'
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (data) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch import
      const { data: importData, error: importError } = await supabase
        .from('imports')
        .select('*')
        .eq('id', importId)
        .single();

      if (importError) throw importError;

      // Fetch user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', importData.user_id)
        .single();

      if (userError) throw userError;

      setData({ importData, user });
    } catch (err) {
      console.error('Error fetching import data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-colors';
    switch (variant) {
      case 'secondary':
        return `${baseStyles} px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50`;
      case 'link':
        return `${baseStyles} text-green-600 hover:text-green-800`;
      default:
        return `${baseStyles} px-4 py-2 text-white bg-green-600 hover:bg-green-700`;
    }
  };

  if (error) {
    return (
      <span className="text-red-600 text-sm">Error loading license</span>
    );
  }

  if (!data) {
    return (
      <button
        onClick={fetchData}
        disabled={loading}
        className={`${getButtonStyles()} ${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </>
        ) : (
          children || (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download License
            </>
          )
        )}
      </button>
    );
  }

  const { importData, user } = data;
  const filename = `Import_License_${importData.import_year}_${importData.import_number}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <ImportLicensePDF
          importData={importData}
          user={user}
        />
      }
      fileName={filename}
      className={`${getButtonStyles()} ${className}`}
    >
      {({ loading: pdfLoading }) =>
        pdfLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Preparing...
          </>
        ) : (
          children || (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download License
            </>
          )
        )
      }
    </PDFDownloadLink>
  );
};

// Export index file for convenience
export default {
  RegistrationDownloadButton,
  ImportLicenseDownloadButton,
};