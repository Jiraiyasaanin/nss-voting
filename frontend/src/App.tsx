import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { LoginForm } from './components/Auth/LoginForm.js';
import { RegisterForm } from './components/Auth/RegisterForm.js';
import { BiometricEnrollModal } from './components/Auth/BiometricEnrollModal.js';
import { AccountRecoveryModal } from './components/Auth/AccountRecoveryModal.js';
import { VoterDashboard } from './components/VoterPortal/VoterDashboard.js';
import { AdminPortal } from './components/AdminPortal/AdminPortal.js';
import { ResultsViewModal } from './components/VoterPortal/ResultsViewModal.js';

const MainApp: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activePortalView, setActivePortalView] = useState<'voter' | 'admin'>('voter');

  // Global modals
  const [bioEnrollOpen, setBioEnrollOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [resultsModalElectionId, setResultsModalElectionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Connecting to NSS Voting Core...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Authentication Portal
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between">
        <div className="tricolour-bar" />

        <div className="grow flex items-center justify-center p-4 sm:p-6">
          {authView === 'login' ? (
            <LoginForm
              onSwitchToRegister={() => setAuthView('register')}
              onOpenRecovery={() => setRecoveryOpen(true)}
            />
          ) : (
            <RegisterForm
              onSwitchToLogin={() => setAuthView('login')}
              onSuccess={() => {
                setAuthView('login');
                setBioEnrollOpen(true);
              }}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="py-4 text-center text-xs text-stone-400 border-t border-stone-200/60">
          <p>National Service Scheme • Secure Biometric Digital Voting Platform • FIDO2 WebAuthn</p>
        </footer>

        <AccountRecoveryModal
          isOpen={recoveryOpen}
          onClose={() => setRecoveryOpen(false)}
        />
        <BiometricEnrollModal
          isOpen={bioEnrollOpen}
          onClose={() => setBioEnrollOpen(false)}
        />
      </div>
    );
  }

  // Logged in -> Authenticated Application
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between">
      <div>
        <Navbar
          activeView={activePortalView}
          setActiveView={(view) => setActivePortalView(view)}
          onOpenBiometricEnroll={() => setBioEnrollOpen(true)}
          onOpenRecovery={() => setRecoveryOpen(true)}
        />

        <main className="pb-12">
          {activePortalView === 'admin' && isAdmin ? (
            <AdminPortal />
          ) : (
            <VoterDashboard
              onOpenBiometricEnroll={() => setBioEnrollOpen(true)}
              onViewResults={(electionId) => setResultsModalElectionId(electionId)}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <BiometricEnrollModal
        isOpen={bioEnrollOpen}
        onClose={() => setBioEnrollOpen(false)}
      />

      <AccountRecoveryModal
        isOpen={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
      />

      {resultsModalElectionId && (
        <ResultsViewModal
          electionId={resultsModalElectionId}
          onClose={() => setResultsModalElectionId(null)}
        />
      )}

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-semibold text-stone-700">NSS Democratic Governance System</span>
            <span className="text-stone-300">|</span>
            <span>Cryptographic Dual-Record Split</span>
          </div>
          <p className="text-[11px] text-stone-400">
            One Verified Student = One Account = One Vote • Zero Biometric Storage
          </p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
