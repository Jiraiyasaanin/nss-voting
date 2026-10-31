import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Fingerprint, ShieldCheck, X, CheckCircle2, AlertCircle, Laptop, Smartphone } from 'lucide-react';

interface BiometricEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BiometricEnrollModal: React.FC<BiometricEnrollModalProps> = ({ isOpen, onClose }) => {
  const { user, authenticators, enrollBiometrics } = useAuth();
  const [deviceName, setDeviceName] = useState('My Device Passkey');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEnroll = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await enrollBiometrics(deviceName.trim() || 'Biometric Authenticator');
      setSuccessMsg('Biometric authenticator successfully enrolled and cryptographically bound to your account!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete biometric passkey enrollment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Tricolour Accent */}
        <div className="tricolour-bar" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
                <Fingerprint className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0A2558]">
                  Biometric Passkey Enrollment
                </h3>
                <p className="text-xs text-stone-500">
                  FIDO2 / WebAuthn Hardware Protection
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 mb-5 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-stone-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Biometric Privacy Guaranteed</span>
            </div>
            <p>
              Raw fingerprints and facial geometry <strong>never leave your personal device</strong>. 
              The voting platform only verifies public-key cryptographic signatures through WebAuthn.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Device name input */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Device Name / Label
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder="e.g. MacBook Touch ID, Pixel Fingerprint, iPhone Face ID"
              className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            onClick={handleEnroll}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Fingerprint className="w-4 h-4" />
                <span>Trigger Hardware Biometric Prompt</span>
              </>
            )}
          </button>

          {/* Enrolled authenticators list */}
          {authenticators.length > 0 && (
            <div className="mt-6 pt-5 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Enrolled Devices on Account ({authenticators.length})
              </h4>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {authenticators.map((auth, idx) => (
                  <div key={auth.id || idx} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-stone-500" />
                      <div>
                        <p className="font-semibold text-stone-800">{auth.device_name || 'Biometric Authenticator'}</p>
                        <p className="text-[10px] text-stone-400">Enrolled: {new Date(auth.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-semibold">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

