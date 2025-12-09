import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase/supabaseClient';

const CustomsImports = () => {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, inspected

  useEffect(() => {
    fetchImports();
  }, [filter]);

  const fetchImports = async () => {
    try {
      setLoading(true);
      
      // Customs can only see approved imports with scheduled inspections
      let query = supabase
        .from('imports')
        .select(`
          *,
          users:user_id (
            display_name,
            enterprise_name,
            importer_number
          )
        `)
        .eq('approved', true)
        .not('inspection_date', 'is', null)
        .order('inspection_date', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('inspected', false);
      } else if (filter === 'inspected') {
        query = query.eq('inspected', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setImports(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'N/A';

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-green-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <span className="text-green-800 font-bold text-xs">C&E</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Approved Import Licenses</h1>
              <p className="text-xs text-green-200">View Only Access</p>
            </div>
          </div>
          <span className="px-2 py-1 bg-green-700 rounded text-xs">VIEW ONLY</span>
        </div>
      </header>

      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex space-x-8">
          <Link to="/customs/dashboard" className="px-3 py-4 text-sm text-gray-500">Dashboard</Link>
          <Link to="/customs/registrations" className="px-3 py-4 text-sm text-gray-500">Registered Importers</Link>
          <Link to="/customs/imports" className="px-3 py-4 text-sm font-medium border-b-2 border-green-700 text-green-800">Approved Imports</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filter Buttons */}
        <div className="mb-6 flex space-x-2">
          {['all', 'pending', 'inspected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === f 
                  ? 'bg-green-700 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All Imports' : f === 'pending' ? 'Pending Inspection' : 'Inspected'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-700 mx-auto"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Import #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspection Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {imports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{imp.import_number}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-gray-900">{imp.users?.enterprise_name}</div>
                      <div className="text-gray-500 text-xs">#{imp.users?.importer_number}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{imp.import_year}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(imp.inspection_date)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        imp.inspected 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {imp.inspected ? 'Inspected' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/customs/import/${imp.id}`} className="text-green-600 hover:text-green-800 text-sm">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
                {imports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No imports found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomsImports;