// src/components/customs/CustomsDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase/supabaseClient';

const CustomsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    totalApprovedImports: 0,
    pendingInspections: 0
  });
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [scheduledInspections, setScheduledInspections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch approved registrations count
      const { count: regCount } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('completed', true)
        .eq('status', 'complete');

      // Fetch approved imports with scheduled inspections (visible to customs)
      const { data: approvedImports, error: importsError } = await supabase
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
        .order('inspection_date', { ascending: false })
        .limit(10);

      if (importsError) throw importsError;

      // Fetch imports pending inspection (arrived but not yet inspected)
      const { data: pendingInspections, count: pendingCount } = await supabase
        .from('imports')
        .select(`
          *,
          users:user_id (
            display_name,
            enterprise_name,
            importer_number
          )
        `, { count: 'exact' })
        .eq('arrived', true)
        .eq('inspected', false)
        .not('inspection_date', 'is', null)
        .order('inspection_date', { ascending: true });

      // Fetch recent approved registrations
      const { data: recentRegs } = await supabase
        .from('registrations')
        .select(`
          *,
          users:user_id (
            display_name,
            enterprise_name,
            importer_number
          )
        `)
        .eq('completed', true)
        .eq('status', 'complete')
        .order('admin_signature_date', { ascending: false })
        .limit(5);

      setStats({
        totalRegistrations: regCount || 0,
        totalApprovedImports: approvedImports?.length || 0,
        pendingInspections: pendingCount || 0
      });

      setRecentRegistrations(recentRegs || []);
      setScheduledInspections(pendingInspections || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setSearching(true);
      
      // Search importers by name, enterprise, or importer number
      const { data: users } = await supabase
        .from('users')
        .select(`
          id,
          display_name,
          enterprise_name,
          importer_number,
          business_address,
          telephone
        `)
        .eq('role', 'importer')
        .or(`display_name.ilike.%${searchTerm}%,enterprise_name.ilike.%${searchTerm}%,importer_number.eq.${parseInt(searchTerm) || 0}`);

      setSearchResults(users || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login/customs');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-green-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white p-1 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center text-white text-xs font-bold">
                  C&E
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold">Customs & Excise Portal</h1>
                <p className="text-xs text-green-200">National Ozone Unit - View Only Access</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="px-2 py-1 bg-green-700 rounded text-xs">VIEW ONLY</span>
              <button 
                onClick={handleLogout}
                className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-sm"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link to="/customs/dashboard" className="px-3 py-4 text-sm font-medium border-b-2 border-green-700 text-green-800">
              Dashboard
            </Link>
            <Link to="/customs/registrations" className="px-3 py-4 text-sm font-medium text-gray-500 hover:text-green-800">
              Registered Importers
            </Link>
            <Link to="/customs/imports" className="px-3 py-4 text-sm font-medium text-gray-500 hover:text-green-800">
              Approved Imports
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Registered Importers</div>
            <div className="text-3xl font-bold text-green-800">{stats.totalRegistrations}</div>
            <p className="text-xs text-gray-400 mt-1">Approved for current year</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Approved Import Licenses</div>
            <div className="text-3xl font-bold text-green-800">{stats.totalApprovedImports}</div>
            <p className="text-xs text-gray-400 mt-1">With scheduled inspections</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Pending Inspections</div>
            <div className="text-3xl font-bold text-orange-600">{stats.pendingInspections}</div>
            <p className="text-xs text-gray-400 mt-1">Awaiting customs clearance</p>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Search Registered Importers</h3>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Search by name, enterprise, or importer number..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-6 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-4 border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importer #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enterprise</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.importer_number || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{user.display_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{user.enterprise_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{user.telephone}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link to={`/customs/importer/${user.id}`} className="text-green-600 hover:text-green-800">
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scheduled Inspections */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Upcoming Inspections</h3>
            </div>
            <div className="p-6">
              {scheduledInspections.length > 0 ? (
                <div className="space-y-4">
                  {scheduledInspections.map((imp) => (
                    <div key={imp.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">Import #{imp.import_number}</p>
                          <p className="text-sm text-gray-500">{imp.users?.enterprise_name}</p>
                          <p className="text-xs text-gray-400">Importer #{imp.users?.importer_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-orange-600">
                            {formatDate(imp.inspection_date)}
                          </p>
                          <span className="inline-flex px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                            Pending Inspection
                          </span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Link 
                          to={`/customs/import/${imp.id}`}
                          className="text-sm text-green-600 hover:text-green-800"
                        >
                          View Import Details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No scheduled inspections</p>
              )}
            </div>
          </div>

          {/* Recent Registrations */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Recently Approved Importers</h3>
            </div>
            <div className="p-6">
              {recentRegistrations.length > 0 ? (
                <div className="space-y-4">
                  {recentRegistrations.map((reg) => (
                    <div key={reg.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{reg.users?.enterprise_name}</p>
                          <p className="text-sm text-gray-500">Certificate #{reg.cert_no}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Year {reg.year}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            Approved: {formatDate(reg.admin_signature_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent registrations</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-green-800 text-white mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-green-200">
            © {new Date().getFullYear()} National Ozone Unit - Customs & Excise Portal (View Only)
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CustomsDashboard;