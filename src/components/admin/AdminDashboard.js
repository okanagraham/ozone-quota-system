// src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase/supabaseClient';
import MainLayout from '../layout/MainLayout';

const AdminDashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    pendingRegistrations: 0,
    pendingImports: 0,
    needingInspection: 0,
    totalImporters: 0,
    activeRegistrations: 0,
    totalImports: 0,
    pendingTechnicians: 0
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Redirect non-admins
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [userProfile, navigate]);
  
  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all stats in parallel
        const [
          { count: pendingRegs },
          { count: pendingImps },
          { count: needInspection },
          { count: totalImps },
          { count: activeRegs },
          { count: allImports },
          { count: pendingTechs }
        ] = await Promise.all([
          supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'Awaiting Approval'),
          supabase.from('imports').select('*', { count: 'exact', head: true }).eq('pending', true),
          supabase.from('imports').select('*', { count: 'exact', head: true }).eq('arrived', true).eq('inspected', false),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'importer'),
          supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('completed', true),
          supabase.from('imports').select('*', { count: 'exact', head: true }),
          supabase.from('technicians').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
        ]);
        
        setStats({
          pendingRegistrations: pendingRegs || 0,
          pendingImports: pendingImps || 0,
          needingInspection: needInspection || 0,
          totalImporters: totalImps || 0,
          activeRegistrations: activeRegs || 0,
          totalImports: allImports || 0,
          pendingTechnicians: pendingTechs || 0
        });
        
        // Fetch recent activity
        await fetchRecentActivity();
        
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    if (userProfile?.role === 'admin') {
      fetchStats();
    }
  }, [userProfile]);
  
  const fetchRecentActivity = async () => {
    try {
      // Get recent registrations
      const { data: recentRegs } = await supabase
        .from('registrations')
        .select('id, user_id, year, status, created_at, users(enterprise_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Get recent imports
      const { data: recentImps } = await supabase
        .from('imports')
        .select('id, user_id, import_number, status, created_at, users(enterprise_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Combine and sort
      const activities = [
        ...(recentRegs || []).map(r => ({
          type: 'registration',
          id: r.id,
          description: `Registration application for ${r.year} by ${r.users?.enterprise_name || 'Unknown'}`,
          status: r.status,
          timestamp: r.created_at
        })),
        ...(recentImps || []).map(i => ({
          type: 'import',
          id: i.id,
          description: `Import License #${i.import_number} by ${i.users?.enterprise_name || 'Unknown'}`,
          status: i.status,
          timestamp: i.created_at
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
      
      setRecentActivity(activities);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('approved') || statusLower.includes('complete')) {
      return 'bg-green-100 text-green-800';
    } else if (statusLower.includes('awaiting') || statusLower.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (statusLower.includes('rejected')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };
  
  if (loading) {
    return (
      <MainLayout title="Admin Dashboard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (error) {
    return (
      <MainLayout title="Admin Dashboard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="Admin Dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">Admin Dashboard</h2>
          <p className="text-sm text-gray-500">Overview of system activity and pending actions</p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Pending Registrations */}
          <div 
            className="bg-white rounded border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate('/admin/registrations')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">Pending Registrations</div>
              {stats.pendingRegistrations > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Action Required
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-blue-800">{stats.pendingRegistrations}</div>
          </div>
          
          {/* Pending Imports */}
          <div 
            className="bg-white rounded border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate('/admin/imports')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">Pending Imports</div>
              {stats.pendingImports > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Action Required
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-blue-800">{stats.pendingImports}</div>
          </div>
          
          {/* Needing Inspection */}
          <div 
            className="bg-white rounded border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate('/admin/imports?filter=inspection')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">Needing Inspection</div>
              {stats.needingInspection > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Urgent
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-blue-800">{stats.needingInspection}</div>
          </div>
          
          {/* Pending Technicians */}
          <div 
            className="bg-white rounded border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition"
            onClick={() => navigate('/admin/technicians')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">Pending Technicians</div>
              {stats.pendingTechnicians > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Action Required
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-blue-800">{stats.pendingTechnicians}</div>
          </div>
          
          {/* Total Importers */}
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-2">Total Importers</div>
            <div className="text-3xl font-bold text-gray-700">{stats.totalImporters}</div>
          </div>
          
          {/* Active Registrations */}
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-2">Active Registrations</div>
            <div className="text-3xl font-bold text-gray-700">{stats.activeRegistrations}</div>
          </div>
          
          {/* Total Imports */}
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-2">Total Imports</div>
            <div className="text-3xl font-bold text-gray-700">{stats.totalImports}</div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white rounded border border-gray-200 shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/admin/registrations')}
              className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition"
            >
              <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Registrations</div>
                <div className="text-xs text-gray-500">Review & approve</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/admin/imports')}
              className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition"
            >
              <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Import Licenses</div>
                <div className="text-xs text-gray-500">Manage imports</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/admin/importers')}
              className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition"
            >
              <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Importers</div>
                <div className="text-xs text-gray-500">Manage quotas</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/admin/refrigerants')}
              className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition"
            >
              <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Refrigerants</div>
                <div className="text-xs text-gray-500">Manage database</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/admin/technicians')}
              className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition"
            >
              <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Technicians</div>
                <div className="text-xs text-gray-500">Certifications</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/admin/reports')}
              className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition"
            >
              <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Reports</div>
                <div className="text-xs text-gray-500">Generate reports</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/admin/settings')}
              className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition"
            >
              <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Settings</div>
                <div className="text-xs text-gray-500">System config</div>
              </div>
            </button>
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white rounded border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(activity.timestamp)}</p>
                    </div>
                    <span className={`ml-4 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;