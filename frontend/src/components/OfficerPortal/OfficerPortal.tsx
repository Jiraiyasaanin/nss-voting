import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { OfficerStats, VoterVerificationRecord } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building,
  GraduationCap,
  Mail,
  FileCheck,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  X,
} from 'lucide-react';

export const OfficerPortal: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [voters, setVoters] = useState<VoterVerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Multi-select for batch approval
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingVoter, setRejectingVoter] = useState<VoterVerificationRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Roll number not found on active university roster');
  const [customReason, setCustomReason] = useState('');

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const predefinedReasons = [
    'Roll number not found on active university roster',
    'Department or batch year mismatch with collegiate ERP records',
    'Duplicate account / suspected duplicate student identity',
    'Unverified or non-institutional email address',
    'Academic disciplinary hold or administrative suspension',
  ];

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, votersRes] = await Promise.all([
        api.getOfficerStats(),
        api.getOfficerVoters({
          status: statusFilter,
          search: searchQuery.trim() || undefined,
          department: departmentFilter !== 'ALL' ? departmentFilter : undefined,
          limit: 100,
        }),
      ]);

      setStats(statsRes);
      setVoters(votersRes.voters);
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Failed to load officer registry data:', err);
      showFeedback('error', err.message || 'Failed to load identity verification records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, departmentFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleVerify = async (voter: VoterVerificationRecord) => {
    setActionLoadingId(voter.id);
    try {
      const res = await api.verifyVoterIdentity(voter.id);
      showFeedback('success', res.message);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Verification failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectModal = (voter: VoterVerificationRecord) => {
    setRejectingVoter(voter);
    setRejectionReason(predefinedReasons[0]);
    setCustomReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingVoter) return;
    const finalReason = customReason.trim() ? customReason.trim() : rejectionReason;
    setActionLoadingId(rejectingVoter.id);
    try {
      const res = await api.rejectVoterIdentity(rejectingVoter.id, finalReason);
      showFeedback('success', res.message);
      setRejectModalOpen(false);
      setRejectingVoter(null);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Rejection failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReset = async (voter: VoterVerificationRecord) => {
    setActionLoadingId(voter.id);
    try {
      const res = await api.resetVoterIdentity(voter.id);
      showFeedback('success', res.message);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Reset failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleSelectVoter = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPending = () => {
    const pendingInView = voters.filter(v => v.is_verified === 0).map(v => v.id);
    if (selectedIds.length === pendingInView.length && pendingInView.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingInView);
    }
  };

  const handleBatchVerify = async () => {
    if (selectedIds.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await api.batchVerifyVoters(selectedIds);
      showFeedback('success', res.message);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Batch verification failed');
    } finally {
      setBatchLoading(false);
    }
  };

  const departmentsList = [
    'ALL',
    'Computer Science',
    'Information Technology',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Biotechnology',
    'Chemical Engineering',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Officer Desk Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-300 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
              RETURNING OFFICER DESK
            </span>
            <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Registry Active
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0A2558]">
            Student Identity Verification Manager
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 max-w-2xl leading-relaxed">
            Validate collegiate student identities against official college rolls before democratic EVM ballot access is granted. Single source of authority for duplicate vote prevention.
          </p>
        </div>

        {/* Officer Profile Badge */}
        <div className="flex items-center gap-3 bg-stone-50 border border-stone-200/80 p-3.5 rounded-xl shrink-0">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#0A2558] to-[#1E3A8A] text-orange-300 font-bold flex items-center justify-center text-sm shadow-xs">
            {user?.full_name?.charAt(0) || 'O'}
          </div>
          <div>
            <p className="text-xs font-bold text-stone-900 line-clamp-1">{user?.full_name}</p>
            <p className="text-[10px] uppercase font-mono text-stone-500">ID: {user?.student_id}</p>
            <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-blue-100 text-blue-900 mt-0.5">
              Identity Officer
            </span>
          </div>
        </div>
      </div>

      {/* Floating Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold shadow-md animate-in slide-in-from-top-2 duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="cursor-pointer text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm p-5 relative overflow-hidden bg-linear-to-br from-white to-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Pending Review
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          </div>
          <p className="text-3xl font-black text-amber-950 mt-3 font-mono">
            {stats ? stats.pendingCount : '--'}
          </p>
          <p className="text-[11px] text-amber-800 mt-1 font-medium">Awaiting Officer Decision</p>
        </div>

        {/* Verified Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 bg-linear-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Certified Voters
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
              {stats && stats.totalCount > 0
                ? `${Math.round((stats.verifiedCount / stats.totalCount) * 100)}%`
                : '0%'}
            </span>
          </div>
          <p className="text-3xl font-black text-emerald-950 mt-3 font-mono">
            {stats ? stats.verifiedCount : '--'}
          </p>
          <p className="text-[11px] text-emerald-800 mt-1 font-medium">Unlocked for Ballot Access</p>
        </div>

        {/* Flagged / Rejected Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 bg-linear-to-br from-white to-rose-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-rose-600" />
              Flagged / Rejected
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800">
              Actioned
            </span>
          </div>
          <p className="text-3xl font-black text-rose-950 mt-3 font-mono">
            {stats ? stats.rejectedCount : '--'}
          </p>
          <p className="text-[11px] text-rose-800 mt-1 font-medium">Imposters & Roster Discrepancies</p>
        </div>

        {/* Total Registrations Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 bg-linear-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0A2558] flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#0A2558]" />
              Total Accounts
            </span>
          </div>
          <p className="text-3xl font-black text-[#0A2558] mt-3 font-mono">
            {stats ? stats.totalCount : '--'}
          </p>
          <p className="text-[11px] text-stone-500 mt-1 font-medium">Enrolled in Election System</p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        
        {/* Workspace Toolbar */}
        <div className="p-4 sm:p-5 border-b border-stone-200 space-y-4">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200">
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Review</span>
                {stats && stats.pendingCount > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                    statusFilter === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {stats.pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setStatusFilter('verified')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'verified'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Certified Active</span>
                {stats && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                    statusFilter === 'verified' ? 'bg-emerald-800 text-white' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {stats.verifiedCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Flagged / Rejected</span>
                {stats && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                    statusFilter === 'rejected' ? 'bg-rose-800 text-white' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {stats.rejectedCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-[#0A2558] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>All Records</span>
              </button>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg border border-stone-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Search & Department Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Student Roll ID, Full Name, or Email..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-stone-400 shrink-0 hidden sm:block" />
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-stone-700 cursor-pointer"
              >
                {departmentsList.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'ALL' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Batch Actions Toolbar (Only shown on pending filter) */}
          {statusFilter === 'pending' && voters.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAllPending}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-900 cursor-pointer hover:text-amber-950"
                >
                  {selectedIds.length > 0 && selectedIds.length === voters.filter(v => v.is_verified === 0).length ? (
                    <CheckSquare className="w-4 h-4 text-amber-700" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400" />
                  )}
                  <span>Select All Pending ({voters.filter(v => v.is_verified === 0).length})</span>
                </button>
                {selectedIds.length > 0 && (
                  <span className="text-xs font-bold text-amber-800">
                    • {selectedIds.length} selected
                  </span>
                )}
              </div>

              {selectedIds.length > 0 && (
                <button
                  onClick={handleBatchVerify}
                  disabled={batchLoading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {batchLoading
                      ? 'Certifying Selected...'
                      : `Approve Selected (${selectedIds.length})`}
                  </span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Verification Cards List */}
        <div className="p-4 sm:p-6 space-y-4">
          {loading && voters.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Fetching student identity records...
              </p>
            </div>
          ) : voters.length === 0 ? (
            <div className="text-center py-16 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-800">No student identities matching this queue</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                {statusFilter === 'pending'
                  ? 'All student registrations have been reviewed and processed! No pending accounts awaiting verification.'
                  : 'Try selecting a different status filter or clearing your search keywords.'}
              </p>
            </div>
          ) : (
            voters.map(voter => {
              const isPending = voter.is_verified === 0;
              const isVerified = voter.is_verified === 1;
              const isFlagged = voter.is_verified === -1;
              const isSelected = selectedIds.includes(voter.id);
              const isActing = actionLoadingId === voter.id;

              return (
                <div
                  key={voter.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isPending
                      ? isSelected
                        ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-white border-amber-200/80 hover:border-amber-400 shadow-2xs'
                      : isVerified
                      ? 'bg-white border-stone-200/80 hover:border-emerald-300'
                      : 'bg-rose-50/40 border-rose-200 hover:border-rose-400'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Checkbox + Avatar + Info */}
                    <div className="flex items-start gap-3 sm:gap-4">
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => toggleSelectVoter(voter.id)}
                          className="mt-1 cursor-pointer text-stone-400 hover:text-stone-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-amber-600" />
                          ) : (
                            <Square className="w-5 h-5 text-stone-300 hover:text-stone-400" />
                          )}
                        </button>
                      )}

                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 border ${
                          isPending
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : isVerified
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        {voter.full_name.charAt(0)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-extrabold text-stone-900">
                            {voter.full_name}
                          </h4>

                          {/* Student ID Badge */}
                          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#0A2558] text-white rounded-md">
                            {voter.student_id}
                          </span>

                          {/* Status Badge */}
                          {isPending && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                              Awaiting Officer Review
                            </span>
                          )}

                          {isVerified && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Identity Certified
                            </span>
                          )}

                          {isFlagged && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Flagged / Rejected
                            </span>
                          )}
                        </div>

                        {/* Meta info row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-stone-400" />
                            {voter.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-stone-400" />
                            Batch of {voter.batch_year}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-stone-500">
                            <Mail className="w-3.5 h-3.5 text-stone-400" />
                            {voter.email}
                          </span>
                        </div>

                        {/* Additional Officer / Verification audit details */}
                        {isFlagged && voter.rejection_reason && (
                          <div className="mt-2 p-2 bg-rose-100/70 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Rejection Reason:</strong> {voter.rejection_reason}
                            </span>
                          </div>
                        )}

                        {isVerified && voter.verified_by_name && (
                          <p className="text-[10px] text-stone-400 mt-1">
                            Certified by{' '}
                            <span className="font-semibold text-stone-600">{voter.verified_by_name}</span>
                            {voter.verified_at && ` on ${new Date(voter.verified_at).toLocaleDateString()}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleVerify(voter)}
                            disabled={isActing}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isActing ? 'Verifying...' : 'Approve Identity'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openRejectModal(voter)}
                            disabled={isActing}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <UserX className="w-4 h-4 text-rose-600" />
                            <span>Flag / Reject</span>
                          </button>
                        </>
                      )}

                      {isVerified && (
                        <button
                          type="button"
                          onClick={() => handleReset(voter)}
                          disabled={isActing}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold border border-stone-200 transition cursor-pointer"
                        >
                          {isActing ? 'Processing...' : 'Re-evaluate'}
                        </button>
                      )}

                      {isFlagged && (
                        <button
                          type="button"
                          onClick={() => handleVerify(voter)}
                          disabled={isActing}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Clear & Re-approve</span>
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Reject / Flag Reason Modal */}
      {rejectModalOpen && rejectingVoter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Flag / Reject Student Identity</h3>
                  <p className="text-[11px] text-stone-500 font-mono">{rejectingVoter.student_id} • {rejectingVoter.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Please specify the institutional reason why this student identity cannot be certified. This reason will be communicated to the student when they sign in.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Select Predefined Reason:
              </label>
              <div className="space-y-2">
                {predefinedReasons.map(r => (
                  <label
                    key={r}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      rejectionReason === r
                        ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectionReason"
                      value={r}
                      checked={rejectionReason === r}
                      onChange={() => setRejectionReason(r)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Or Custom Explanatory Note (Optional):
                </label>
                <textarea
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="e.g. Physical student card required to verify batch..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Confirm Flag & Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

