// src/pages/test/TestPDFPage.js
import React, { useState } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import RegistrationCertificatePDF from '../../components/pdf/RegistrationCertificatePDF';
import ImportLicensePDF from '../../components/pdf/ImportLicensePDF';

const sampleUser = {
    id: 'test-user-001',
    displayName: 'Michael Johnson',
    display_name: 'Michael Johnson',
    enterprise_name: 'Caribbean Cooling Solutions Ltd.',
    business_address: '123 Main Street, Kingstown',
    business_location: 'St. Vincent',
    telephone: '+1 784 456 7890',
    importer_number: 4035,
  };

// Sample test data
const sampleRegistration = {
  id: 'test-reg-001',
  year: '2025',
  cert_no: '1042',
  name: 'Caribbean Cooling Solutions Ltd.',
  retail: false,
  admin_name: 'John Smith',
  admin_role: 'NOU Administrator',
  admin_signature_date: new Date().toISOString(),
  number: 4035,
  admin_signature_url: null, // Would be a URL to signature image
  refrigerants: [
    { ashrae: 'R-134a', refrigerant: '1,1,1,2-Tetrafluoroethane', hs_code: '2903.39', quota: 1430 },
    { ashrae: 'R-410A', refrigerant: 'R-32/125 (50/50)', hs_code: '3824.78', quota: 2088 },
    { ashrae: 'R-404A', refrigerant: 'R-125/143a/134a', hs_code: '3824.78', quota: 3922 },
    { ashrae: 'R-407C', refrigerant: 'R-32/125/134a', hs_code: '3824.78', quota: 1774 },
    { ashrae: 'R-22', refrigerant: 'Chlorodifluoromethane', hs_code: '2903.71', quota: 1810 },
  ],
};

const sampleImport = {
  id: 'test-import-001',
  import_year: '2025',
  import_number: 1089,
  user_id: 'test-user-001',
  name: 'Caribbean Cooling Solutions Ltd.',
  admin_name: 'John Smith',
  admin_role: 'NOU Administrator',
  admin_signature_date: new Date().toISOString(),
  admin_signature_url: null,
  imported_items: [
    {
      ashrae: 'R-134a',
      hs_code: '2903.39',
      cs_name: '1,1,1,2-Tetrafluoroethane',
      quantity: 50,
      volume: 13.6,
      designation: 'kg',
      co2_equivalent: 971800,
      export_country: 'China',
    },
    {
      ashrae: 'R-410A',
      hs_code: '3824.78',
      cs_name: 'R-32/125 Blend',
      quantity: 25,
      volume: 11.3,
      designation: 'kg',
      co2_equivalent: 589854,
      export_country: 'USA',
    },
    {
      ashrae: 'R-404A',
      hs_code: '3824.78',
      cs_name: 'R-125/143a/134a Blend',
      quantity: 10,
      volume: 10.9,
      designation: 'kg',
      co2_equivalent: 427498,
      export_country: 'Trinidad',
    },
  ],
};

