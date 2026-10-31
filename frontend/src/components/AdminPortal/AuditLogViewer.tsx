import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Terminal,
} from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        action: actionFilter || undefined,
        resourceType: resourceFilter || undefined,
        page,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, resourceFilter, page]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0A2558] tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-600" />
            <span>Tamper-Evident System Audit Trail</span>
          </h2>
          <p className="text-xs text-stone-500">
            Append-only record of all administrative elections, status transitions, voter enrolments, and ballot submissions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer self-start sm:self-auto"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-semibold"
        >
          <option value="">All Action Types</option>
          <option value="USER_REGISTERED">USER_REGISTERED</option>
          <option value="USER_LOGIN">USER_LOGIN</option>
          <option value="BIOMETRIC_ENROLLED">BIOMETRIC_ENROLLED</option>
          <option value="BALLOT_UNLOCKED_BIOMETRIC">BALLOT_UNLOCKED_BIOMETRIC</option>
          <option value="VOTE_SUBMITTED_SUCCESS">VOTE_SUBMITTED_SUCCESS</option>
          <option value="ELECTION_CREATED">ELECTION_CREATED</option>
          <option value="ELECTION_UPDATED">ELECTION_UPDATED</option>
          <option value="ELECTION_RESULTS_PUBLISHED">ELECTION_RESULTS_PUBLISHED</option>
          <option value="CANDIDATE_ADDED">CANDIDATE_ADDED</option>
        </select>

        <select
          value={resourceFilter}
          onChange={e => setResourceFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-semibold"
        >
          <option value="">All Resource Targets</option>
          <option value="users">users</option>
          <option value="elections">elections</option>
          <option value="candidates">candidates</option>
          <option value="webauthn_credentials">webauthn_credentials</option>
          <option value="voter_participation">voter_participation</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">IP Hash / Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-stone-50/60">
                  <td className="py-3 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[11px] text-stone-800">
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-700">
                    <p className="font-semibold">{log.user_name || 'System / Anonymous'}</p>
                    {log.student_id && <p className="text-[10px] text-stone-400 font-mono">{log.student_id}</p>}
                  </td>
                  <td className="py-3 px-4 uppercase font-mono text-[10px] text-stone-500">
                    {log.resource_type}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-stone-400">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {log.details && (
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                      >
                        Inspect Payload
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-stone-950 text-emerald-400 rounded-3xl max-w-lg w-full border border-stone-800 shadow-2xl p-6 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
              <span className="font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-orange-400" />
                <span>Audit Event Payload: {selectedLog.action}</span>
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <pre className="p-3 bg-stone-900 rounded-xl overflow-x-auto text-[11px] leading-relaxed">
              {JSON.stringify(JSON.parse(selectedLog.details || '{}'), null, 2)}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
};

