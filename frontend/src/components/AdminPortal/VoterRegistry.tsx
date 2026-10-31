import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Users,
  Search,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Fingerprint,
  Download,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const VoterRegistry: React.FC = () => {
  const [voters, setVoters] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Single Add Form
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [voterDept, setVoterDept] = useState('Computer Science');
  const [batchYear, setBatchYear] = useState(2026);
  const [initialPassword, setInitialPassword] = useState('Voter@123');

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const departmentsList = [
    'Computer Science',
    'Information Technology',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Biotechnology',
    'Chemical Engineering',
  ];

  const fetchVoters = async () => {
    try {
      setLoading(true);
      const res = await api.getVoters({
        search: search.trim() || undefined,
        department: department || undefined,
        page,
      });
      setVoters(res.voters);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load voters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoters();
  }, [search, department, page]);

  const handleToggleStatus = async (voterId: string, currentStatus: number) => {
    try {
      await api.toggleVoterStatus(voterId, currentStatus === 1 ? 0 : 1);
      fetchVoters();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle account status');
    }
  };

  const handleCreateVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      await api.createVoter({
        student_id: studentId.trim(),
        email: email.trim(),
        full_name: fullName.trim(),
        department: voterDept,
        batch_year: Number(batchYear),
        password: initialPassword,
      });

      setMessage({ type: 'success', text: `Voter ${studentId} enrolled in student registry successfully.` });
      setAddModalOpen(false);
      fetchVoters();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to enroll voter' });
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportResult(null);

    try {
      // Parse CSV text
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least one data record.');
      }

      // Expected columns: student_id,email,full_name,department,batch_year
      const parsedRows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 4) {
          parsedRows.push({
            student_id: cols[0],
            email: cols[1],
            full_name: cols[2],
            department: cols[3],
            batch_year: Number(cols[4]) || 2026,
          });
        }
      }

      const res = await api.batchImportVoters(parsedRows);
      setImportResult(res);
      fetchVoters();
    } catch (err: any) {
      setImportResult({ error: err.message || 'Import failed' });
    }
  };

  const downloadSampleCsv = () => {
    const sample = `student_id,email,full_name,department,batch_year
NSS-2026-CS-101,aditi.sen@nss.edu,Aditi Sen,Computer Science,2026
NSS-2026-ME-102,rahul.nair@nss.edu,Rahul Nair,Mechanical Engineering,2026
NSS-2026-EE-103,kavita.sharma@nss.edu,Kavita Sharma,Electrical Engineering,2026`;

    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nss_voters_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0A2558] tracking-tight">
            Voter Registry & Identity Enforcement
          </h2>
          <p className="text-xs text-stone-500">
            Enforces 1 Verified Individual = 1 Account. Administrators have zero access to private keys or biometric templates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              setCsvText('');
              setImportResult(null);
              setCsvModalOpen(true);
            }}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>CSV Batch Import</span>
          </button>

          <button
            onClick={() => {
              setStudentId('');
              setEmail('');
              setFullName('');
              setAddModalOpen(true);
            }}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Single Voter</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row gap-3">
        <div className="relative grow">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student roll number, full name, or email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <select
          value={department}
          onChange={e => setDepartment(e.target.value)}
          className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-700"
        >
          <option value="">All Academic Departments</option>
          {departmentsList.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Voters Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Student ID / Roll No</th>
                <th className="py-3 px-4">Full Name & Email</th>
                <th className="py-3 px-4">Department & Batch</th>
                <th className="py-3 px-4">Passkey Biometric</th>
                <th className="py-3 px-4">Registry Status</th>
                <th className="py-3 px-4 text-right">Account Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {voters.map(v => (
                <tr key={v.id} className="hover:bg-stone-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-stone-900">
                    {v.student_id}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-stone-800">{v.full_name}</p>
                    <p className="text-[11px] text-stone-400">{v.email}</p>
                  </td>
                  <td className="py-3 px-4 text-stone-600">
                    <p className="font-medium">{v.department}</p>
                    <p className="text-[10px] text-stone-400">Class of {v.batch_year}</p>
                  </td>
                  <td className="py-3 px-4">
                    {v.hasBiometrics ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Fingerprint className="w-3 h-3 text-emerald-600" />
                        <span>Enrolled</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      v.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {v.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(v.id, v.is_active)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        v.is_active
                          ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {v.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Add Voter Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="tricolour-bar" />
            <div className="p-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                <h3 className="text-lg font-black text-[#0A2558]">
                  Enroll Student in Voter Registry
                </h3>
                <button onClick={() => setAddModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateVoter} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">
                    Student ID / College Roll *
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="e.g. NSS-2026-EE-045"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl uppercase font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Devendra Sharma"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. devendra@nss.edu"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl lowercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">
                      Department *
                    </label>
                    <select
                      value={voterDept}
                      onChange={e => setVoterDept(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                    >
                      {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">
                      Batch Year *
                    </label>
                    <input
                      type="number"
                      value={batchYear}
                      onChange={e => setBatchYear(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">
                    Initial Password
                  </label>
                  <input
                    type="text"
                    value={initialPassword}
                    onChange={e => setInitialPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                    required
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Default is Voter@123</p>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs"
                  >
                    Add to Registry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CSV Batch Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="tricolour-bar" />
            <div className="p-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                <div>
                  <h3 className="text-lg font-black text-[#0A2558]">
                    Batch Import Student Registry (CSV)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Bulk-enroll verified college students. Deduplicates student IDs automatically.
                  </p>
                </div>
                <button onClick={() => setCsvModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="text-xs text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>

              <form onSubmit={handleCsvImport} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Paste CSV Data or Header Rows
                  </label>
                  <textarea
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    rows={6}
                    placeholder={`student_id,email,full_name,department,batch_year\nNSS-2026-CS-010,john@nss.edu,John Doe,Computer Science,2026`}
                    className="w-full p-3 font-mono text-xs bg-stone-50 border border-stone-300 rounded-xl"
                    required
                  />
                </div>

                {importResult && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                    {importResult.error ? (
                      <p className="text-red-700 font-bold">{importResult.error}</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-emerald-800 font-bold">
                          Successfully registered: {importResult.createdCount} voters
                        </p>
                        <p className="text-stone-600">
                          Duplicates / skipped: {importResult.skippedCount}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCsvModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
                  >
                    Process CSV Batch
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

