import React, { useState } from 'react';
import { User } from '../../types/index.js';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Building,
  GraduationCap,
  Mail,
  UserCheck,
  HelpCircle,
  FileBadge,
  Sparkles,
} from 'lucide-react';

interface VerificationPendingViewProps {
  user: User;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
}

export const VerificationPendingView: React.FC<VerificationPendingViewProps> = ({
  user,
  onRefresh,
  onLogout,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      await onRefresh();
      setRefreshMessage('Status checked. Awaiting officer confirmation.');
    } catch (err: any) {
      setRefreshMessage(err.message || 'Could not refresh status.');
    } finally {
      setTimeout(() => setRefreshing(false), 600);
      setTimeout(() => setRefreshMessage(null), 4000);
    }
  };

  const isRejected = user.is_verified === -1;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 animate-in fade-in duration-200">
      
      {/* Institutional Top Crest */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-b from-[#0A2558] to-[#04122C] text-orange-400 shadow-md ring-4 ring-orange-500/10 mb-4">
          {isRejected ? (
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          ) : (
            <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
          )}
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border shadow-2xs ${
            isRejected
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }">
            {isRejected ? 'Registration Flagged / Action Required' : 'Identity Verification In Progress'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0A2558]">
          {isRejected ? 'Student Identity Review Flagged' : 'College Identity Verification Desk'}
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 max-w-lg mx-auto mt-2">
          {isRejected
            ? 'The Election Returning Officer was unable to certify your student registration credentials.'
            : 'Your registration details have been submitted to the College Election Officer for roster authentication before ballot access is unlocked.'}
        </p>
      </div>

      {/* Main Status Container */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-lg overflow-hidden">
        
        {/* Highlight Banner */}
        <div className={`p-5 border-b flex items-start gap-4 ${
          isRejected ? 'bg-rose-50/80 border-rose-200' : 'bg-linear-to-r from-amber-50 to-orange-50 border-amber-200'
        }`}>
          {isRejected ? (
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              ⏳
            </div>
          )}
          <div>
            <h2 className={`text-sm font-bold ${isRejected ? 'text-rose-900' : 'text-amber-950'}`}>
              {isRejected
                ? 'Identity Verification Flagged by Returning Officer'
                : 'Account Awaiting Official Approval'}
            </h2>
            <p className={`text-xs mt-1 leading-relaxed ${isRejected ? 'text-rose-700' : 'text-amber-800'}`}>
              {isRejected
                ? user.rejection_reason || 'Discrepancy detected with university enrollment rolls. Please contact the election desk with your physical Student ID card.'
                : 'To prevent impersonation and enforce the constitutional 1-Person-1-Vote mandate, student accounts are manually verified against the university student database. Once approved, your EVM voting dashboard and biometric passkey enrollment will instantly activate.'}
            </p>
          </div>
        </div>

        {/* Submitted Registration Profile */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileBadge className="w-4 h-4 text-orange-500" />
              <span>Submitted Registration Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200/80">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-stone-500">Student Roll / College ID</span>
                <p className="text-sm font-mono font-bold text-[#0A2558] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  {user.student_id}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-stone-500">Full Legal Name</span>
                <p className="text-sm font-bold text-stone-900">{user.full_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                  <Building className="w-3 h-3 text-stone-400" />
                  Department
                </span>
                <p className="text-xs font-medium text-stone-800">{user.department}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-stone-400" />
                  Academic Batch Year
                </span>
                <p className="text-xs font-medium text-stone-800">Class of {user.batch_year}</p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-stone-400" />
                  Institutional Email
                </span>
                <p className="text-xs font-mono text-stone-700">{user.email}</p>
              </div>
            </div>
          </div>

          {/* 3-Step Verification Roadmap */}
          <div className="border-t border-stone-100 pt-6">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Verification Lifecycle</span>
            </h3>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-950">1. Account Registered</p>
                  <p className="text-[11px] text-emerald-800">
                    Student credentials submitted and enrolled into verification queue.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`flex items-start gap-3 p-3 rounded-xl border ${
                isRejected
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              }`}>
                {isRejected ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '4s' }} />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-bold ${isRejected ? 'text-rose-950' : 'text-amber-950'}`}>
                      2. Election Returning Officer Certification
                    </p>
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-amber-200 text-amber-900">
                      CURRENT STEP
                    </span>
                  </div>
                  <p className={`text-[11px] ${isRejected ? 'text-rose-800' : 'text-amber-800'}`}>
                    {isRejected
                      ? `Officer note: ${user.rejection_reason || 'Pending physical ID review'}`
                      : 'The Returning Officer cross-verifies student roll number with college enrollment records.'}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 bg-stone-50 border border-stone-200/70 rounded-xl opacity-60">
                <UserCheck className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-stone-700">3. Democratic EVM Ballot Unlocked</p>
                  <p className="text-[11px] text-stone-500">
                    Biometric enrollment unlocked; vote in active student council elections.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Actions */}
          <div className="border-t border-stone-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Checking Verification Status...' : 'Check Verification Status'}</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition flex items-center justify-center gap-2 cursor-pointer border border-stone-200 sm:border-transparent"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {refreshMessage && (
            <p className="text-center text-xs font-medium text-stone-600 animate-in fade-in">
              {refreshMessage}
            </p>
          )}

        </div>
      </div>

      {/* Returning Officer Helpdesk Card */}
      <div className="mt-6 bg-[#0A2558]/5 border border-[#0A2558]/10 rounded-xl p-4 flex items-start gap-3 text-xs text-stone-600">
        <HelpCircle className="w-4 h-4 text-[#0A2558] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#0A2558]">Need Expedited Verification or Assistance?</span>
          <p className="mt-0.5 text-stone-500">
            Visit the Returning Officer Identity Desk in <strong>Room 102 (Student Affairs Building)</strong> with your physical Student ID card, or contact{' '}
            <span className="font-mono text-stone-700 font-semibold">officer@nss.edu</span>.
          </p>
        </div>
      </div>

    </div>
  );
};
