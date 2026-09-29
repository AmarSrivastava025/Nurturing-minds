import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  Sparkles,
  IndianRupee,
  FileSpreadsheet,
  Receipt,
  BookOpen,
  User,
  Video,
  KeyRound,
  Bell,
  Menu,
  X,
  Plus,
  Key,
  ChevronDown,
  LogOut,
  Mail,
  MessageSquare,
  Heart,
} from 'lucide-react';
import { store } from './services/store';
import { LoginPage } from './components/Auth/LoginPage';
import { NotificationModal } from './components/NotificationModal';
import { InviteRegistration } from './components/Auth/InviteRegistration';
import { PWAInstallButton } from './components/PWAInstallButton';
import { getOpenRouterKey, setOpenRouterKey } from './services/ai';
import { Role } from './types';

// Admin Components
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { PatientCRM } from './components/Admin/PatientCRM';
import { TherapistManager } from './components/Admin/TherapistManager';
import { SchedulingManager } from './components/Admin/SchedulingManager';
import { ProgressApprovalQueue } from './components/Admin/ProgressApprovalQueue';
import { ExpenseLogger } from './components/Admin/ExpenseLogger';
import { MonthlyPnL } from './components/Admin/MonthlyPnL';
import { InvoiceManager } from './components/Admin/InvoiceManager';
import { ProgramManager } from './components/Admin/ProgramManager';
import { DoctorProfileManager } from './components/Admin/DoctorProfileManager';
import { VideoPublisher } from './components/Admin/VideoPublisher';
import { InviteManager } from './components/Admin/InviteManager';
import { MemberAccountManager } from './components/Admin/MemberAccountManager';
import { EmailAutomationManager } from './components/Admin/EmailAutomationManager';
import { WhatsAppAutomationManager } from './components/Admin/WhatsAppAutomationManager';

// Member & Therapist Components
import { MemberView } from './components/Member/MemberView';
import { TherapistView } from './components/Therapist/TherapistView';

