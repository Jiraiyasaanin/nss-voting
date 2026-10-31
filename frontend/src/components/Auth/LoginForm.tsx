import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Fingerprint, Lock, ShieldCheck, UserCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onOpenRecovery: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister, onOpenRecovery }) => {
  const { login, loginWithWebAuthn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both your Student ID / Email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleWebAuthnLogin = async () => {
    if (!identifier.trim()) {
      setErrorMsg('Please enter your Student ID or College Email to initiate biometric passkey login.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginWithWebAuthn(identifier);
    } catch (err: any) {
      setErrorMsg(err.message || 'Biometric passkey authentication could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  // Demo account filler
  const fillDemoAccount = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Decorative Tricolour Header Seal */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-b from-[#0A2558] to-[#04122C] text-orange-400 shadow-md ring-4 ring-orange-500/10 mb-3">
          <Fingerprint className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-[#0A2558]">
          Institutional Identity Sign-In
        </h2>
        <p className="text-xs text-stone-500 mt-1 font-medium">
          National Service Scheme • Biometric Digital Ballot Portal
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-lg p-6 sm:p-8">
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-50/80 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Student ID / Roll Number or Email
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="e.g. NSS-2026-CS-001 or admin@nss.edu"
                className="w-full pl-3.5 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={onOpenRecovery}
                className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold cursor-pointer"
              >
                Reset / Recover Passkey?
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-3.5 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authenticate to Ballot</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-stone-200"></div>
              <span className="shrink mx-3 text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                Or Passwordless Biometrics
              </span>
              <div className="grow border-t border-stone-200"></div>
            </div>

            <button
              type="button"
              onClick={handleWebAuthnLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-[#0A2558] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Fingerprint className="w-4 h-4 text-emerald-700" />
              <span>Sign in with Registered Fingerprint / Passkey</span>
            </button>
          </div>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-5 border-t border-stone-100">
          <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Demo Fast-Fill:</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('NSS-2026-CS-001', 'Voter@123')}
              className="px-2 py-1.5 bg-stone-100 hover:bg-orange-50 hover:text-orange-900 hover:border-orange-200 border border-stone-200 rounded-lg text-[10px] font-semibold text-stone-700 transition cursor-pointer text-center"
            >
              🧑‍🎓 Student Voter
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@nss.edu', 'Admin@2026')}
              className="px-2 py-1.5 bg-stone-100 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-200 border border-stone-200 rounded-lg text-[10px] font-semibold text-stone-700 transition cursor-pointer text-center"
            >
              🏛️ Chief Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('officer@nss.edu', 'Officer@2026')}
              className="px-2 py-1.5 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-200 border border-stone-200 rounded-lg text-[10px] font-semibold text-stone-700 transition cursor-pointer text-center"
            >
              📋 Officer
            </button>
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="text-xs text-stone-500">
            First time eligible voter?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              Register College Voter Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

