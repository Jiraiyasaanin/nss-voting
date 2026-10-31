import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { executeWebAuthnAuthentication } from '../../services/webauthn.js';
import { Fingerprint, ShieldCheck, X, AlertCircle, ScanFace } from 'lucide-react';

interface BiometricPromptModalProps {
  isOpen: boolean;
  electionId: string;
  electionTitle: string;
  onSuccess: (ballotToken: string) => void;
  onClose: () => void;
}

export const BiometricPromptModal: React.FC<BiometricPromptModalProps> = ({
  isOpen,
  electionId,
  electionTitle,
  onSuccess,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleWebAuthnPrompt = async (simulated: boolean = false) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      if (simulated) {
        // Dev / Test simulation fallback
        const res = await api.verifyBallotUnlock(electionId, null, true);
        onSuccess(res.ballotToken);
        return;
      }

      // Step 1: Request challenge from server
      const { options } = await api.getBallotUnlockChallenge(electionId);

      // Step 2: Trigger platform WebAuthn prompt (Touch ID / Face ID / Windows Hello)
      const assertion = await executeWebAuthnAuthentication(options);

      // Step 3: Verify cryptographic signature on backend & obtain single-use Ballot Token
      const res = await api.verifyBallotUnlock(electionId, assertion, false);
      onSuccess(res.ballotToken);
    } catch (err: any) {
      console.error('Biometric unlock failure:', err);
      setErrorMsg(err.message || 'Biometric authentication verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <div className="tricolour-bar" />

        <div className="p-6 sm:p-8 text-center">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner Visualizer */}
          <div className="relative mx-auto my-3 w-24 h-24 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full border-2 border-orange-500/40 ${loading ? 'animate-ping' : ''}`} />
            <div className="w-20 h-20 rounded-full bg-linear-to-b from-[#0A2558] to-[#04122C] text-orange-400 flex items-center justify-center shadow-lg ring-4 ring-orange-500/20">
              <Fingerprint className={`w-10 h-10 ${loading ? 'animate-pulse text-amber-300' : ''}`} />
            </div>
          </div>

          <h3 className="text-xl font-black text-[#0A2558] tracking-tight mt-3">
            Biometric Identity Verification
          </h3>
          <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
            Please authenticate using your device fingerprint scanner or Face ID to unlock your electronic ballot for:
          </p>
          <div className="mt-2.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-xl text-xs font-bold text-orange-950 inline-block">
            {electionTitle}
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="mt-6 space-y-2.5">
            <button
              onClick={() => handleWebAuthnPrompt(false)}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  <span>Scan Fingerprint / Face ID</span>
                </>
              )}
            </button>

            {/* Test Simulation Button for desktop development environment */}
            <button
              onClick={() => handleWebAuthnPrompt(true)}
              disabled={loading}
              type="button"
              className="w-full py-2 px-3 text-[11px] font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition border border-stone-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ScanFace className="w-3.5 h-3.5 text-stone-500" />
              <span>Dev / Testing: Simulate Platform Sensor</span>
            </button>
          </div>

          <p className="text-[11px] text-stone-400 mt-4 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cryptographic challenge-response verification via WebAuthn</span>
          </p>
        </div>
      </div>
    </div>
  );
};

