import React, { useState } from 'react';
import { Bell, Key, Users, Sparkles, ChevronDown } from 'lucide-react';
import { Role, UserSession } from '../types';
import { store } from '../services/store';
import { PWAInstallButton } from './PWAInstallButton';
import { getOpenRouterKey, setOpenRouterKey } from '../services/ai';

interface NavbarProps {
  currentUser: UserSession;
  unreadNotificationCount: number;
  onOpenNotifications: () => void;
  onOpenInviteRegistration: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  unreadNotificationCount,
  onOpenNotifications,
  onOpenInviteRegistration,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(getOpenRouterKey());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSwitchRole = (role: Role, patientId?: string, therapistId?: string) => {
    store.switchRole(role, patientId, therapistId);
    setShowRoleMenu(false);
  };

  const handleSaveKey = () => {
    setOpenRouterKey(tempApiKey);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowKeyModal(false);
    }, 1200);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-purple-100/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo & Clinic Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-full border-2 border-[#6D0281] p-0.5 shadow-xs overflow-hidden bg-white">
              <img
                src="/logo.svg"
                alt="Nurturing Minds Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#6D0281] tracking-wide text-sm sm:text-base truncate">
                  NURTURING MINDS
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                  Pediatric OT
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate hidden sm:block">
                Dr. Sweety Bhatnagar • In-Center Live Parent Partnership
              </p>
            </div>
          </div>

          {/* Right Controls: Role Switcher, PWA, Notifications, API Key */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Install PWA Prompt */}
            <PWAInstallButton />

            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                id="role-switcher-btn"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-xs font-semibold text-[#6D0281] transition"
                title="Switch test persona"
              >
                <Users className="w-3.5 h-3.5 text-[#6D0281]" />
                <span className="capitalize hidden md:inline">
                  {currentUser.role === 'admin' ? 'Dr. Bhatnagar (Admin)' : currentUser.role === 'parent' ? 'Member (Parent)' : 'Therapist'}
                </span>
                <span className="capitalize md:hidden">
                  {currentUser.role}
                </span>
                <ChevronDown className="w-3 h-3 text-purple-500" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-purple-100 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Role View (Phase 1 Testing)
                    </p>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Logged in as: <strong className="text-[#6D0281]">{currentUser.name}</strong>
                    </p>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => handleSwitchRole('admin')}
                      className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                        currentUser.role === 'admin' ? 'bg-[#6D0281] text-white font-semibold' : 'text-slate-700 hover:bg-purple-50'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">Dr. Sweety Bhatnagar</p>
                        <p className={`text-[10px] ${currentUser.role === 'admin' ? 'text-purple-200' : 'text-slate-400'}`}>
                          Sole Admin & Clinical Director
                        </p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20">Admin</span>
                    </button>

                    <button
                      onClick={() => handleSwitchRole('parent', 'pat-1')}
                      className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                        currentUser.role === 'parent' ? 'bg-[#6D0281] text-white font-semibold' : 'text-slate-700 hover:bg-purple-50'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">Priya Sharma</p>
                        <p className={`text-[10px] ${currentUser.role === 'parent' ? 'text-purple-200' : 'text-slate-400'}`}>
                          Parent of Aarav Sharma (5y, B+)
                        </p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20">Member</span>
                    </button>

                    <button
                      onClick={() => handleSwitchRole('therapist', 'th-1')}
                      className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                        currentUser.role === 'therapist' ? 'bg-[#6D0281] text-white font-semibold' : 'text-slate-700 hover:bg-purple-50'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">Ritu Verma</p>
                        <p className={`text-[10px] ${currentUser.role === 'therapist' ? 'text-purple-200' : 'text-slate-400'}`}>
                          Senior Pediatric OT Staff
                        </p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20">Therapist</span>
                    </button>
                  </div>

                  <div className="pt-2 px-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onOpenInviteRegistration();
                      }}
                      className="w-full text-center py-2 px-3 text-xs font-semibold text-[#6D0281] bg-purple-50 hover:bg-purple-100 rounded-xl transition"
                    >
                      Open Invite Registration Flow
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* OpenRouter API Key configuration modal shortcut */}
            <button
              id="openrouter-settings-btn"
              onClick={() => setShowKeyModal(true)}
              className="p-2 text-slate-500 hover:text-[#6D0281] hover:bg-purple-50 rounded-xl transition relative"
              title="OpenRouter AI Key Settings"
            >
              <Key className="w-4 h-4" />
            </button>

            {/* Notification Bell Inbox */}
            <button
              id="navbar-notification-btn"
              onClick={onOpenNotifications}
              className="p-2 text-slate-600 hover:text-[#6D0281] hover:bg-purple-50 rounded-xl transition relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-orange-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* OpenRouter Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-purple-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-100 text-[#6D0281]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">OpenRouter AI Configuration</h3>
                <p className="text-xs text-slate-500">Free-tier models only (:free) • No vendor SDKs</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p>
                <strong>Non-Negotiable Architecture Rules:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Zero Google Gemini calls (excluded outright).</li>
                <li>Zero vendor SDKs; uses standard browser <code className="text-[#6D0281]">fetch</code>.</li>
                <li>Free tier models capped at 3 models maximum.</li>
                <li>Every parsed expense and draft stamps its exact model.</li>
                <li>A built-in deterministic local parser operates automatically if an API key is not provided.</li>
              </ul>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                OpenRouter API Key (Optional)
              </label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D0281] focus:border-transparent"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Saved securely in browser local storage. Never sent to third parties.
              </p>
            </div>

            {saveSuccess && (
              <p className="mt-2 text-xs font-semibold text-emerald-600">
                Key saved successfully!
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKey}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#6D0281] hover:bg-[#570167] rounded-xl transition shadow-xs"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
