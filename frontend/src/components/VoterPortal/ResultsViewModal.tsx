import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { ElectionResultsSummary } from '../../types/index.js';
import { Trophy, Award, X, Users, CheckCircle2 } from 'lucide-react';

interface ResultsViewModalProps {
  electionId: string;
  onClose: () => void;
}

export const ResultsViewModal: React.FC<ResultsViewModalProps> = ({ electionId, onClose }) => {
  const [results, setResults] = useState<ElectionResultsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getElectionResults(electionId)
      .then(res => setResults(res.results))
      .catch(err => setErrorMsg(err.message || 'Results not yet available'))
      .finally(() => setLoading(false));
  }, [electionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="tricolour-bar" />

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  Certified Return
                </span>
                <span className="text-xs text-stone-500 font-medium">Official Election Results</span>
              </div>
              <h2 className="text-xl font-black text-[#0A2558] tracking-tight">
                {results?.title || 'Certified Election Results'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-stone-400">Loading certified results...</div>
          ) : errorMsg ? (
            <div className="py-8 text-center text-stone-500">
              <p className="font-bold text-stone-700">{errorMsg}</p>
            </div>
          ) : results ? (
            <div className="py-4 space-y-5">
              
              {/* Turnout Banner */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between text-xs text-stone-700">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0A2558]" />
                  <span>Total Ballots Cast: <strong className="text-stone-900">{results.totalVotesCast}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Turnout: <strong className="text-emerald-700">{results.turnoutPercentage}%</strong></span>
                </div>
              </div>

              {/* Candidate Results */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {results.candidateResults.map(c => (
                  <div
                    key={c.candidateId}
                    className={`p-4 rounded-2xl border-2 transition ${
                      c.isWinner
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                          c.isWinner ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700'
                        }`}>
                          #{c.ballotNumber}
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm">{c.name}</h4>
                          <p className="text-[11px] text-stone-500">{c.department}</p>
                        </div>
                      </div>

                      {c.isWinner && (
                        <div className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                          <Trophy className="w-3 h-3 text-amber-300" />
                          <span>Elected</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-700">{c.voteCount} Votes</span>
                        <span className="font-mono font-bold text-stone-700">{c.votePercentage}%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-stone-200">
                        <div
                          className={`h-full rounded-full ${c.isWinner ? 'bg-emerald-600' : 'bg-orange-500'}`}
                          style={{ width: `${Math.min(100, Math.max(c.votePercentage, 2))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : null}

          <div className="pt-3 border-t border-stone-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

