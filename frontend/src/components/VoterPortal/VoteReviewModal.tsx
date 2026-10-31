import React, { useState } from 'react';
import { Candidate, Election } from '../../types/index.js';
import { api } from '../../services/api.js';
import { ShieldAlert, CheckCircle, ArrowLeft, AlertCircle, Lock } from 'lucide-react';

interface VoteReviewModalProps {
  isOpen: boolean;
  election: Election;
  candidate: Candidate;
  ballotToken: string;
  onSuccess: (receiptCode: string, votedAt: string) => void;
  onBackToBallot: () => void;
  onClose: () => void;
}

export const VoteReviewModal: React.FC<VoteReviewModalProps> = ({
  isOpen,
  election,
  candidate,
  ballotToken,
  onSuccess,
  onBackToBallot,
  onClose,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.submitBallot(election.id, ballotToken, candidate.id);
      onSuccess(res.receiptCode, res.votedAt);
    } catch (err: any) {
      console.error('Final vote submission error:', err);
      setErrorMsg(err.message || 'Vote submission failed. You may have already cast a vote.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="tricolour-bar" />

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-[#0A2558] tracking-tight">
              Review & Confirm Your Ballot
            </h3>
            <p className="text-xs text-stone-500 mt-1 font-medium">
              Final Democratic Affirmation • Step 2 of 2
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Election & Selected Candidate Card */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 mb-5 space-y-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                Election Contest
              </p>
              <p className="text-xs font-bold text-stone-800">
                {election.title}
              </p>
            </div>

            <div className="pt-2 border-t border-stone-200/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                #{candidate.ballot_number}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                  Your Selected Choice
                </p>
                <p className="text-base font-black text-stone-900">
                  {candidate.name}
                </p>
                <p className="text-xs text-stone-500">
                  {candidate.department} {candidate.symbol_url ? `• Symbol: ${candidate.symbol_url}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Immutable Ballot Warning */}
          <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs text-amber-900 space-y-1 mb-6">
            <p className="font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Immutable & Anonymous Ballot Box</span>
            </p>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Once submitted, your vote is anonymized cryptographically and committed to the database. 
              <strong>It cannot be edited, retrieved, or correlated to your identity by administrators.</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onBackToBallot}
              disabled={submitting}
              className="w-full sm:w-1/2 py-2.5 px-4 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Selection</span>
            </button>

            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="w-full sm:w-1/2 py-3 px-4 text-xs font-black text-white bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md hover:shadow-lg rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>CAST MY VOTE NOW</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

