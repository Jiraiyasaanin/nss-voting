import React from 'react';
import { Election, Candidate } from '../../types/index.js';
import { Calendar, Clock, Award, BookOpen, Fingerprint, CheckCircle2, X } from 'lucide-react';

interface ElectionDetailModalProps {
  isOpen: boolean;
  election: Election;
  candidates: Candidate[];
  voterStatus: { isEligible: boolean; hasVoted: boolean; receiptCode: string | null; votedAt: string | null } | null;
  onOpenBallotUnlock: () => void;
  onClose: () => void;
}

export const ElectionDetailModal: React.FC<ElectionDetailModalProps> = ({
  isOpen,
  election,
  candidates,
  voterStatus,
  onOpenBallotUnlock,
  onClose,
}) => {
  if (!isOpen) return null;

  const isActive = election.status === 'ACTIVE';
  const hasVoted = voterStatus?.hasVoted;
  const isEligible = voterStatus?.isEligible !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        <div className="tricolour-bar" />

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${
                  isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-700'
                }`}>
                  {election.status}
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  {election.eligibility_type === 'ALL' ? 'Open to All Students' : 'Departmental Eligibility'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-[#0A2558] tracking-tight">
                {election.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-4">
            <p className="text-sm text-stone-700 leading-relaxed">
              {election.description}
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
              <div className="flex items-center gap-2.5 text-stone-600">
                <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Voting Opens: {new Date(election.start_time).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2.5 text-stone-600">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Voting Closes: {new Date(election.end_time).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Candidates Directory */}
          <div className="mt-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-stone-800 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-600" />
              <span>Certified Candidate Profiles ({candidates.length})</span>
            </h3>

            <div className="space-y-4 max-h-[42vh] overflow-y-auto pr-1">
              {candidates.map(candidate => (
                <div key={candidate.id} className="p-4 bg-stone-50/70 hover:bg-stone-50 rounded-2xl border border-stone-200 transition">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-stone-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-stone-700">
                      {candidate.photo_url ? (
                        <img src={candidate.photo_url} alt={candidate.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base text-[#0A2558]">#{candidate.ballot_number}</span>
                      )}
                    </div>

                    <div className="grow">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm">
                            #{candidate.ballot_number} {candidate.name}
                          </h4>
                          <p className="text-xs text-stone-500 font-medium">
                            {candidate.department} {candidate.symbol_url ? `• Symbol: ${candidate.symbol_url}` : ''}
                          </p>
                        </div>
                      </div>

                      {candidate.qualifications && (
                        <p className="text-xs text-stone-600 mt-2 font-medium flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                          <span>{candidate.qualifications}</span>
                        </p>
                      )}

                      <div className="mt-2 pt-2 border-t border-stone-200/70 text-xs text-stone-700">
                        <span className="font-bold text-stone-900 uppercase text-[10px] tracking-wider block mb-0.5">
                          Candidate Manifesto:
                        </span>
                        <p className="italic">"{candidate.manifesto}"</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Voter Action Status */}
          <div className="mt-6 pt-5 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {hasVoted ? (
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Your ballot has already been cast for this election.</span>
                </div>
              ) : !isEligible ? (
                <p className="text-xs font-semibold text-stone-500">
                  You are not eligible for this specific election contest.
                </p>
              ) : !isActive ? (
                <p className="text-xs font-semibold text-stone-500">
                  This election is currently {election.status.toLowerCase()}.
                </p>
              ) : (
                <p className="text-xs font-semibold text-stone-600">
                  Ready to cast your vote? Requires biometric identity verification.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="w-1/2 sm:w-auto px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-300 rounded-xl hover:bg-stone-50 transition cursor-pointer"
              >
                Close
              </button>

              {isActive && !hasVoted && isEligible && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenBallotUnlock();
                  }}
                  className="w-1/2 sm:w-auto px-6 py-2.5 text-xs font-black text-white bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Verify Biometrics & Vote</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

