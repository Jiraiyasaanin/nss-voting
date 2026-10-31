import React, { useState } from 'react';
import { AdminDashboard } from './AdminDashboard.js';
import { ElectionManager } from './ElectionManager.js';
import { VoterRegistry } from './VoterRegistry.js';
import { LiveTurnoutMonitor } from './LiveTurnoutMonitor.js';
import { ResultsPublisher } from './ResultsPublisher.js';
import { AuditLogViewer } from './AuditLogViewer.js';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Activity,
  Award,
  ShieldAlert,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'dashboard' | 'elections' | 'voters' | 'turnout' | 'results' | 'audit'>('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'HQ Overview', icon: LayoutDashboard },
    { id: 'elections', label: 'Elections & Candidates', icon: Calendar },
    { id: 'voters', label: 'Voter Registry & CSV', icon: Users },
    { id: 'turnout', label: 'Turnout Monitor', icon: Activity },
    { id: 'results', label: 'Results & Certification', icon: Award },
    { id: 'audit', label: 'Audit Trail', icon: ShieldAlert },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Module Navigation Pills */}
      <div className="bg-white p-1.5 rounded-2xl border border-stone-200/90 shadow-xs flex flex-wrap gap-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id as any)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#0A2558] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-stone-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Module Content */}
      <div className="animate-in fade-in duration-150">
        {activeModule === 'dashboard' && <AdminDashboard onNavigate={(m) => setActiveModule(m)} />}
        {activeModule === 'elections' && <ElectionManager />}
        {activeModule === 'voters' && <VoterRegistry />}
        {activeModule === 'turnout' && <LiveTurnoutMonitor />}
        {activeModule === 'results' && <ResultsPublisher />}
        {activeModule === 'audit' && <AuditLogViewer />}
      </div>

    </div>
  );
};