export function App() {
  const [state, setState] = useState(store.getState());
  const [adminTab, setAdminTab] = useState('dashboard');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isInviteRegOpen, setIsInviteRegOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(getOpenRouterKey());
  const [saveKeySuccess, setSaveKeySuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  const {
    currentUser,
    patients,
    therapists,
    sessions,
    progressSummaries,
    invoices,
    expenses,
    programs,
    publishedVideo,
    doctorProfile,
    notifications,
    invites,
  } = state;

  // Unauthenticated / Logged-out view: Render professional login page
  if (!currentUser) {
    return (
      <>
        <LoginPage
          doctorProfile={doctorProfile}
          therapists={therapists}
          patients={patients}
          invites={invites}
          onLogin={(user) => store.login(user)}
          onOpenInviteRegistration={() => setIsInviteRegOpen(true)}
        />
        <InviteRegistration
          isOpen={isInviteRegOpen}
          onClose={() => setIsInviteRegOpen(false)}
          invites={invites}
          patients={patients}
        />
      </>
    );
  }

  // Unread notifications for current user
  const unreadCount = notifications.filter((n) => {
    if (n.read) return false;
    if (n.userId === 'all' || n.targetRole === 'all') return true;
    if (n.userId === currentUser.id) return true;
    if (n.targetRole === currentUser.role) return true;
    return false;
  }).length;

  // Pending approval drafts
  const pendingApprovalsCount = progressSummaries.filter((p) => !p.approved).length;

  // Active child for member view (strictly isolated to authenticated parent - NEVER fallback to another child)
  const currentPatient =
    patients.find((p) => p.id === currentUser.patientId) ||
    patients.find((p) => p.parentUserId === currentUser.id) ||
    (currentUser.email ? patients.find((p) => p.parentEmail?.toLowerCase() === currentUser.email?.toLowerCase()) : undefined);

  // Active therapist for therapist view (strictly isolated to authenticated therapist)
  const currentTherapist =
    therapists.find((t) => t.id === currentUser.therapistId) ||
    therapists.find((t) => t.userId === currentUser.id) ||
    (currentUser.email ? therapists.find((t) => t.email?.toLowerCase() === currentUser.email?.toLowerCase()) : undefined);

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crm', label: 'Patient CRM', icon: Users },
    {
      id: 'therapists',
      label: 'Therapists & Staff',
      icon: UserCheck,
      badge: String(therapists.length),
    },
    { id: 'scheduling', label: 'Scheduling', icon: Calendar },
    {
      id: 'email_sequence',
      label: 'Email Automation',
      icon: Mail,
      badge: state.emailLogs && state.emailLogs.length > 0 ? String(state.emailLogs.length) : 'Active',
    },
    {
      id: 'whatsapp_alerts',
      label: 'WhatsApp & SMS',
      icon: MessageSquare,
      badge: state.messageLogs && state.messageLogs.length > 0 ? String(state.messageLogs.length) : 'Active',
    },
    {
      id: 'approval_queue',
      label: 'Approval Queue',
      icon: Sparkles,
      badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined,
    },
    { id: 'expenses', label: 'Expense Logger', icon: IndianRupee },
    { id: 'pnl', label: 'Financial Reports', icon: FileSpreadsheet },
    { id: 'invoicing', label: 'PDF Invoices', icon: Receipt },
    { id: 'programs', label: 'Program Manager', icon: BookOpen },
    { id: 'profile', label: 'Director Profile', icon: User },
    {
      id: 'accounts',
      label: 'Member & Staff Passwords',
      icon: KeyRound,
      badge: String(patients.length),
    },
    { id: 'video', label: 'Broadcast Video', icon: Video },
    { id: 'invites', label: 'Invites & Cutover', icon: KeyRound },
  ];

  const handleSwitchRole = (role: Role, patientId?: string, therapistId?: string) => {
    store.switchRole(role, patientId, therapistId);
    setShowRoleMenu(false);
  };

  const handleSaveKey = () => {
    setOpenRouterKey(tempApiKey);
    setSaveKeySuccess(true);
    setTimeout(() => {
      setSaveKeySuccess(false);
      setShowKeyModal(false);
    }, 1200);
  };

  const getPageTitle = () => {
    if (currentUser.role === 'admin') {
      const current = adminNavItems.find((i) => i.id === adminTab);
      return current ? (current.id === 'dashboard' ? 'Practice Overview' : current.label) : 'Admin Portal';
    }
    if (currentUser.role === 'parent') {
      return `Child Development Portal • ${currentPatient?.childName || 'Child'}`;
    }
    return `Therapist Portal • ${currentTherapist?.name || 'Staff'}`;
  };

  return (
    <div className="flex h-screen w-full bg-[#FDFCFE] text-[#2D3748] font-sans overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Navigation (Professional Polish Theme) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#6D0281] flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between border-b border-purple-800/30">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full bg-white p-0.5 shadow-sm shrink-0 border border-white/20 overflow-hidden flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="Nurturing Minds Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <span className="text-white font-bold text-xs tracking-tight uppercase block">
                NURTURING MINDS
              </span>
              <span className="text-purple-200 text-[10px] tracking-wider uppercase">
                THERAPY CENTER
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-purple-200 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="mt-4 px-4 flex-1 space-y-1 overflow-y-auto">
          {currentUser.role === 'admin' ? (
            adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = adminTab === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setAdminTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`flex items-center px-4 py-3 rounded-lg cursor-pointer transition ${
                    isActive
                      ? 'bg-white/10 text-white font-medium shadow-xs'
                      : 'text-purple-100 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3 shrink-0" />
                  <span className="text-sm">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.id === 'email_sequence' || item.id === 'whatsapp_alerts'
                          ? 'bg-emerald-400 text-slate-900 shadow-2xs font-extrabold'
                          : 'bg-[#F27D26] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })
          ) : currentUser.role === 'parent' ? (
            <div className="space-y-1">
              <div className="px-4 py-3 bg-white/10 text-white rounded-lg flex items-center">
                <Users className="w-4 h-4 mr-3" />
                <span className="text-sm font-medium">Child Portal</span>
              </div>
              <p className="text-[11px] text-purple-200 px-4 pt-4 leading-relaxed">
                Parents observe live in-center therapy. Records, approved milestones, and receipts are managed here.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-4 py-3 bg-white/10 text-white rounded-lg flex items-center">
                <Calendar className="w-4 h-4 mr-3" />
                <span className="text-sm font-medium">Therapist Portal</span>
              </div>
              <p className="text-[11px] text-purple-200 px-4 pt-4 leading-relaxed">
                Log quick 1-3 word notes immediately after in-center sessions to feed into Dr. Bhatnagar&apos;s review queue.
              </p>
            </div>
          )}
        </nav>

        {/* User Card at bottom with prominent Log Out button */}
        <div className="p-4 border-t border-purple-800/50 space-y-2.5">
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-full bg-purple-200 border border-white/20 overflow-hidden shrink-0">
              <img
                src={
                  currentUser.role === 'admin'
                    ? doctorProfile.photoUrl
                    : currentUser.role === 'therapist'
                    ? currentTherapist?.photoUrl
                    : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
                }
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-xs min-w-0 flex-1">
              <p className="text-white font-medium truncate">{currentUser.name}</p>
              <p className="text-purple-300 text-[10px] capitalize">
                {currentUser.role === 'admin'
                  ? 'Dr. Sweety B. (Admin)'
                  : currentUser.role === 'parent'
                  ? 'Member Role'
                  : 'Therapist Role'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="sidebar-logout-btn"
            onClick={() => store.logout()}
            className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-rose-600/90 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-2xs cursor-pointer border border-white/10 group"
            title="Log out of this account"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-300 group-hover:text-white transition" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header (Professional Polish: h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sm:px-8) */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-xl font-bold text-[#6D0281] truncate">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Firestore DB Indicator */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                state.isCloudSynced
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : state.cloudError
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}
              title="Cloud Database: Google Firestore (asia-south1) • Real-time server-side synchronization"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  state.isCloudSynced
                    ? 'bg-emerald-500 animate-pulse'
                    : state.cloudError
                    ? 'bg-amber-500'
                    : 'bg-purple-500'
                }`}
              />
              <span>
                {state.isCloudSynced ? 'Firestore Live (asia-south1)' : 'Connecting Firestore...'}
              </span>
            </div>

            {/* Quick Email Automation Button for Admin */}
            {currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => setAdminTab('email_sequence')}
                  className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                    adminTab === 'email_sequence'
                      ? 'bg-[#6D0281] text-white border-[#6D0281]'
                      : 'bg-purple-50 text-[#6D0281] border-purple-200 hover:bg-purple-100'
                  }`}
                  title="Open Email Automation Manager"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Automation</span>
                </button>

                <button
                  onClick={() => setAdminTab('whatsapp_alerts')}
                  className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                    adminTab === 'whatsapp_alerts'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title="Open WhatsApp & SMS Automation Center"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp & SMS</span>
                </button>
              </>
            )}

            {/* Install PWA Prompt */}
            <PWAInstallButton />

            {/* Notification Bell with Dot Indicator */}
            <div className="relative cursor-pointer" onClick={() => setIsNotificationsOpen(true)}>
              {unreadCount > 0 && (
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full absolute -top-0.5 -right-0.5 border-2 border-white" />
              )}
              <Bell className="w-5 h-5 text-gray-400 hover:text-[#6D0281] transition cursor-pointer" />
            </div>

            {/* OpenRouter Config Key Icon - Admin Only */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setShowKeyModal(true)}
                className="p-1 text-gray-400 hover:text-[#6D0281] transition cursor-pointer"
                title="OpenRouter AI Configuration"
              >
                <Key className="w-4 h-4" />
              </button>
            )}

            {/* User Badge - Role switcher only accessible if logged in as Admin */}
            <div className="relative">
              {currentUser.role === 'admin' ? (
                <>
                  <button
                    onClick={() => setShowRoleMenu(!showRoleMenu)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 text-[#6D0281] rounded-lg text-xs font-semibold hover:bg-purple-100 transition border border-purple-100 cursor-pointer"
                  >
                    <span>Dr. Sweety B. (Director)</span>
                    <ChevronDown className="w-3 h-3 text-[#6D0281]" />
                  </button>

                  {showRoleMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 text-xs">
                      <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] text-gray-400 uppercase font-bold">
                        Admin Preview Views
                      </div>
                      <button
                        onClick={() => handleSwitchRole('admin')}
                        className="w-full text-left px-3 py-2 flex items-center justify-between bg-[#6D0281] text-white font-bold cursor-pointer"
                      >
                        <span>Dr. Sweety Bhatnagar</span>
                        <span className="text-[10px] opacity-75">Admin</span>
                      </button>
                      <button
                        onClick={() => handleSwitchRole('parent', 'pat-1')}
                        className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 cursor-pointer text-slate-700"
                      >
                        <span>Preview Parent Portal (Aarav)</span>
                        <span className="text-[10px] text-purple-600 font-semibold">Preview</span>
                      </button>
                      <div className="border-t border-gray-100 pt-1 mt-1 px-2 space-y-1">
                        <button
                          onClick={() => {
                            setShowRoleMenu(false);
                            store.logout();
                          }}
                          className="w-full text-center py-1.5 text-rose-600 font-bold hover:bg-rose-50 rounded flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Log Out of Practice</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 text-[#6D0281] rounded-lg text-xs font-semibold border border-purple-100">
                  <span className="capitalize">{currentUser.name}</span>
                </div>
              )}
            </div>

            {/* Direct Header Log Out Button */}
            <button
              type="button"
              id="header-logout-btn"
              onClick={() => store.logout()}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200 cursor-pointer"
              title="Log out of practice portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#FDFCFE]">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentUser.role === 'admin' && (
              <>
                {adminTab === 'dashboard' && (
                  <AdminDashboard
                    invoices={invoices}
                    sessions={sessions}
                    patients={patients}
                    therapists={therapists}
                    pendingApprovalsCount={pendingApprovalsCount}
                    onNavigateTab={(tab) => setAdminTab(tab)}
                  />
                )}
                {adminTab === 'crm' && (
                  <PatientCRM patients={patients} therapists={therapists} />
                )}
                {adminTab === 'therapists' && (
                  <TherapistManager
                    therapists={therapists}
                    patients={patients}
                    sessions={sessions}
                    progressSummaries={progressSummaries}
                    onSwitchToTherapist={(id) => handleSwitchRole('therapist', undefined, id)}
                    onNavigateToPatientCRM={() => setAdminTab('crm')}
                  />
                )}
                {adminTab === 'scheduling' && (
                  <SchedulingManager
                    sessions={sessions}
                    patients={patients}
                    therapists={therapists}
                  />
                )}
                {adminTab === 'approval_queue' && (
                  <ProgressApprovalQueue
                    progressSummaries={progressSummaries}
                    patients={patients}
                    sessions={sessions}
                  />
                )}
                {adminTab === 'expenses' && <ExpenseLogger expenses={expenses} />}
                {adminTab === 'pnl' && (
                  <MonthlyPnL invoices={invoices} expenses={expenses} />
                )}
                {adminTab === 'invoicing' && (
                  <InvoiceManager
                    invoices={invoices}
                    patients={patients}
                    therapists={therapists}
                  />
                )}
                {adminTab === 'programs' && <ProgramManager programs={programs} />}
                {adminTab === 'profile' && (
                  <DoctorProfileManager profile={doctorProfile} />
                )}
                {adminTab === 'accounts' && (
                  <MemberAccountManager
                    patients={patients}
                    therapists={therapists}
                    doctorProfile={doctorProfile}
                  />
                )}
                {adminTab === 'video' && (
                  <VideoPublisher publishedVideo={publishedVideo} />
                )}
                {adminTab === 'email_sequence' && (
                  <EmailAutomationManager
                    emailLogs={state.emailLogs || []}
                    sessions={sessions}
                    patients={patients}
                    therapists={therapists}
                  />
                )}
                {adminTab === 'whatsapp_alerts' && (
                  <WhatsAppAutomationManager
                    messageLogs={state.messageLogs || []}
                    sessions={sessions}
                    patients={patients}
                    therapists={therapists}
                  />
                )}
                {adminTab === 'invites' && (
                  <InviteManager invites={invites} patients={patients} />
                )}
              </>
            )}

            {currentUser.role === 'parent' && (
              currentPatient ? (
                <MemberView
                  patient={currentPatient}
                  therapists={therapists.filter((t) => t.id === currentPatient.assignedTherapistId)}
                  sessions={sessions.filter((s) => s.patientId === currentPatient.id)}
                  progressSummaries={progressSummaries.filter(
                    (p) => p.patientId === currentPatient.id && p.approved
                  )}
                  invoices={invoices.filter((i) => i.patientId === currentPatient.id)}
                  programs={programs}
                  publishedVideo={publishedVideo}
                  doctorProfile={doctorProfile}
                />
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-lg mx-auto space-y-4 my-8 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 text-[#6D0281] mx-auto flex items-center justify-center">
                    <Heart className="w-7 h-7 text-[#6D0281]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Patient Profile Linking Required</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Your family portal account ({currentUser.name}) is authenticated, but is not yet mapped to an active patient record in the system.
                    </p>
                  </div>
                  <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 text-xs text-purple-900 text-left space-y-1">
                    <p className="font-semibold text-[#6D0281]">How to resolve:</p>
                    <p className="text-[11px] text-purple-800">
                      Please contact Dr. Sweety Bhatnagar at reception or call <strong>+91 97893 05029</strong> so the clinic administrator can link your family record or issue an updated invite code.
                    </p>
                  </div>
                  <button
                    onClick={() => store.logout()}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>
              )
            )}

            {currentUser.role === 'therapist' && (
              currentTherapist ? (
                <TherapistView
                  therapist={currentTherapist}
                  sessions={sessions.filter((s) => s.therapistId === currentTherapist.id)}
                  patients={patients.filter((p) => p.assignedTherapistId === currentTherapist.id)}
                  publishedVideo={publishedVideo}
                  doctorProfile={doctorProfile}
                />
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-lg mx-auto space-y-4 my-8 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center">
                    <UserCheck className="w-7 h-7 text-blue-700" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Clinical Profile Not Found</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No therapist staff profile is matched to this user account ({currentUser.email || currentUser.name}). Please contact Dr. Sweety Bhatnagar to link your staff record.
                  </p>
                  <button
                    onClick={() => store.logout()}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>
              )
            )}
          </div>
        </main>
      </div>

      {/* Notifications Inbox Modal */}
      <NotificationModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        currentUserRole={currentUser.role}
        currentUserId={currentUser.id}
      />

      {/* Invite Registration Modal */}
      <InviteRegistration
        isOpen={isInviteRegOpen}
        onClose={() => setIsInviteRegOpen(false)}
        invites={invites}
        patients={patients}
      />

      {/* OpenRouter AI Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-100 text-[#6D0281]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">OpenRouter AI Configuration</h3>
                <p className="text-xs text-slate-500">Free-tier models only (:free) • No vendor SDKs</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <p className="font-semibold text-slate-800">Non-Negotiable Architecture Rules:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Zero Google Gemini calls (excluded outright).</li>
                <li>Zero vendor SDKs; uses standard browser fetch.</li>
                <li>Free tier models capped at 3 models maximum.</li>
                <li>Every parsed expense and draft stamps its exact model.</li>
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
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Saved securely in browser local storage. Built-in deterministic fallback operates automatically if no key is entered.
              </p>
            </div>

            {saveKeySuccess && (
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
    </div>
  );
}

export default App;
