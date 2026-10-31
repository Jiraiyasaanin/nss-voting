import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { TurnoutMonitoringData, Election } from '../../types/index.js';
import {
  Activity,
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldCheck,
  RefreshCw,
  Lock,
} from 'lucide-react';

export const LiveTurnoutMonitor: React.FC = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const [turnoutData, setTurnoutData] = useState<TurnoutMonitoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load elections list
  useEffect(() => {
    api.getElections().then(res => {
      setElections(res.elections);
      if (res.elections.length > 0) {
        // default to first active election or first election
        const active = res.elections.find(e => e.status === 'ACTIVE') || res.elections[0];
        setSelectedElectionId(active.id);
      }
    });
  }, []);

  const fetchTurnout = async () => {
    if (!selectedElectionId) return;
    try {
      setLoading(true);
      const data = await api.getElectionTurnout(selectedElectionId);
      setTurnoutData(data);
    } catch (err) {
      console.error('Failed to load election turnout:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurnout();
    if (!autoRefresh) return;
    const interval = setInterval(fetchTurnout, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [selectedElectionId, autoRefresh]);

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0A2558] tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span>Live Turnout Monitoring & Voter Participation</span>
          </h2>
          <p className="text-xs text-stone-500">
            Real-time voter turnout and cryptographic audit log. Candidate vote tallies are sealed until voting concludes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedElectionId}
            onChange={e => setSelectedElectionId(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold bg-white border border-stone-300 rounded-xl shadow-xs text-stone-800"
          >
            {elections.map(el => (
              <option key={el.id} value={el.id}>
                {el.title} ({el.status})
              </option>
            ))}
          </select>

          <button
            onClick={fetchTurnout}
            disabled={loading}
            className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer"
            title="Refresh Turnout Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {turnoutData && (
        <>
          {/* Turnout Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Eligible Voters</span>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-black text-stone-900">{turnoutData.turnout.totalEligible}</p>
              <p className="text-xs text-stone-500 mt-1">Verified college registry</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Ballots Cast</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-emerald-700">{turnoutData.turnout.votesCast}</p>
              <p className="text-xs text-stone-500 mt-1">Biometrically authenticated</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Remaining</span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-black text-stone-900">{turnoutData.turnout.remaining}</p>
              <p className="text-xs text-stone-500 mt-1">Yet to cast ballot</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Turnout Share</span>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-black text-purple-700">{turnoutData.turnout.turnoutPercentage}%</p>
              <p className="text-xs text-stone-500 mt-1">Democratic participation</p>
            </div>

          </div>

          {/* Turnout Progress Bar */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-stone-700">Live Voter Turnout Progress</span>
              <span className="text-emerald-700">{turnoutData.turnout.turnoutPercentage}% ({turnoutData.turnout.votesCast} / {turnoutData.turnout.totalEligible})</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-stone-200">
              <div
                className="bg-linear-to-r from-orange-500 to-emerald-600 h-full rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${Math.min(100, Math.max(turnoutData.turnout.turnoutPercentage, 2))}%` }}
              />
            </div>
          </div>

          {/* Critical Ballot Privacy Shield Banner */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-bold">Ballot Secrecy Enforcement & Interim Count Protection</p>
              <p className="mt-0.5 text-amber-800">
                In strict adherence to democratic election principles, interim candidate rankings are cryptographically sealed while the election remains active. 
                Below is the participation log verifying <strong>WHO voted</strong>, with zero disclosure of <strong>HOW they voted</strong>.
              </p>
            </div>
          </div>

          {/* Recent Participation Stream */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-stone-800 mb-4 flex items-center justify-between">
              <span>Verified Voter Participation Stream (Recent 50)</span>
              <span className="text-xs font-normal text-stone-500">Auto-updating</span>
            </h3>

            {turnoutData.recentParticipation.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-4 text-center">No votes recorded yet for this election.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Student Roll No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Cryptographic Receipt Code</th>
                      <th className="py-2.5 px-3 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {turnoutData.recentParticipation.map((p, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                          {new Date(p.voted_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                          {p.student_id}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-stone-800">
                          {p.full_name}
                        </td>
                        <td className="py-2.5 px-3 text-stone-600">
                          {p.department}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-800 font-bold text-[11px]">
                          {p.receipt_code}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>1-Person-1-Vote Verified</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

