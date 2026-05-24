'use client';

import React, { useState } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

let logCounter = 0;

export default function TestToolsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [resetLoading, setResetLoading] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const addLog = (type: LogEntry['type'], message: string) => {
    logCounter++;
    setLogs((prev) => [
      { id: logCounter, timestamp: new Date().toLocaleTimeString(), type, message },
      ...prev,
    ]);
  };

  // ─── Tool 1: Reset Provider Quotas via Webhook ───
  const handleQuotaReset = async () => {
    setResetLoading(true);
    const eventId = `quota_reset_${Date.now()}`;
    addLog('info', `Sending QUOTA_RESET webhook (eventId: ${eventId})...`);

    try {
      const res = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, eventType: 'QUOTA_RESET' }),
      });
      const data = await res.json();

      if (data.alreadyProcessed) {
        addLog('info', `Idempotency: Event was already processed at ${data.processedAt}. No duplicate effect.`);
      } else {
        addLog('success', `✓ ${data.message}`);
      }
    } catch (err: any) {
      addLog('error', `✗ Reset failed: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  // ─── Tool 2: Trigger Webhook Multiple Times (Idempotency Test) ───
  const handleWebhookIdempotencyTest = async () => {
    setWebhookLoading(true);
    const sharedEventId = `idempotency_test_${Date.now()}`;
    addLog('info', `Sending the SAME webhook 3 times concurrently (eventId: ${sharedEventId})...`);

    try {
      const requests = Array.from({ length: 3 }, () =>
        fetch('/api/test-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: sharedEventId, eventType: 'QUOTA_RESET' }),
        }).then((res) => res.json())
      );

      const results = await Promise.allSettled(requests);

      let processedCount = 0;
      let skippedCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.alreadyProcessed) {
            skippedCount++;
            addLog('info', `  Call ${index + 1}: Skipped (already processed)`);
          } else {
            processedCount++;
            addLog('success', `  Call ${index + 1}: Processed`);
          }
        } else {
          addLog('error', `  Call ${index + 1}: Failed — ${result.reason}`);
        }
      });

      addLog(
        'success',
        `✓ Idempotency test complete: ${processedCount} processed, ${skippedCount} safely skipped.`
      );
    } catch (err: any) {
      addLog('error', `✗ Idempotency test failed: ${err.message}`);
    } finally {
      setWebhookLoading(false);
    }
  };

  // ─── Tool 3: Generate 10 Leads Simultaneously ───
  const handleBulkLeadGeneration = async () => {
    setBulkLoading(true);
    addLog('info', 'Generating 10 leads concurrently across all 3 service types...');

    const serviceTypes = ['SERVICE_1', 'SERVICE_2', 'SERVICE_3'];

    const leadRequests = Array.from({ length: 10 }, (_, i) => {
      const service = serviceTypes[i % 3];
      const leadData = {
        name: `Test User ${i + 1}`,
        email: `testuser${i + 1}_${Date.now()}@example.com`,
        phone: `555-${String(Date.now()).slice(-4)}-${String(i).padStart(4, '0')}`,
        serviceType: service,
        description: `Auto-generated test lead #${i + 1} for ${service}`,
      };

      return fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      })
        .then((res) => res.json().then((data) => ({ status: res.status, data, index: i })))
        .catch((err) => ({ status: 0, data: { error: err.message }, index: i }));
    });

    const results = await Promise.allSettled(leadRequests);

    let successCount = 0;
    let failCount = 0;

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { status, data, index } = result.value;
        if (status === 201) {
          successCount++;
          const providers = data.assignedProviders?.map((p: any) => p.id).join(', ') || 'N/A';
          addLog('success', `  Lead #${index + 1}: Allocated to [${providers}]`);
        } else {
          failCount++;
          addLog('error', `  Lead #${index + 1}: ${data.error || 'Unknown error'}`);
        }
      } else {
        failCount++;
        addLog('error', `  Lead failed: ${result.reason}`);
      }
    });

    addLog(
      successCount > 0 ? 'success' : 'error',
      `✓ Bulk generation complete: ${successCount} succeeded, ${failCount} failed.`
    );
    setBulkLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Navigation */}
        <div className="flex justify-between mb-8 text-sm">
          <a href="/request-service" className="text-slate-600 hover:text-indigo-600 transition-colors">
            Request Service Form
          </a>
          <a href="/dashboard" className="text-slate-600 hover:text-indigo-600 transition-colors">
            Provider Dashboard
          </a>
          <a href="/test-tools" className="text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1">
            Test Tools
          </a>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Test Tools & Webhook Simulation
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Use these tools to test allocation logic, verify idempotent webhooks, and generate bulk leads.
          </p>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          {/* Tool 1: Reset Quotas */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <div className="mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </div>
              <h3 className="font-bold text-slate-900">Reset Quotas</h3>
              <p className="text-xs text-slate-500 mt-1">
                Sends a QUOTA_RESET webhook. Resets all providers to quota=10 and currentLeadsCount=0.
              </p>
            </div>
            <button
              onClick={handleQuotaReset}
              disabled={resetLoading}
              className="mt-auto w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow transition-colors disabled:bg-amber-300"
            >
              {resetLoading ? 'Resetting...' : 'Reset Provider Quotas'}
            </button>
          </div>

          {/* Tool 2: Idempotency Test */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <div className="mb-4">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
              </div>
              <h3 className="font-bold text-slate-900">Test Idempotency</h3>
              <p className="text-xs text-slate-500 mt-1">
                Fires the same webhook 3 times concurrently. Only the first should execute; others should be skipped.
              </p>
            </div>
            <button
              onClick={handleWebhookIdempotencyTest}
              disabled={webhookLoading}
              className="mt-auto w-full py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold rounded-lg shadow transition-colors disabled:bg-violet-300"
            >
              {webhookLoading ? 'Testing...' : 'Run Idempotency Test'}
            </button>
          </div>

          {/* Tool 3: Bulk Lead Generation */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <div className="mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <h3 className="font-bold text-slate-900">Generate 10 Leads</h3>
              <p className="text-xs text-slate-500 mt-1">
                Creates 10 leads simultaneously across all service types. Tests transaction safety and quota limits.
              </p>
            </div>
            <button
              onClick={handleBulkLeadGeneration}
              disabled={bulkLoading}
              className="mt-auto w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow transition-colors disabled:bg-emerald-300"
            >
              {bulkLoading ? 'Generating...' : 'Generate 10 Leads'}
            </button>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-bold text-slate-900">Activity Log</h2>
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
              >
                Clear Log
              </button>
            )}
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-8">
                No activity yet. Click a test tool above to begin.
              </p>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`px-3 py-2 rounded-lg ${
                      log.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                        : log.type === 'error'
                        ? 'bg-rose-50 text-rose-800 border border-rose-100'
                        : 'bg-slate-50 text-slate-700 border border-slate-100'
                    }`}
                  >
                    <span className="text-slate-400 mr-2">[{log.timestamp}]</span>
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
