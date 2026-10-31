import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { AdminOverviewMetrics } from '../../types/index.js';
import {
  Users,
  Vote,
  Award,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  UserPlus,
  FileSpreadsheet,
  Activity,
  Calendar,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (module: 'elections' | 'voters' | 'turnout' | 'results' | 'audit') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<AdminOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Clean dummy data modal state
  const [cleanModalOpen, setCleanModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [wipeVoters, setWipeVoters] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanError, setCleanError] = useState<string | null>(null);
  const [cleanSuccess, setCleanSuccess] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to fetch admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading || !data) {
    return <div className="p-12 text-center text-stone-400">Loading Election Commission HQ...</div>;
  }

  const { metrics, liveElections, recentLogs } = data;

  return (
    <div className="space-y-8">
      
      {/* Top Banner */}
      <div className="bg-linear-to-r from-[#0A2558] via-[#0E2F6D] to-[#1E3A8A] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-orange-500 text-white rounded">
                Admin Control Deck
              </span>
              <span className="text-xs text-stone-300 font-mono">
                SESSION ENCRYPTED • AUDIT LOGGING ACTIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Collegiate Election Commission HQ
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
              Real-time monitoring, ballot lifecycle control, biometric enrollment audits, and certified results publishing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('elections')}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>Create / Manage Elections</span>
            </button>
            <button
              onClick={() => onNavigate('voters')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Import Voters (CSV)</span>
            </button>
            <button
              onClick={() => {
                setAdminPassword('');
                setCleanError(null);
                setCleanSuccess(null);
                setCleanModalOpen(true);
              }}
              className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/40 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              title="Clear dummy / test data from database"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Clear Dummy Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Registered</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-stone-900">{metrics.totalRegisteredVoters}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">Eligible Students</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active</span>
            <Vote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{metrics.activeElections}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">Live Contests</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-stone-900">{metrics.completedElections}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">Elections Sealed</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Candidates</span>
            <ShieldCheck className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black text-stone-900">{metrics.totalCandidates}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">Approved Nominees</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ballots Cast</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-stone-900">{metrics.totalVotesCast}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">All Contests Combined</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Identity Registry</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{metrics.totalVerifiedVoters}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">Verified Accounts</p>
        </div>

      </div>

      {/* Live Active Elections Turnout Section */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-bold text-stone-900">
              Live Contests & Turnout Monitoring
            </h3>
          </div>
          <button
            onClick={() => onNavigate('turnout')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Detailed Monitor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {liveElections.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No active elections currently in voting phase.</p>
        ) : (
          <div className="space-y-4">
            {liveElections.map(el => (
              <div key={el.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">{el.title}</h4>
                  <p className="text-[11px] text-stone-500">
                    Closes: {new Date(el.end_time).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-black text-stone-900">{el.votesCast} Ballots Cast</p>
                    <p className="text-[10px] text-stone-400">Interim candidate counts sealed</p>
                  </div>
                  <button
                    onClick={() => onNavigate('turnout')}
                    className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    View Turnout
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Audit Activities Stream */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0A2558]" />
            <span>Recent System Audit Events</span>
          </h3>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Full Audit Trail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recentLogs.map(log => (
                <tr key={log.id} className="hover:bg-stone-50/50">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-stone-800">
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-stone-700">
                    {log.user_name || 'System'}
                  </td>
                  <td className="py-2.5 px-3 text-stone-500 uppercase font-mono text-[10px]">
                    {log.resource_type}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-stone-400">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear Dummy Data Confirmation Modal */}
      {cleanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="tricolour-bar" />
            <div className="p-6">
              <div className="flex items-start justify-between pb-3 border-b border-stone-100 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#0A2558]">
                      Purge Dummy / Demo Data
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Reset database to a clean production state
                    </p>
                  </div>
                </div>
                <button onClick={() => setCleanModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cleanError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{cleanError}</span>
                </div>
              )}

              {cleanSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{cleanSuccess}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 mb-4 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>What will be cleared:</span>
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                  <li>All sample elections & candidate profiles</li>
                  <li>All dummy ballots & voter participation records</li>
                  <li>All ephemeral WebAuthn challenges & single-use tokens</li>
                  <li><strong>Your Administrator account is preserved safely</strong> so you can immediately configure real elections.</li>
                </ul>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!adminPassword) {
                    setCleanError('Admin password confirmation required');
                    return;
                  }
                  setCleaning(true);
                  setCleanError(null);
                  setCleanSuccess(null);
                  try {
                    const res = await api.cleanDummyData(adminPassword, wipeVoters);
                    setCleanSuccess(res.message);
                    setAdminPassword('');
                    setTimeout(() => {
                      setCleanModalOpen(false);
                      fetchOverview();
                    }, 1200);
                  } catch (err: any) {
                    setCleanError(err.message || 'Failed to purge dummy data');
                  } finally {
                    setCleaning(false);
                  }
                }}
                className="space-y-4 text-xs"
              >
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={wipeVoters}
                    onChange={(e) => setWipeVoters(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Also purge dummy test student voters (CS-001, etc.)</span>
                </label>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">
                    Enter Admin Password to Confirm *
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter Admin@2026"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCleanModalOpen(false)}
                    className="px-4 py-2 font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={cleaning}
                    className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {cleaning ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Purge All Dummy Data</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

