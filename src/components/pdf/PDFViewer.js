// src/components/pdf/PDFViewer.js
import React, { useState, useEffect } from 'react';
import { PDFViewer as ReactPDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import RegistrationCertificatePDF from './RegistrationCertificatePDF';
import ImportLicensePDF from './ImportLicensePDF';
import { supabase } from '../../services/supabase/supabaseClient';

/**
 * Registration Certificate Viewer Component
 */
export const RegistrationCertificateViewer = ({ registrationId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    registration: null,
    user: null,
    refrigerants: [],
  });

  useEffect(() => {
    const fetchData = async () => {
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
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (registrationId) {
      fetchData();
    }
  }, [registrationId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-800 text-center mb-4">Error loading certificate: {error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { registration, user, refrigerants } = data;
  const filename = `Registration_Certificate_${registration?.year}_${registration?.cert_no}.pdf`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Registration Certificate - {registration?.year}
          </h2>
          <div className="flex space-x-3">
            <PDFDownloadLink
              document={
                <RegistrationCertificatePDF
                  registration={registration}
                  user={user}
                  refrigerants={refrigerants}
                />
              }
              fileName={filename}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              {({ loading: downloadLoading }) =>
                downloadLoading ? (
                  'Preparing...'
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </>
                )
              }
            </PDFDownloadLink>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 p-4">
          <ReactPDFViewer width="100%" height="100%" showToolbar={false}>
            <RegistrationCertificatePDF
              registration={registration}
              user={user}
              refrigerants={refrigerants}
            />
          </ReactPDFViewer>
        </div>
      </div>
    </div>
  );
};

/**
 * Import License Viewer Component
 */
export const ImportLicenseViewer = ({ importId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    importData: null,
    user: null,
  });

  useEffect(() => {
    const fetchData = async () => {
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

        setData({
          importData,
          user,
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (importId) {
      fetchData();
    }
  }, [importId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading import license...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-800 text-center mb-4">Error loading license: {error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { importData, user } = data;
  const filename = `Import_License_${importData?.import_year}_${importData?.import_number}.pdf`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Import License #{importData?.import_number} - {importData?.import_year}
          </h2>
          <div className="flex space-x-3">
            <PDFDownloadLink
              document={
                <ImportLicensePDF
                  importData={importData}
                  user={user}
                />
              }
              fileName={filename}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              {({ loading: downloadLoading }) =>
                downloadLoading ? (
                  'Preparing...'
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </>
                )
              }
            </PDFDownloadLink>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 p-4">
          <ReactPDFViewer width="100%" height="100%" showToolbar={false}>
            <ImportLicensePDF
              importData={importData}
              user={user}
            />
          </ReactPDFViewer>
        </div>
      </div>
    </div>
  );
};

export default { RegistrationCertificateViewer, ImportLicenseViewer };