import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Election, Candidate, ElectionStatus } from '../../types/index.js';
import {
  Plus,
  Calendar,
  Clock,
  Play,
  Pause,
  StopCircle,
  Users,
  Edit,
  Trash2,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Award,
} from 'lucide-react';

export const ElectionManager: React.FC = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingElectionId, setEditingElectionId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eligibilityType, setEligibilityType] = useState<'ALL' | 'DEPARTMENTS' | 'SPECIFIC_STUDENTS'>('ALL');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [maxSelections, setMaxSelections] = useState(1);
  const [initialStatus, setInitialStatus] = useState<ElectionStatus>('ACTIVE');

  // Candidate management modal
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [targetElection, setTargetElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Add Candidate Form
  const [candName, setCandName] = useState('');
  const [candDept, setCandDept] = useState('Computer Science');
  const [candManifesto, setCandManifesto] = useState('');
  const [candQuals, setCandQuals] = useState('');
  const [candSymbol, setCandSymbol] = useState('');
  const [candPhotoFile, setCandPhotoFile] = useState<File | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const departmentsList = [
    'Computer Science',
    'Information Technology',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Biotechnology',
    'Chemical Engineering',
  ];

  const fetchElections = async () => {
    try {
      setLoading(true);
      const res = await api.getElections();
      setElections(res.elections);
    } catch (err: any) {
      console.error('Error fetching elections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  const openCreateModal = () => {
    setEditingElectionId(null);
    setTitle('');
    setDescription('');
    const now = new Date();
    setStartTime(now.toISOString().slice(0, 16));
    setEndTime(new Date(now.getTime() + 48 * 3600 * 1000).toISOString().slice(0, 16));
    setEligibilityType('ALL');
    setSelectedDepts([]);
    setMaxSelections(1);
    setInitialStatus('ACTIVE');
    setFeedbackMsg(null);
    setIsModalOpen(true);
  };

  const handleSaveElection = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    try {
      const payload = {
        title,
        description,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        status: initialStatus,
        eligibility_type: eligibilityType,
        eligibility_criteria: eligibilityType === 'DEPARTMENTS' ? selectedDepts : undefined,
        max_selections: Number(maxSelections),
      };

      if (editingElectionId) {
        await api.updateElection(editingElectionId, payload);
        setFeedbackMsg({ type: 'success', text: 'Election details updated successfully.' });
      } else {
        await api.createElection(payload);
        setFeedbackMsg({ type: 'success', text: 'New election created successfully.' });
      }

      setIsModalOpen(false);
      fetchElections();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Operation failed' });
    }
  };

  const handleStatusChange = async (electionId: string, newStatus: ElectionStatus) => {
    if (!confirm(`Are you sure you want to transition this election status to ${newStatus}?`)) {
      return;
    }
    try {
      await api.updateElectionStatus(electionId, newStatus);
      fetchElections();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const openCandidateManager = async (election: Election) => {
    setTargetElection(election);
    try {
      const res = await api.getElectionDetails(election.id);
      setCandidates(res.candidates);
      setCandName('');
      setCandManifesto('');
      setCandQuals('');
      setCandSymbol('');
      setCandPhotoFile(null);
      setCandidateModalOpen(true);
    } catch (err: any) {
      alert('Failed to load candidate list');
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetElection) return;

    try {
      const formData = new FormData();
      formData.append('name', candName);
      formData.append('department', candDept);
      formData.append('manifesto', candManifesto);
      if (candQuals) formData.append('qualifications', candQuals);
      if (candSymbol) formData.append('symbol_url', candSymbol);
      if (candPhotoFile) formData.append('photo', candPhotoFile);

      await api.addCandidate(targetElection.id, formData);

      // Refresh candidate list
      const res = await api.getElectionDetails(targetElection.id);
      setCandidates(res.candidates);
      setCandName('');
      setCandManifesto('');
      setCandQuals('');
      setCandSymbol('');
      setCandPhotoFile(null);
    } catch (err: any) {
      alert(err.message || 'Failed to add candidate');
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!targetElection) return;
    if (!confirm('Are you sure you want to delete this candidate nominee?')) return;

    try {
      await api.deleteCandidate(targetElection.id, candidateId);
      const res = await api.getElectionDetails(targetElection.id);
      setCandidates(res.candidates);
    } catch (err: any) {
      alert(err.message || 'Failed to delete candidate');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0A2558] tracking-tight">
            Election Lifecycle & Candidate Configuration
          </h2>
          <p className="text-xs text-stone-500">
            Define election schedules, eligibility rules, candidate nominees, and active voting states.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Election</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Elections Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Election Title</th>
                <th className="py-3 px-4">Lifecycle State</th>
                <th className="py-3 px-4">Eligibility</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4">Candidates</th>
                <th className="py-3 px-4">Votes Cast</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {elections.map(el => (
                <tr key={el.id} className="hover:bg-stone-50/60">
                  <td className="py-3.5 px-4 font-bold text-stone-900 max-w-xs">
                    <div>{el.title}</div>
                    <div className="text-[10px] text-stone-400 font-mono mt-0.5">{el.id.slice(0, 8)}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider ${
                      el.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : el.status === 'PAUSED'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : el.status === 'COMPLETED'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-stone-100 text-stone-700 border border-stone-200'
                    }`}>
                      {el.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">
                    <span className="font-semibold">
                      {el.eligibility_type === 'ALL' ? 'All Students' : el.eligibility_type === 'DEPARTMENTS' ? 'Selected Depts' : 'Student Registry'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500">
                    <div>{new Date(el.start_time).toLocaleDateString()}</div>
                    <div className="text-[10px] text-stone-400">to {new Date(el.end_time).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => openCandidateManager(el)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-orange-50 hover:text-orange-900 hover:border-orange-200 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5 text-stone-500" />
                      <span>{el.candidateCount || 0} Candidates</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 font-black text-stone-900">
                    {el.totalVotes || 0}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                    {/* Status Controls */}
                    {el.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleStatusChange(el.id, 'PAUSED')}
                        title="Pause Election"
                        className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {el.status === 'PAUSED' && (
                      <button
                        onClick={() => handleStatusChange(el.id, 'ACTIVE')}
                        title="Resume Election"
                        className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {(el.status === 'ACTIVE' || el.status === 'PAUSED') && (
                      <button
                        onClick={() => handleStatusChange(el.id, 'CLOSED')}
                        title="Close Election"
                        className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      >
                        <StopCircle className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Election Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="tricolour-bar" />
            <div className="p-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                <h3 className="text-lg font-black text-[#0A2558]">
                  {editingElectionId ? 'Edit Election Details' : 'Create New Election Contest'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveElection} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Election Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. NSS General Council President 2026"
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Description & Objectives *
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Provide overview, eligibility instructions, and contest guidelines..."
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Start Schedule *
                    </label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      End Schedule *
                    </label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Eligibility Mode *
                    </label>
                    <select
                      value={eligibilityType}
                      onChange={e => setEligibilityType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
                    >
                      <option value="ALL">All Enrolled Students</option>
                      <option value="DEPARTMENTS">Specific Departments</option>
                      <option value="SPECIFIC_STUDENTS">Explicit Registry List</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Initial Status *
                    </label>
                    <select
                      value={initialStatus}
                      onChange={e => setInitialStatus(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
                    >
                      <option value="ACTIVE">Active (Immediate Voting)</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                  </div>
                </div>

                {eligibilityType === 'DEPARTMENTS' && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Allowed Departments
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200">
                      {departmentsList.map(dept => {
                        const checked = selectedDepts.includes(dept);
                        return (
                          <label key={dept} className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedDepts(checked ? selectedDepts.filter(d => d !== dept) : [...selectedDepts, dept]);
                              }}
                              className="rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span>{dept}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs"
                  >
                    Save Election
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Management Modal */}
      {candidateModalOpen && targetElection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="tricolour-bar" />
            <div className="p-6">
              <div className="flex items-start justify-between pb-3 border-b border-stone-100 mb-4">
                <div>
                  <h3 className="text-lg font-black text-[#0A2558]">
                    Candidate Nominee Registry
                  </h3>
                  <p className="text-xs text-stone-500">
                    Contest: <span className="font-bold text-stone-800">{targetElection.title}</span>
                  </p>
                </div>
                <button onClick={() => setCandidateModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add Candidate Form */}
              <form onSubmit={handleAddCandidate} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 mb-6 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Nominate New Candidate
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                      Candidate Full Name *
                    </label>
                    <input
                      type="text"
                      value={candName}
                      onChange={e => setCandName(e.target.value)}
                      placeholder="e.g. Vikramaditya Rao"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                      Department *
                    </label>
                    <select
                      value={candDept}
                      onChange={e => setCandDept(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                    >
                      {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                      Ballot Symbol / Emblem
                    </label>
                    <input
                      type="text"
                      value={candSymbol}
                      onChange={e => setCandSymbol(e.target.value)}
                      placeholder="e.g. Torch of Learning, Book, Tree"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                      Candidate Photograph (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setCandPhotoFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-stone-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                    Manifesto & Key Promises *
                  </label>
                  <textarea
                    value={candManifesto}
                    onChange={e => setCandManifesto(e.target.value)}
                    rows={2}
                    placeholder="Candidate's vision and commitments to voters..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                    Qualifications & Past Service
                  </label>
                  <input
                    type="text"
                    value={candQuals}
                    onChange={e => setCandQuals(e.target.value)}
                    placeholder="e.g. NSS Youth Representative, Class Representative"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Candidate to Ballot</span>
                  </button>
                </div>
              </form>

              {/* Existing Candidates List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Nominees on Ballot ({candidates.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {candidates.map(c => (
                    <div key={c.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-stone-200 font-black text-stone-800 flex items-center justify-center text-[11px]">
                          #{c.ballot_number}
                        </span>
                        <div>
                          <p className="font-bold text-stone-900">{c.name}</p>
                          <p className="text-[10px] text-stone-500">{c.department} {c.symbol_url ? `• Symbol: ${c.symbol_url}` : ''}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCandidate(c.id)}
                        className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        title="Remove Candidate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

