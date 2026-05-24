'use client';

import React, { useEffect, useState } from 'react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceType: string;
  description: string;
  createdAt: string;
}

interface Allocation {
  id: string;
  createdAt: string;
  lead: Lead;
}

interface Provider {
  id: string;
  name: string;
  email: string;
  quota: number;
  currentLeadsCount: number;
  isActive: boolean;
  allocations: Allocation[];
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const response = await fetch('/api/providers');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch provider stats.');
      }
      setProviders(data.providers);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  // Poll for data every 5 seconds
  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(() => {
      fetchDashboardData(true); // Silent update (no loading spinner flashing)
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation and Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Lead Allocation Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Real-time monitoring of provider quotas and lead assignments. Updates every 5 seconds.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col items-end space-y-2">
            <div className="flex space-x-4 text-sm">
              <a href="/request-service" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Request Service Form
              </a>
              <a href="/dashboard" className="text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1">
                Provider Dashboard
              </a>
              <a href="/test-tools" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Webhook Test Tools
              </a>
            </div>
            {lastRefreshed && (
              <span className="text-xs text-slate-400">
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && providers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-600 text-sm">Connecting to PostgreSQL and loading dashboard...</p>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-sm flex items-start space-x-2">
            <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Grid */}
        {!loading && providers.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-slate-500">No providers found in the database. Please run the seed script to populate providers.</p>
            <code className="block mt-4 p-3 bg-slate-100 rounded text-xs max-w-md mx-auto text-slate-700">npx prisma db seed</code>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {providers.map((provider) => {
            const remainingQuota = Math.max(0, provider.quota - provider.currentLeadsCount);
            const usagePercent = Math.min(100, (provider.currentLeadsCount / provider.quota) * 100);
            const isFull = provider.currentLeadsCount >= provider.quota;

            return (
              <div
                key={provider.id}
                className={`bg-white rounded-2xl shadow-sm border transition-all overflow-hidden flex flex-col ${
                  isFull ? 'border-amber-200 shadow-amber-50/50' : 'border-slate-200'
                }`}
              >
                {/* Provider Card Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{provider.name}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">{provider.email}</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        {provider.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          provider.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Quota Progress Meter */}
                  <div className="mt-6">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Leads Received: {provider.currentLeadsCount} / {provider.quota}</span>
                      <span className={isFull ? 'text-amber-600' : 'text-indigo-600'}>
                        {remainingQuota} Left
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isFull ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Allocated Leads Sub-Section */}
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Assigned Leads ({provider.allocations.length})
                    </h3>

                    {provider.allocations.length === 0 ? (
                      <p className="text-sm text-slate-400 italic py-4">No leads assigned yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {provider.allocations.map((allocation) => (
                          <div
                            key={allocation.id}
                            className="p-3 border border-slate-100 rounded-lg text-xs bg-slate-50/50 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex justify-between font-semibold text-slate-800 mb-1">
                              <span>{allocation.lead.name}</span>
                              <span className="text-indigo-600">{allocation.lead.serviceType}</span>
                            </div>
                            <div className="text-slate-500 flex justify-between">
                              <span>Phone: {allocation.lead.phone}</span>
                              <span>{new Date(allocation.createdAt).toLocaleDateString()}</span>
                            </div>
                            {allocation.lead.description && (
                              <p className="text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100 italic line-clamp-2">
                                &quot;{allocation.lead.description}&quot;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
