import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          Mini Lead Distribution System
        </h1>
        <p className="text-slate-500 text-base mb-12 max-w-lg mx-auto">
          A full-stack lead allocation platform. Submit service requests,
          monitor provider dashboards in real-time, and test webhook integrations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Request Service */}
          <Link
            href="/request-service"
            className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-lg hover:border-indigo-200 transition-all"
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-200 transition-colors">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <h2 className="font-bold text-slate-900 mb-1">Request Service</h2>
            <p className="text-xs text-slate-500">
              Submit a new customer lead and get matched with 3 providers instantly.
            </p>
          </Link>

          {/* Dashboard */}
          <Link
            href="/dashboard"
            className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-lg hover:border-emerald-200 transition-all"
          >
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-200 transition-colors">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <h2 className="font-bold text-slate-900 mb-1">Dashboard</h2>
            <p className="text-xs text-slate-500">
              Monitor provider quotas and lead assignments with real-time updates.
            </p>
          </Link>

          {/* Test Tools */}
          <Link
            href="/test-tools"
            className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-lg hover:border-violet-200 transition-all"
          >
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-violet-200 transition-colors">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <h2 className="font-bold text-slate-900 mb-1">Test Tools</h2>
            <p className="text-xs text-slate-500">
              Webhook simulation, idempotency tests, and bulk lead generation.
            </p>
          </Link>
        </div>

        <p className="text-xs text-slate-400 mt-12">
          Built with Next.js 14 · Prisma · PostgreSQL · Tailwind CSS
        </p>
      </div>
    </div>
  );
}
