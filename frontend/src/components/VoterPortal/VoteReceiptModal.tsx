import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, ShieldCheck, Printer, Download, X } from 'lucide-react';

interface VoteReceiptModalProps {
  isOpen: boolean;
  electionTitle: string;
  receiptCode: string;
  votedAt: string;
  studentId: string;
  voterName: string;
  onClose: () => void;
}

export const VoteReceiptModal: React.FC<VoteReceiptModalProps> = ({
  isOpen,
  electionTitle,
  receiptCode,
  votedAt,
  studentId,
  voterName,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF9933', '#138808', '#0A2558', '#FFFFFF'],
        });
      } catch (err) {
        // Confetti fallback
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="tricolour-bar" />

        <div className="p-6 sm:p-8">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-[#0A2558] tracking-tight">
              Vote Cast Successfully!
            </h3>
            <p className="text-xs text-stone-500 mt-1 font-medium">
              Your biometric ballot has been registered and verified by the Election Commission.
            </p>
          </div>

          {/* Official Printable Receipt Certificate Slip */}
          <div id="printable-receipt" className="p-5 bg-[#FAF8F5] rounded-2xl border-2 border-dashed border-stone-300 relative mb-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#0A2558] text-orange-400 flex items-center justify-center text-xs font-black">
                  NSS
                </div>
                <div>
                  <p className="font-extrabold text-xs text-[#0A2558]">COLLEGIATE ELECTION COMMISSION</p>
                  <p className="text-[9px] text-stone-500 uppercase tracking-widest">Digital Voter Receipt Slip</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                OFFICIAL RECORD
              </span>
            </div>

            <div className="py-3.5 space-y-2 text-xs">
              <div>
                <p className="text-[10px] text-stone-400 uppercase font-semibold">Contested Election</p>
                <p className="font-bold text-stone-800">{electionTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <p className="text-[10px] text-stone-400 uppercase font-semibold">Verified Voter</p>
                  <p className="font-semibold text-stone-800">{voterName}</p>
                  <p className="text-[10px] text-stone-500 font-mono">{studentId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 uppercase font-semibold">Cast Timestamp</p>
                  <p className="font-mono text-stone-800 text-[11px]">{new Date(votedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[10px] text-stone-400 uppercase font-semibold">Cryptographic Receipt Code</p>
                <p className="font-mono font-bold text-emerald-800 bg-white p-2 rounded-lg border border-stone-200 text-xs tracking-wider select-all break-all">
                  {receiptCode}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Zero-Knowledge Ballot Secrecy Maintained</span>
              </span>
              <span>SHA-256 HMAC Sealed</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="w-1/2 py-2.5 px-3 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-stone-500" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={onClose}
              className="w-1/2 py-2.5 px-3 rounded-xl bg-[#0A2558] hover:bg-[#071B42] text-xs font-bold text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Done & Return</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

