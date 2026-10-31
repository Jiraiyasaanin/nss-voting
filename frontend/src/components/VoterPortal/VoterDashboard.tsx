import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { Election, Candidate } from '../../types/index.js';
import { ElectionDetailModal } from './ElectionDetailModal.js';
import { BiometricPromptModal } from './BiometricPromptModal.js';
import { DigitalBallotModal } from './DigitalBallotModal.js';
import { VoteReviewModal } from './VoteReviewModal.js';
import { VoteReceiptModal } from './VoteReceiptModal.js';
import {
  Vote,
  Fingerprint,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface VoterDashboardProps {
  onOpenBiometricEnroll: () => void;
  onViewResults: (electionId: string) => void;
}

export const VoterDashboard: React.FC<VoterDashboardProps> = ({
  onOpenBiometricEnroll,
  onViewResults,
}) => {
  const { user, hasBiometrics } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'participated' | 'concluded'>('active');

  // Modal flow states
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voterStatus, setVoterStatus] = useState<any>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [bioPromptOpen, setBioPromptOpen] = useState(false);
  const [ballotModalOpen, setBallotModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const [activeBallotToken, setActiveBallotToken] = useState<string>('');
  const [chosenCandidate, setChosenCandidate] = useState<Candidate | null>(null);
  const [latestReceipt, setLatestReceipt] = useState<{ code: string; time: string }>({ code: '', time: '' });

  const fetchElections = async () => {
    try {
      setLoading(true);
      const res = await api.getElections();
      setElections(res.elections);
    } catch (err) {
      console.error('Failed to load elections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  const openElectionDetails = async (election: Election) => {
    setSelectedElection(election);
    try {
      const data = await api.getElectionDetails(election.id);
      setCandidates(data.candidates);
      setVoterStatus(data.voterStatus);
      setDetailModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch election details:', err);
    }
  };

  const startVotingFlow = async (election: Election) => {
    setSelectedElection(election);
    try {
      const data = await api.getElectionDetails(election.id);
      setCandidates(data.candidates);
      setVoterStatus(data.voterStatus);
      setBioPromptOpen(true);
    } catch (err) {
      console.error('Error initiating voting flow:', err);
    }
  };

  const handleBiometricSuccess = (token: string) => {
    setActiveBallotToken(token);
    setBioPromptOpen(false);
    setBallotModalOpen(true);
  };

  const handleProceedToReview = (candidate: Candidate) => {
    setChosenCandidate(candidate);
    setBallotModalOpen(false);
    setReviewModalOpen(true);
  };

  const handleVoteSubmissionSuccess = (receiptCode: string, votedAt: string) => {
    setLatestReceipt({ code: receiptCode, time: votedAt });
    setReviewModalOpen(false);
    setReceiptModalOpen(true);
    fetchElections(); // Refresh status
  };

  const activeElections = elections.filter(e => e.status === 'ACTIVE' && e.isEligible !== false);
  const participatedElections = elections.filter(e => e.hasVoted);
  const concludedElections = elections.filter(e => e.status === 'COMPLETED' || e.status === 'CLOSED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Voter Welcome Banner */}
      <div className="relative overflow-hidden bg-linear-to-r from-[#0A2558] via-[#0D3B8E] to-[#1E3A8A] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-orange-500 text-white rounded-md shadow-xs">
                Official Voter Portal
              </span>
              <span className="px-2.5 py-1 text-[11px] font-bold bg-white/10 text-emerald-300 rounded-md border border-white/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Identity Verified</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome, {user?.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-stone-200 font-medium">
              Roll No: <span className="font-mono text-amber-300 font-bold">{user?.student_id}</span> • {user?.department} • Batch of {user?.batch_year}
            </p>
          </div>

          {/* Biometric Status Quick Widget */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 max-w-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                hasBiometrics ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
              }`}>
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {hasBiometrics ? 'Passkey Enrolled' : 'Passkey Required'}
                </p>
                <p className="text-[11px] text-stone-300">
                  {hasBiometrics ? 'Biometrics active on device' : 'Enroll before voting'}
                </p>
              </div>
            </div>
            {!hasBiometrics && (
              <button
                onClick={onOpenBiometricEnroll}
                className="mt-3 w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Enroll Passkey Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200">
        <div className="flex space-x-2 sm:space-x-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 px-2 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'active'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Active Elections ({activeElections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('participated')}
            className={`pb-3 px-2 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'participated'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>My Receipts ({participatedElections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('concluded')}
            className={`pb-3 px-2 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'concluded'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Certified Results ({concludedElections.length})</span>
          </button>
        </div>
      </div>

      {/* Active Elections Tab */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-stone-400">Loading live ballots...</div>
          ) : activeElections.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
              <Calendar className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <p className="font-bold text-stone-700">No active election ballots at this moment.</p>
              <p className="text-xs text-stone-400 mt-1">Check back when new collegiate elections are scheduled.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeElections.map(election => (
                <div
                  key={election.id}
                  className="bg-white rounded-3xl border border-stone-200/90 shadow-md hover:shadow-lg transition-all p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                        Voting Live
                      </span>
                      <span className="text-xs font-semibold text-stone-500">
                        {election.candidateCount || 0} Candidates
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-[#0A2558] tracking-tight mb-2">
                      {election.title}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-3 mb-4 leading-relaxed">
                      {election.description}
                    </p>

                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between mb-4">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        <span>Deadline:</span>
                      </span>
                      <span className="font-mono font-semibold text-stone-800">
                        {new Date(election.end_time).toLocaleDateString()} at {new Date(election.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => openElectionDetails(election)}
                      className="px-3.5 py-2 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                    >
                      Manifestos & Profiles
                    </button>

                    {election.hasVoted ? (
                      <div className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Ballot Cast</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => startVotingFlow(election)}
                        className="px-5 py-2.5 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Fingerprint className="w-4 h-4" />
                        <span>Vote with Biometrics</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Participated Elections Tab */}
      {activeTab === 'participated' && (
        <div className="space-y-4">
          {participatedElections.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
              <FileText className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <p className="font-bold text-stone-700">You haven't participated in any elections yet.</p>
              <p className="text-xs text-stone-400 mt-1">Once you cast a ballot, your verifiable cryptographic receipts will be stored here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {participatedElections.map(election => (
                <div key={election.id} className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full">
                      Participation Verified
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">
                      {election.votedAt ? new Date(election.votedAt).toLocaleString() : ''}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-stone-900 mb-2">{election.title}</h3>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 my-3">
                    <p className="text-[10px] text-stone-400 uppercase font-bold">Cryptographic Receipt Code</p>
                    <p className="text-xs font-mono font-bold text-emerald-800 select-all break-all">
                      {election.receiptCode || 'NSS-REC-VERIFIED'}
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedElection(election);
                        setLatestReceipt({
                          code: election.receiptCode || 'NSS-REC-VERIFIED',
                          time: election.votedAt || new Date().toISOString(),
                        });
                        setReceiptModalOpen(true);
                      }}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      View Receipt Slip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Concluded Elections Tab */}
      {activeTab === 'concluded' && (
        <div className="space-y-4">
          {concludedElections.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
              <Award className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <p className="font-bold text-stone-700">No concluded elections on record yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {concludedElections.map(election => (
                <div key={election.id} className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 rounded-full">
                        Concluded
                      </span>
                      {election.results_published ? (
                        <span className="text-[11px] font-bold text-emerald-600">Results Certified</span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-600">Awaiting Certification</span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-stone-900 mb-2">{election.title}</h3>
                    <p className="text-xs text-stone-500 line-clamp-2 mb-4">{election.description}</p>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => openElectionDetails(election)}
                      className="text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
                    >
                      Election Info
                    </button>

                    {election.results_published ? (
                      <button
                        onClick={() => onViewResults(election.id)}
                        className="px-4 py-2 bg-[#0A2558] hover:bg-[#06183B] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Award className="w-3.5 h-3.5 text-orange-400" />
                        <span>View Official Results</span>
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400 italic">Results pending publish</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedElection && (
        <>
          <ElectionDetailModal
            isOpen={detailModalOpen}
            election={selectedElection}
            candidates={candidates}
            voterStatus={voterStatus}
            onOpenBallotUnlock={() => setBioPromptOpen(true)}
            onClose={() => setDetailModalOpen(false)}
          />

          <BiometricPromptModal
            isOpen={bioPromptOpen}
            electionId={selectedElection.id}
            electionTitle={selectedElection.title}
            onSuccess={handleBiometricSuccess}
            onClose={() => setBioPromptOpen(false)}
          />

          <DigitalBallotModal
            isOpen={ballotModalOpen}
            election={selectedElection}
            candidates={candidates}
            ballotToken={activeBallotToken}
            onProceedToReview={handleProceedToReview}
            onClose={() => setBallotModalOpen(false)}
          />

          {chosenCandidate && (
            <VoteReviewModal
              isOpen={reviewModalOpen}
              election={selectedElection}
              candidate={chosenCandidate}
              ballotToken={activeBallotToken}
              onSuccess={handleVoteSubmissionSuccess}
              onBackToBallot={() => {
                setReviewModalOpen(false);
                setBallotModalOpen(true);
              }}
              onClose={() => setReviewModalOpen(false)}
            />
          )}

          <VoteReceiptModal
            isOpen={receiptModalOpen}
            electionTitle={selectedElection.title}
            receiptCode={latestReceipt.code}
            votedAt={latestReceipt.time}
            studentId={user?.student_id || ''}
            voterName={user?.full_name || ''}
            onClose={() => setReceiptModalOpen(false)}
          />
        </>
      )}

    </div>
  );
};

