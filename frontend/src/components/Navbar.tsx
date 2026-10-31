import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Shield, Fingerprint, LogOut, User as UserIcon, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';

interface NavbarProps {
  activeView: 'voter' | 'admin';
  setActiveView: (view: 'voter' | 'admin') => void;
  onOpenBiometricEnroll: () => void;
  onOpenRecovery: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onOpenBiometricEnroll,
  onOpenRecovery,
}) => {
  const { user, hasBiometrics, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200 shadow-xs">
      {/* Tricolour Accent Ribbon */}
      <div className="tricolour-bar" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Crest */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#0A2558] to-[#1E3A8A] flex items-center justify-center shadow-xs ring-2 ring-orange-500/30">
              {/* Ashoka Chakra Motif */}
              <svg className="w-6 h-6 text-orange-400 chakra-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-[#0A2558]">
                  NSS DIGITAL VOTING
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                  SECURE BALLOT
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
                Collegiate Democratic Election Portal • WebAuthn Verified
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            {/* View Switcher for Admins */}
            {isAdmin && (
              <div className="bg-stone-100 p-1 rounded-lg flex items-center border border-stone-200">
                <button
                  onClick={() => setActiveView('voter')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                    activeView === 'voter'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Voter Ballot
                </button>
                <button
                  onClick={() => setActiveView('admin')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                    activeView === 'admin'
                      ? 'bg-[#0A2558] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-orange-400" />
                  Admin HQ
                </button>
              </div>
            )}

            {/* Biometric Status Indicator */}
            {user?.role === 'VOTER' && (
              hasBiometrics ? (
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Passkey Verified</span>
                </div>
              ) : (
                <button
                  onClick={onOpenBiometricEnroll}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-medium transition cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Enroll Biometrics</span>
                </button>
              )
            )}

            {/* User Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-stone-100 transition border border-transparent hover:border-stone-200 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-800 font-bold flex items-center justify-center text-xs border border-orange-300">
                    {user.full_name.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-xs">
                    <p className="font-semibold text-stone-800 line-clamp-1">{user.full_name}</p>
                    <p className="text-stone-500 text-[10px] uppercase font-mono">{user.student_id}</p>
                  </div>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs font-bold text-stone-900">{user.full_name}</p>
                      <p className="text-[11px] text-stone-500 font-mono">{user.student_id}</p>
                      <p className="text-[11px] text-stone-500">{user.department}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-stone-100 text-stone-700">
                        {user.role}
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenBiometricEnroll();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                      >
                        <Fingerprint className="w-4 h-4 text-orange-600" />
                        <span>Manage Device Biometrics</span>
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenRecovery();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                      >
                        <KeyRound className="w-4 h-4 text-blue-600" />
                        <span>Security & Device Reset</span>
                      </button>
                    </div>

                    <div className="border-t border-stone-100 pt-1">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

