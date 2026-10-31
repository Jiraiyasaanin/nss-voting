import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { api } from '../../services/api.js';
import { ElectionResultsSummary, Election } from '../../types/index.js';
import {
  Award,
  Download,
  FileText,
  Share2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trophy,
} from 'lucide-react';

export const ResultsPublisher: React.FC = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const [resultsData, setResultsData] = useState<ElectionResultsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishStatus, setPublishStatus] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.getElections().then(res => {
      // Find concluded or completed elections
      const closedOrCompleted = res.elections.filter(e => e.status === 'COMPLETED' || e.status === 'CLOSED');
      setElections(closedOrCompleted);
      if (closedOrCompleted.length > 0) {
        setSelectedElectionId(closedOrCompleted[0].id);
      }
    });
  }, []);

  const fetchResults = async () => {
    if (!selectedElectionId) return;
    try {
      setLoading(true);
      setMessage(null);
      const res = await api.getElectionResults(selectedElectionId);
      setResultsData(res.results);
      setPublishStatus(res.results.resultsPublished);
    } catch (err: any) {
      console.error('Failed to load results:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch results' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [selectedElectionId]);

  const handleTogglePublish = async () => {
    if (!selectedElectionId) return;
    try {
      const nextState = !publishStatus;
      await api.publishResults(selectedElectionId, nextState);
      setPublishStatus(nextState);
      setMessage({
        type: 'success',
        text: nextState
          ? 'Election results officially certified and published to all eligible voters.'
          : 'Results withheld from public view.',
      });
      fetchResults();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update publication status' });
    }
  };

  const handleDownloadCsv = () => {
    if (!selectedElectionId) return;
    const url = api.getResultsExportCsvUrl(selectedElectionId);
    window.open(url, '_blank');
  };

  const handleGeneratePdf = () => {
    if (!resultsData) return;

    const doc = new jsPDF();

    // Institutional Header
    doc.setFillColor(10, 37, 88); // Ashoka Navy
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('NATIONAL SERVICE SCHEME • COLLEGIATE ELECTION COMMISSION', 105, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL CERTIFICATION OF ELECTION RESULTS', 105, 19, { align: 'center' });

    // Tricolour Stripe
    doc.setFillColor(255, 153, 51); doc.rect(0, 24, 70, 2, 'F');
    doc.setFillColor(255, 255, 255); doc.rect(70, 24, 70, 2, 'F');
    doc.setFillColor(19, 136, 8); doc.rect(140, 24, 70, 2, 'F');

    // Election Details
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(resultsData.title, 14, 40);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${resultsData.status} | Certification: ${resultsData.resultsPublished ? 'PUBLISHED & SEALED' : 'PENDING'}`, 14, 48);
    doc.text(`Total Eligible Voters: ${resultsData.totalEligibleVoters} | Ballots Cast: ${resultsData.totalVotesCast} | Turnout: ${resultsData.turnoutPercentage}%`, 14, 55);

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 65, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Ballot #', 16, 70);
    doc.text('Candidate Nominee', 35, 70);
    doc.text('Department', 95, 70);
    doc.text('Votes', 145, 70);
    doc.text('Share %', 165, 70);
    doc.text('Status', 182, 70);

    let y = 78;
    resultsData.candidateResults.forEach(c => {
      doc.setFont('helvetica', c.isWinner ? 'bold' : 'normal');
      doc.text(`#${c.ballotNumber}`, 16, y);
      doc.text(c.name, 35, y);
      doc.text(c.department, 95, y);
      doc.text(c.voteCount.toString(), 145, y);
      doc.text(`${c.votePercentage}%`, 165, y);
      doc.text(c.isWinner ? 'ELECTED' : '-', 182, y);
      y += 8;
    });

    // Verification Seal Note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('This document constitutes the official certified voting return as validated through WebAuthn FIDO2 verification.', 14, y + 15);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, y + 22);

    doc.save(`certified_results_${resultsData.electionId.slice(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0A2558] tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <span>Results Certification & Public Release</span>
          </h2>
          <p className="text-xs text-stone-500">
            Audit final vote tallies, declare elected candidates, and publish certified election returns.
          </p>
        </div>

        {elections.length > 0 && (
          <select
            value={selectedElectionId}
            onChange={e => setSelectedElectionId(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold bg-white border border-stone-300 rounded-xl shadow-xs text-stone-800"
          >
            {elections.map(el => (
              <option key={el.id} value={el.id}>
                {el.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {elections.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
          <Award className="w-10 h-10 text-stone-400 mx-auto mb-2" />
          <p className="font-bold text-stone-700">No concluded elections ready for result calculation.</p>
          <p className="text-xs text-stone-400 mt-1">Once an active election is closed by election officers, official tally calculations appear here.</p>
        </div>
      ) : resultsData ? (
        <div className="space-y-6">
          
          {/* Action Ribbon: Publish, CSV, PDF */}
          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                publishStatus ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {publishStatus ? 'Officially Published' : 'Internal Preview Only'}
              </span>
              <span className="text-xs text-stone-500">
                Turnout: <strong className="text-stone-800">{resultsData.turnoutPercentage}%</strong> ({resultsData.totalVotesCast} valid votes)
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleTogglePublish}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  publishStatus
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs'
                }`}
              >
                {publishStatus ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{publishStatus ? 'Withhold Results' : 'Publish Results to Voters'}</span>
              </button>

              <button
                onClick={handleDownloadCsv}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-stone-600" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleGeneratePdf}
                className="px-3.5 py-2 bg-[#0A2558] hover:bg-[#071D47] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <FileText className="w-4 h-4 text-orange-400" />
                <span>Certified PDF Return</span>
              </button>
            </div>
          </div>

          {/* Candidate Results Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resultsData.candidateResults.map(c => (
              <div
                key={c.candidateId}
                className={`p-5 rounded-3xl border-2 transition relative ${
                  c.isWinner
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white border-stone-200 shadow-xs'
                }`}
              >
                {c.isWinner && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs">
                    <Trophy className="w-3.5 h-3.5 text-amber-300" />
                    <span>Elected Winner</span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                    c.isWinner ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700'
                  }`}>
                    #{c.ballotNumber}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-base leading-tight">
                      {c.name}
                    </h4>
                    <p className="text-xs text-stone-500">{c.department}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">{c.voteCount} Ballots</span>
                    <span className="font-mono font-bold text-stone-600">{c.votePercentage}%</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden p-0.5 border border-stone-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        c.isWinner ? 'bg-emerald-600' : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(c.votePercentage, 2))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : null}

    </div>
  );
};

