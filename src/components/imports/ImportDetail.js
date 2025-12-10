// src/components/imports/ImportDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase/supabaseClient';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ImportLicensePDF from '../pdf/ImportLicensePDF';
import MainLayout from '../layout/MainLayout';

const ImportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [importData, setImportData] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [markingArrived, setMarkingArrived] = useState(false);
  const [showArrivalForm, setShowArrivalForm] = useState(false);

  useEffect(() => {
    fetchImportData();
  }, [id]);

  const fetchImportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('imports')
        .select(`
          *,
          users:user_id (id, display_name, enterprise_name, email, importer_number),
          registrations:registration_id (id, cert_no, year, name)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      setImportData(data);
      setRegistration(data.registrations);
    } catch (err) {
      console.error('Error fetching import:', err);
      setError('Failed to load import details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (files.length === 0) return [];

    const uploadedDocs = [];
    
    for (const file of files) {
      const fileName = `${id}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('import-documents')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('import-documents')
        .getPublicUrl(fileName);

      uploadedDocs.push({
        name: file.name,
        url: publicUrl,
        path: fileName,
        uploaded_at: new Date().toISOString(),
        type: file.type,
        size: file.size
      });
    }

    return uploadedDocs;
  };

  const handleMarkArrived = async () => {
    if (files.length === 0) {
      setError('Please upload at least one invoice/document before marking as arrived.');
      return;
    }

    try {
      setMarkingArrived(true);
      setError(null);

      // Upload files
      const uploadedDocs = await uploadDocuments();
      const existingDocs = importData.arrival_documents || [];
      const allDocs = [...existingDocs, ...uploadedDocs];

      // Get the invoice URL (first PDF uploaded)
      const invoiceDoc = uploadedDocs.find(d => d.type === 'application/pdf') || uploadedDocs[0];

      // Update import record
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          arrived: true,
          invoice_uploaded: true,
          invoice_url: invoiceDoc?.url || null,
          arrival_documents: allDocs,
          arrival_date: new Date().toISOString(),
          status: 'Awaiting Inspection Schedule',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Create notification for admin
      await supabase.from('notifications').insert({
        type: 'SHIPMENT_ARRIVED',
        title: 'Shipment Arrived',
        message: `Import #${importData.import_number} - ${importData.name} has marked their shipment as arrived.`,
        target_role: 'admin',
        related_id: id,
        related_type: 'import'
      });

      setFiles([]);
      setShowArrivalForm(false);
      await fetchImportData();

    } catch (err) {
      console.error('Error marking arrived:', err);
      setError(err.message || 'Failed to mark shipment as arrived.');
    } finally {
      setMarkingArrived(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved') || s.includes('ready') || s.includes('complete')) return 'bg-green-100 text-green-800';
    if (s.includes('awaiting') || s.includes('pending')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('rejected') || s.includes('denied')) return 'bg-red-100 text-red-800';
    if (s.includes('inspect')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <MainLayout title="Import Details">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
        </div>
      </MainLayout>
    );
  }

  if (error && !importData) {
    return (
      <MainLayout title="Import Details">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-red-700">{error}</p>
          </div>
          <Link to="/imports" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Imports
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Import Details">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <Link to="/imports" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
              ← Back to Imports
            </Link>
            <h2 className="text-2xl font-semibold text-gray-800">
              Import #{importData?.import_number || 'N/A'}
            </h2>
            <p className="text-gray-500">{importData?.name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(importData?.status)}`}>
            {importData?.status || 'Pending'}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Import Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Import Information</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Import Year</p>
              <p className="font-medium">{importData?.import_year}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Submission Date</p>
              <p className="font-medium">{formatDate(importData?.submission_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Registration Cert</p>
              <p className="font-medium">{registration?.cert_no || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Inspection Date</p>
              <p className="font-medium">{formatDate(importData?.inspection_date)}</p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-1 rounded text-xs ${importData?.arrived ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {importData?.arrived ? '✓ Arrived' : '○ Not Arrived'}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${importData?.inspected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {importData?.inspected ? '✓ Inspected' : '○ Not Inspected'}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${importData?.approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {importData?.approved ? '✓ Approved' : '○ Not Approved'}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${importData?.paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {importData?.paid ? '✓ Paid' : '○ Not Paid'}
            </span>
          </div>
        </div>

        {/* Imported Items Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Imported Items</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refrigerant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HS Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO2 Eq.</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(importData?.imported_items || []).map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{item.ashrae}</div>
                      <div className="text-gray-500 text-xs">{item.cs_name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.hs_code}</td>
                    <td className="px-4 py-3 text-sm">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm">{item.volume} {item.designation}</td>
                    <td className="px-4 py-3 text-sm">{item.export_country}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.co2_equivalent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mark as Arrived Section - Only show if not arrived yet */}
        {!importData?.arrived && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mark Shipment as Arrived</h3>
            
            {!showArrivalForm ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">
                  When your shipment arrives, upload the invoice and supporting documents to notify the administrator.
                </p>
                <button
                  onClick={() => setShowArrivalForm(true)}
                  className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-700"
                >
                  Mark Shipment as Arrived
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Documents (Invoice required, additional documents optional)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Accepted: PDF, JPG, PNG, DOC, DOCX. Max 10MB per file.
                  </p>
                </div>

                {/* Selected Files List */}
                {files.length > 0 && (
                  <div className="border rounded-md p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Selected Files:</p>
                    <ul className="space-y-2">
                      {files.map((file, index) => (
                        <li key={index} className="flex justify-between items-center text-sm">
                          <span className="truncate">{file.name}</span>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800 ml-2"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowArrivalForm(false);
                      setFiles([]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={markingArrived}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMarkArrived}
                    disabled={markingArrived || files.length === 0}
                    className={`px-4 py-2 rounded-md text-white ${
                      markingArrived || files.length === 0
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {markingArrived ? 'Uploading...' : 'Confirm Arrival & Upload'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Uploaded Documents */}
        {(importData?.arrival_documents?.length > 0 || importData?.invoice_url) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Documents</h3>
            
            <ul className="divide-y divide-gray-200">
              {importData?.arrival_documents?.map((doc, index) => (
                <li key={index} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">Uploaded: {formatDate(doc.uploaded_at)}</p>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View
                  </a>
                </li>
              ))}
              {!importData?.arrival_documents?.length && importData?.invoice_url && (
                <li className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Invoice</p>
                  </div>
                  <a
                    href={importData.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Download License - Only show if approved */}
        {importData?.download_ready && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-6">
            <h3 className="text-lg font-medium text-green-800 mb-2">Import License Ready</h3>
            <p className="text-green-700 text-sm mb-4">
              Your import license has been approved and is ready for download.
            </p>
            <PDFDownloadLink
              document={
                <ImportLicensePDF 
                  importData={importData} 
                  user={importData.users} 
                  registration={registration}
                />
              }
              fileName={`import-license-${importData.import_number}.pdf`}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {({ loading: pdfLoading }) => 
                pdfLoading ? 'Generating PDF...' : 'Download Import License'
              }
            </PDFDownloadLink>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ImportDetail;