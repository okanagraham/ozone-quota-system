import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase/supabaseClient';

const CustomsRegistrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchRegistrations();
  }, [yearFilter]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('registrations')
        .select(`
          *,
          users:user_id (
            display_name,
            enterprise_name,
            importer_number,
            business_address,
            telephone
          )
        `)
        .eq('completed', true)
        .eq('status', 'complete')
        .order('admin_signature_date', { ascending: false });

      if (yearFilter) {
        query = query.eq('year', yearFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      reg.users?.display_name?.toLowerCase().includes(search) ||
      reg.users?.enterprise_name?.toLowerCase().includes(search) ||
      reg.cert_no?.toString().includes(search) ||
      reg.users?.importer_number?.toString().includes(search)
    );
  });

  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'N/A';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-green-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <span className="text-green-800 font-bold text-xs">C&E</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Registered Importers</h1>
              <p className="text-xs text-green-200">View Only Access</p>
            </div>
          </div>
          <span className="px-2 py-1 bg-green-700 rounded text-xs">VIEW ONLY</span>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex space-x-8">
          <Link to="/customs/dashboard" className="px-3 py-4 text-sm text-gray-500 hover:text-green-800">Dashboard</Link>
          <Link to="/customs/registrations" className="px-3 py-4 text-sm font-medium border-b-2 border-green-700 text-green-800">Registered Importers</Link>
          <Link to="/customs/imports" className="px-3 py-4 text-sm text-gray-500 hover:text-green-800">Approved Imports</Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by name, enterprise, or certificate..."
              className="px-4 py-2 border rounded-md focus:ring-green-500 focus:border-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="px-4 py-2 border rounded-md focus:ring-green-500 focus:border-green-500"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="">All Years</option>
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="text-right text-sm text-gray-500 py-2">
              Showing {filteredRegistrations.length} approved registrations
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-700 mx-auto"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cert #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importer #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enterprise</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{reg.cert_no}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{reg.users?.importer_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{reg.users?.enterprise_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{reg.year}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(reg.admin_signature_date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{reg.users?.telephone}</td>
                  </tr>
                ))}
                {filteredRegistrations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No registrations found</td>
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

export default CustomsRegistrations;