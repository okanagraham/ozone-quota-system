// =============================================
// src/components/common/DemoModeToggle.js
// =============================================
import React, { useState } from 'react';
import { useDemoMode } from '../../context/DemoModeContext';

const DemoModeToggle = () => {
  const { isDemoMode, toggleDemoMode, demoData } = useDemoMode();
  const [showMenu, setShowMenu] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(null);

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="relative">
          {/* Menu when expanded */}
          {showMenu && (
            <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-64 mb-2">
              <h3 className="font-semibold text-gray-800 mb-3">Demo Mode Controls</h3>
              
              {/* Toggle Switch */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Demo Mode</span>
                <button
                  onClick={toggleDemoMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDemoMode ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDemoMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Demo Actions */}
              {isDemoMode && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs text-gray-500 mb-2">Preview Sample Documents:</p>
                  <button
                    onClick={() => setShowPDFPreview('registration')}
                    className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded text-blue-700"
                  >
                    📄 Preview Registration Certificate
                  </button>
                  <button
                    onClick={() => setShowPDFPreview('import')}
                    className="w-full text-left px-3 py-2 text-sm bg-green-50 hover:bg-green-100 rounded text-green-700"
                  >
                    📄 Preview Import License
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowMenu(false)}
                className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>
          )}
          
          {/* Main Toggle Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all ${
              isDemoMode 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-800 text-white'
            }`}
            title={isDemoMode ? 'Demo Mode ON' : 'Demo Mode OFF'}
          >
            {isDemoMode ? '🎓' : '⚙️'}
          </button>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPDFPreview && (
        <DemoPDFPreviewModal 
          type={showPDFPreview} 
          demoData={demoData}
          onClose={() => setShowPDFPreview(null)} 
        />
      )}
    </>
  );
};

// Simple PDF Preview Modal for Demo
const DemoPDFPreviewModal = ({ type, demoData, onClose }) => {
  const data = type === 'registration' ? demoData.sampleRegistration : demoData.sampleImport;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {type === 'registration' ? 'Demo Registration Certificate' : 'Demo Import License'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            &times;
          </button>
        </div>
        
        <div className="p-6">
          {type === 'registration' ? (
            <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-blue-900">REGISTRATION CERTIFICATE</h1>
                <p className="text-blue-700">National Ozone Unit</p>
              </div>
              <div className="space-y-3 text-sm">
                <p><strong>Certificate No:</strong> {data.cert_no}</p>
                <p><strong>Year:</strong> {data.year}</p>
                <p><strong>Enterprise:</strong> {data.name}</p>
                <p><strong>Status:</strong> <span className="text-green-600 font-medium">Approved</span></p>
                <div className="mt-4">
                  <strong>Approved Refrigerants:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {data.refrigerants?.map((ref, i) => (
                      <li key={i}>{ref.ashrae} - {ref.refrigerant}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-green-900">IMPORT LICENSE</h1>
                <p className="text-green-700">National Ozone Unit</p>
              </div>
              <div className="space-y-3 text-sm">
                <p><strong>License No:</strong> {data.import_number}</p>
                <p><strong>Year:</strong> {data.import_year}</p>
                <p><strong>Importer:</strong> {data.name}</p>
                <p><strong>Status:</strong> <span className="text-green-600 font-medium">{data.status}</span></p>
                <div className="mt-4">
                  <strong>Imported Items:</strong>
                  <table className="w-full mt-2 text-xs">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="p-2 text-left">Item</th>
                        <th className="p-2 text-left">Origin</th>
                        <th className="p-2 text-left">Qty</th>
                        <th className="p-2 text-left">CO2eq</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.imported_items?.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{item.ashrae}</td>
                          <td className="p-2">{item.export_country}</td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">{item.co2_equivalent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => alert('PDF download would trigger here with @react-pdf/renderer')}
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoModeToggle;