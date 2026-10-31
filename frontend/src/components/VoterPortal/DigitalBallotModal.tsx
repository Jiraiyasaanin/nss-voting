import React, { useState } from 'react';
import { Candidate, Election } from '../../types/index.js';
import { Shield, Check, Info, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface DigitalBallotModalProps {
  isOpen: boolean;
  election: Election;
  candidates: Candidate[];
  ballotToken: string;
  onProceedToReview: (selectedCandidate: Candidate) => void;
  onClose: () => void;
}

export const DigitalBallotModal: React.FC<DigitalBallotModalProps> = ({
  isOpen,
  election,
  candidates,
  onProceedToReview,
  onClose,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId) || null;

  const handleSelect = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FAF8F5] rounded-3xl max-w-3xl w-full border border-stone-300 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Tricolour Header Band */}
        <div className="tricolour-bar" />

        {/* Ballot Header */}
        <div className="bg-linear-to-b from-stone-900 to-stone-950 text-white p-5 sm:p-6 border-b border-stone-800">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-orange-600 text-white rounded">
                  Official Electronic Ballot
                </span>
                <span className="text-[11px] text-stone-400 font-mono">
                  SINGLE CHOICE • ID: {election.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-50 tracking-tight">
                {election.title}
              </h2>
              <p className="text-xs text-stone-300 mt-1 max-w-xl line-clamp-2">
                {election.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between text-xs text-stone-300">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Biometrically Authenticated Session • 5-min Token Active</span>
            </span>
            <span className="font-semibold text-amber-300">
              Select 1 Candidate below
            </span>
          </div>
        </div>

        {/* EVM Ballot Unit */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 px-2 flex justify-between">
            <span>Candidate Ballot Listing</span>
            <span className="hidden sm:inline">Tactile Ballot Switch</span>
          </div>

          {candidates.length === 0 ? (
            <div className="p-8 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
              No registered candidates found for this ballot.
            </div>
          ) : (
            candidates.map(candidate => {
              const isSelected = selectedCandidateId === candidate.id;
              return (
                <div
                  key={candidate.id}
                  onClick={() => handleSelect(candidate.id)}
                  className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-white border-stone-200 hover:border-orange-300 hover:shadow-xs'
                  }`}
                >
                  {/* Left: Ballot Number & Portrait */}
                  <div className="flex items-center gap-4 grow">
                    {/* Ballot Number Badge */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-stone-100 text-stone-800 border-stone-300 group-hover:bg-orange-50 group-hover:text-orange-900 group-hover:border-orange-200'
                    }`}>
                      #{candidate.ballot_number}
                    </div>

                    {/* Candidate Photo or Avatar */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center">
                      {candidate.photo_url ? (
                        <img
                          src={candidate.photo_url}
                          alt={candidate.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-[#0A2558] to-[#1E3A8A] text-orange-200 font-bold flex items-center justify-center text-sm">
                          {candidate.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Candidate Details */}
                    <div className="grow min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-stone-900 text-base leading-tight">
                          {candidate.name}
                        </h4>
                        {candidate.symbol_url && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-stone-100 text-stone-700 rounded-md border border-stone-200">
                            Symbol: {candidate.symbol_url}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 font-medium">
                        {candidate.department}
                      </p>
                      <p className="text-xs text-stone-700 mt-1 line-clamp-2 italic">
                        "{candidate.manifesto}"
                      </p>
                    </div>
                  </div>

                  {/* Right: Tactile EVM Button */}
                  <div className="shrink-0 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(candidate.id);
                      }}
                      className={`w-14 h-11 rounded-xl font-bold text-xs uppercase flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'evm-btn-selected text-white ring-2 ring-emerald-400'
                          : 'evm-btn text-white hover:brightness-110'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-5 h-5 animate-in zoom-in-50 duration-150" />
                      ) : (
                        <span>VOTE</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Ballot Action Footer */}
        <div className="bg-white p-4 sm:p-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-stone-500">
            {selectedCandidate ? (
              <p className="font-semibold text-stone-900">
                Selected: <span className="text-emerald-700 font-bold">#{selectedCandidate.ballot_number} {selectedCandidate.name}</span>
              </p>
            ) : (
              <p className="text-stone-400 italic">No candidate selected yet.</p>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-300 rounded-xl hover:bg-stone-50 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                if (selectedCandidate) {
                  onProceedToReview(selectedCandidate);
                }
              }}
              disabled={!selectedCandidate}
              className="w-1/2 sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Review Vote</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

