'use client';

import React, { useState } from 'react';
import { ServiceType } from '@prisma/client';

interface ProviderInfo {
  id: string;
  name: string;
  email: string;
}

interface LeadInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceType: string;
  description: string;
  createdAt: string;
}

export default function RequestServicePage() {
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [description, setDescription] = useState('');

  // Status state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignedProviders, setAssignedProviders] = useState<ProviderInfo[]>([]);
  const [createdLead, setCreatedLead] = useState<LeadInfo | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          serviceType,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setSuccess(true);
      setAssignedProviders(data.assignedProviders);
      setCreatedLead(data.lead);

      // Reset form fields
      setName('');
      setEmail('');
      setPhone('');
      setServiceType('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl mx-auto">
        {/* Navigation links for simple testing */}
        <div className="flex justify-between mb-8 text-sm">
          <a href="/request-service" className="text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1">
            Request Service
          </a>
          <a href="/dashboard" className="text-slate-600 hover:text-indigo-600 transition-colors">
            Provider Dashboard
          </a>
          <a href="/test-tools" className="text-slate-600 hover:text-indigo-600 transition-colors">
            Webhook Test Tools
          </a>
        </div>

        <div className="bg-white shadow-xl rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-indigo-600 px-6 py-8 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Submit Service Request
            </h1>
            <p className="text-indigo-100 text-sm mt-2">
              Fill out the form below to match with our expert providers immediately.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {success && createdLead && (
              <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center space-x-2 text-emerald-800 font-semibold text-lg mb-2">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Request Created Successfully!</span>
                </div>
                <p className="text-emerald-700 text-sm mb-4">
                  Your lead is created and has been allocated to exactly 3 eligible service providers.
                </p>

                <div className="bg-white rounded-lg p-4 border border-emerald-100 text-sm text-slate-700 space-y-2 mb-4">
                  <div><strong className="text-slate-900">Lead ID:</strong> {createdLead.id}</div>
                  <div><strong className="text-slate-900">Name:</strong> {createdLead.name}</div>
                  <div><strong className="text-slate-900">Service:</strong> {createdLead.serviceType}</div>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold text-slate-900 text-sm mb-2">Assigned Providers:</h4>
                  <ul className="space-y-2">
                    {assignedProviders.map((p) => (
                      <li key={p.id} className="bg-emerald-100/50 rounded-lg p-3 border border-emerald-200/50 flex flex-col sm:flex-row sm:justify-between text-xs text-slate-800">
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        <span className="text-slate-600">{p.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setSuccess(false)}
                  className="mt-6 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow transition-colors"
                >
                  Submit Another Request
                </button>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-sm flex items-start space-x-2">
                <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    id="phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="555-0199"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="serviceType" className="block text-sm font-medium text-slate-700 mb-1">
                    Requested Service Pool
                  </label>
                  <select
                    id="serviceType"
                    required
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as ServiceType)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>-- Select a service pool --</option>
                    <option value={ServiceType.SERVICE_1}>SERVICE_1 (Mandatory P1 + rotates P2,P3,P4)</option>
                    <option value={ServiceType.SERVICE_2}>SERVICE_2 (Mandatory P5 + rotates P6,P7,P8)</option>
                    <option value={ServiceType.SERVICE_3}>SERVICE_3 (Mandatory P1,P4 + rotates P2,P3,P5,P6,P7,P8)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                    Request Details
                  </label>
                  <textarea
                    id="description"
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please explain the details of the service request..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-lg hover:shadow-xl transition-all disabled:bg-indigo-400 disabled:shadow-none flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Allocating Providers...</span>
                    </>
                  ) : (
                    <span>Submit Service Request</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