const TestPDFPage = () => {
  const [activeTab, setActiveTab] = useState('registration');
  const [showPreview, setShowPreview] = useState(true);

  // Editable test data
  const [registration, setRegistration] = useState(sampleRegistration);
  const [user, setUser] = useState(sampleUser);
  const [importData, setImportData] = useState(sampleImport);

  const tabs = [
    { id: 'registration', label: 'Registration Certificate' },
    { id: 'import', label: 'Import License' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">PDF Generation Test Page</h1>
          <p className="text-sm text-blue-200">Test and preview PDF documents</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Controls</h2>

              {/* Toggle Preview */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showPreview}
                    onChange={(e) => setShowPreview(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show PDF Preview</span>
                </label>
              </div>

              {activeTab === 'registration' && (
                <>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Registration Data</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500">Year</label>
                      <input
                        type="text"
                        value={registration.year}
                        onChange={(e) => setRegistration({ ...registration, year: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Certificate No</label>
                      <input
                        type="text"
                        value={registration.cert_no}
                        onChange={(e) => setRegistration({ ...registration, cert_no: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Company Name</label>
                      <input
                        type="text"
                        value={registration.name}
                        onChange={(e) => setRegistration({ ...registration, name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={registration.retail}
                          onChange={(e) => setRegistration({ ...registration, retail: e.target.checked })}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Retail Permitted</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Admin Name</label>
                      <input
                        type="text"
                        value={registration.admin_name}
                        onChange={(e) => setRegistration({ ...registration, admin_name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                  </div>

                  <h3 className="text-sm font-medium text-gray-700 mt-6 mb-3">User Data</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500">Importer Number</label>
                      <input
                        type="number"
                        value={user.importer_number}
                        onChange={(e) => setUser({ ...user, importer_number: parseInt(e.target.value) })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Business Address</label>
                      <input
                        type="text"
                        value={user.business_address}
                        onChange={(e) => setUser({ ...user, business_address: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Business Location</label>
                      <input
                        type="text"
                        value={user.business_location}
                        onChange={(e) => setUser({ ...user, business_location: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'import' && (
                <>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Import Data</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500">Import Year</label>
                      <input
                        type="text"
                        value={importData.import_year}
                        onChange={(e) => setImportData({ ...importData, import_year: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Import Number</label>
                      <input
                        type="number"
                        value={importData.import_number}
                        onChange={(e) => setImportData({ ...importData, import_number: parseInt(e.target.value) })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Admin Name</label>
                      <input
                        type="text"
                        value={importData.admin_name}
                        onChange={(e) => setImportData({ ...importData, admin_name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                  </div>

                  <h3 className="text-sm font-medium text-gray-700 mt-6 mb-3">Imported Items</h3>
                  <p className="text-xs text-gray-500 mb-2">{importData.imported_items.length} items</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importData.imported_items.map((item, idx) => (
                      <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                        <div className="font-medium">{item.ashrae}</div>
                        <div className="text-gray-500">
                          {item.quantity} x {item.volume}{item.designation} from {item.export_country}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Download Buttons */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Download</h3>
                {activeTab === 'registration' ? (
                  <PDFDownloadLink
                    document={
                      <RegistrationCertificatePDF
                        registration={registration}
                        user={user}
                        refrigerants={registration.refrigerants}
                      />
                    }
                    fileName={`Registration_Certificate_${registration.year}_${registration.cert_no}.pdf`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {({ loading }) => (loading ? 'Generating...' : 'Download Registration PDF')}
                  </PDFDownloadLink>
                ) : (
                  <PDFDownloadLink
                    document={<ImportLicensePDF importData={importData} user={user} />}
                    fileName={`Import_License_${importData.import_year}_${importData.import_number}.pdf`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {({ loading }) => (loading ? 'Generating...' : 'Download Import License PDF')}
                  </PDFDownloadLink>
                )}
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setRegistration(sampleRegistration);
                  setUser(sampleUser);
                  setImportData(sampleImport);
                }}
                className="w-full mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Reset to Sample Data
              </button>
            </div>
          </div>

          {/* PDF Preview Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {activeTab === 'registration' ? 'Registration Certificate Preview' : 'Import License Preview'}
              </h2>

              {showPreview ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '800px' }}>
                  {activeTab === 'registration' ? (
                    <PDFViewer width="100%" height="100%" showToolbar={true}>
                      <RegistrationCertificatePDF
                        registration={registration}
                        user={user}
                        refrigerants={registration.refrigerants}
                      />
                    </PDFViewer>
                  ) : (
                    <PDFViewer width="100%" height="100%" showToolbar={true}>
                      <ImportLicensePDF importData={importData} user={user} />
                    </PDFViewer>
                  )}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-12 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-4">Preview disabled. Enable preview to see the PDF.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPDFPage;