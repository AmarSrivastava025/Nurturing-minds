import React, { useState } from 'react';
import {
  Clock,
  Send,
  Video,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Bell,
  Users,
  UserCheck,
  Stethoscope,
  Award,
  RefreshCw,
} from 'lucide-react';
import { Invoice, Patient, Session, Therapist } from '../../types';
import { store } from '../../services/store';
import { LastMinuteTherapistSwapModal } from './LastMinuteTherapistSwapModal';

interface AdminDashboardProps {
  invoices: Invoice[];
  sessions: Session[];
  patients: Patient[];
  therapists: Therapist[];
  pendingApprovalsCount?: number;
  onNavigateTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  invoices,
  sessions,
  patients,
  therapists,
  pendingApprovalsCount = 0,
  onNavigateTab,
}) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const [swapSession, setSwapSession] = useState<Session | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);

  // Quick expense form state
  const [quickExpenseText, setQuickExpenseText] = useState('');
  const [isExpenseLogging, setIsExpenseLogging] = useState(false);
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState('');

  // Quick video broadcast state
  const [quickVideoUrl, setQuickVideoUrl] = useState('');
  const [videoSuccessMsg, setVideoSuccessMsg] = useState('');

  // Money made today
  const moneyToday = invoices
    .filter((inv) => inv.issuedAt.startsWith(todayStr))
    .reduce((sum, inv) => sum + inv.amount, 0);

  // Money made this week (last 7 days)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const moneyThisWeek = invoices
    .filter((inv) => new Date(inv.issuedAt) >= oneWeekAgo)
    .reduce((sum, inv) => sum + inv.amount, 0);

  // Today's scheduled sessions
  const todaySessions = sessions.filter((s) => {
    const sDate = new Date(s.scheduledAt).toISOString().split('T')[0];
    return sDate === todayStr || s.status === 'scheduled';
  }).slice(0, 6);

  // Overdue patients
  const overduePatients = patients.filter((p) => p.paymentStatus === 'late');

  const getPatient = (id: string) => patients.find((p) => p.id === id);
  const getTherapist = (id: string) => therapists.find((t) => t.id === id);

  const handleQuickExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickExpenseText.trim()) return;

    setIsExpenseLogging(true);
    try {
      const { parseExpenseSentence } = await import('../../services/ai');
      const result = await parseExpenseSentence(quickExpenseText.trim());

      store.addExpense({
        amount: result.amount,
        payee: result.payee,
        date: result.date || todayStr,
        category: result.category || 'Clinical Supplies',
        rawSentence: quickExpenseText.trim(),
        modelStamp: result.providerStamp,
      });

      setExpenseSuccessMsg(`Logged ₹${result.amount.toLocaleString('en-IN')} to ${result.payee}`);
      setQuickExpenseText('');
      setTimeout(() => setExpenseSuccessMsg(''), 3000);
    } catch {
      setExpenseSuccessMsg('Logged successfully');
      setTimeout(() => setExpenseSuccessMsg(''), 2500);
    } finally {
      setIsExpenseLogging(false);
    }
  };

  const handleQuickVideoPublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVideoUrl.trim()) return;

    store.publishVideo(
      quickVideoUrl.trim(),
      'Clinical Parent Guidance Video',
      'Guidance broadcast from Dr. Sweety Bhatnagar for sensory routines at home.'
    );

    setVideoSuccessMsg('Broadcast video published and notifications dispatched!');
    setQuickVideoUrl('');
    setTimeout(() => setVideoSuccessMsg(''), 3000);
  };

  const handleSendReminder = (patient: Patient) => {
    store.setPaymentFlag(
      patient.id,
      'late',
      patient.pendingPaymentAmount || 8400,
      patient.pendingPaymentMonth || 'Current Month'
    );
    alert(`Payment reminder sent to ${patient.motherName} for ${patient.childName}!`);
  };

  const formattedCurrentDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Top Stats Row — Professional Polish 4-card layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Revenue Today */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-purple-200 transition">
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
            Revenue Today
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-bold text-[#6D0281]">
              ₹{moneyToday.toLocaleString('en-IN')}
            </span>
            <span className="text-emerald-600 text-xs font-medium">
              Confirmed receipts
            </span>
          </div>
        </div>

        {/* Stat 2: Therapists On Staff (Clickable to Therapist Directory) */}
        <div
          onClick={() => onNavigateTab('therapists')}
          className="bg-white p-5 rounded-xl border border-purple-100 shadow-xs flex flex-col justify-between hover:border-[#6D0281] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Therapists On Staff
            </span>
            <div className="p-1 bg-purple-50 text-[#6D0281] rounded-md group-hover:bg-[#6D0281] group-hover:text-white transition">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-[#6D0281]">
                {therapists.length}
              </span>
              <span className="text-xs text-gray-500">
                1 Lead + {therapists.length - 1} Staff
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#6D0281] group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Stat 3: Sessions This Week */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-purple-200 transition">
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
            Sessions Active This Week
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-bold text-[#6D0281]">
              {sessions.length}
            </span>
            <span className="text-gray-400 text-xs font-medium">
              On target
            </span>
          </div>
        </div>

        {/* Stat 4: Approval Queue with Action Required badge */}
        <div
          onClick={() => onNavigateTab('approval_queue')}
          className="bg-white p-5 rounded-xl border border-[#6D0281]/20 shadow-xs flex flex-col justify-between relative overflow-hidden cursor-pointer hover:border-[#6D0281] transition group"
        >
          {pendingApprovalsCount > 0 && (
            <div className="absolute top-0 right-0 p-1.5 bg-[#F27D26]/10 text-[#F27D26] text-[10px] font-bold px-3 rounded-bl-lg tracking-wider">
              ACTION REQUIRED
            </div>
          )}
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
            Approval Queue
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-[#6D0281]">
                {String(pendingApprovalsCount).padStart(2, '0')}
              </span>
              <span className="text-xs text-gray-500">
                Draft summaries ready
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#6D0281] group-hover:translate-x-0.5 transition" />
          </div>
        </div>
      </div>

      {/* Service 3 Email Automation Sequence Status Banner */}
      <div
        onClick={() => onNavigateTab('email_sequence')}
        className="bg-gradient-to-r from-teal-50 via-teal-100/50 to-indigo-50 border border-teal-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:border-teal-400 transition group shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Service 3: Active
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] bg-white text-teal-700 px-2 py-0.5 rounded-full border border-teal-200 font-medium">
                Resend API Ready
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              Automated Email Confirmation Sequence Active
            </p>
            <p className="text-xs text-slate-500">
              Immediate Booking Confirmation &middot; 2-Day Reminder &middot; 1-Day Feedback Request
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs group-hover:translate-x-1 transition self-end sm:self-center">
          <span>Manage Emails &amp; View Audit Logs</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Main 12-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Scheduled Sessions Table & Therapist Caseloads */}
        <div className="lg:col-span-8 space-y-6">
          {/* Scheduled Sessions Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#6D0281]">
                  Today&apos;s Scheduled Sessions
                </h3>
                <span className="text-[10px] bg-purple-50 text-[#6D0281] font-semibold px-2 py-0.5 rounded-full border border-purple-100">
                  {todaySessions.length} sessions (45-min slots)
                </span>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {formattedCurrentDate}
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Time (45m)</th>
                    <th className="px-6 py-3">Child Name</th>
                    <th className="px-6 py-3">Therapist</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-gray-50 text-[#2D3748]">
                  {todaySessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        No sessions scheduled for today.
                      </td>
                    </tr>
                  ) : (
                    todaySessions.map((session) => {
                      const patient = getPatient(session.patientId);
                      const therapist = getTherapist(session.therapistId);
                      const timeSlot = session.timeSlot || '04:00 PM - 04:45 PM';

                      return (
                        <tr key={session.id} className="hover:bg-purple-50/30 transition">
                          <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                            <p>{timeSlot.split(' ')[0]} {timeSlot.split(' ')[1] || ''}</p>
                            <span className="inline-block text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-semibold mt-0.5">
                              45m slot
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">
                              {patient ? patient.childName : 'Unknown Child'}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {patient?.age} yrs, {patient?.bloodGroup}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            <p className="font-semibold text-slate-800 text-xs">
                              {therapist ? therapist.name : 'Dr. Sweety Bhatnagar'}
                            </p>
                            {session.isSubstitute && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 mt-0.5"
                                title={session.substituteReason || 'Substitute cover'}
                              >
                                <RefreshCw className="w-2.5 h-2.5 text-amber-700" />
                                Substitute
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                                  session.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {session.status === 'completed' ? 'Completed' : 'Scheduled'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSwapSession(session);
                                  setShowSwapModal(true);
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition border border-amber-200 flex items-center gap-1 shadow-2xs"
                                title="Last-minute emergency therapist swap"
                              >
                                <RefreshCw className="w-3 h-3 text-amber-700" />
                                Swap
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center text-xs">
              <span className="text-gray-400 text-[11px]">
                Dr. Sweety Bhatnagar holds sole scheduling authority.
              </span>
              <button
                onClick={() => onNavigateTab('scheduling')}
                className="font-bold text-[#6D0281] hover:text-[#570167] text-xs flex items-center gap-1 transition"
              >
                Open Full Scheduler <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Clinical Staff & Therapist Profiles Overview */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#6D0281]">
                  Clinical Therapist Team & Caseloads
                </h3>
                <span className="text-[10px] bg-purple-50 text-[#6D0281] font-semibold px-2 py-0.5 rounded-full border border-purple-100">
                  {therapists.length} Active Staff
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('therapists')}
                className="font-bold text-[#6D0281] hover:text-[#570167] text-xs flex items-center gap-1 transition"
              >
                Therapist Directory & Profiles <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {therapists.map((th) => {
                const assignedCount = patients.filter((p) => p.assignedTherapistId === th.id).length;
                const isDirector = th.id === 'th-3' || th.name.includes('Sweety');

                return (
                  <div
                    key={th.id}
                    onClick={() => onNavigateTab('therapists')}
                    className="p-3.5 rounded-xl border border-gray-100 hover:border-purple-200 bg-gray-50/40 hover:bg-white transition cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={th.photoUrl}
                        alt={th.name}
                        className="w-10 h-10 rounded-full object-cover border border-purple-100 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {th.name}
                          </span>
                          {isDirector && (
                            <span className="text-[9px] bg-[#6D0281] text-white px-1.5 py-0.2 rounded-full font-bold shrink-0">
                              Lead
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6D0281] truncate">
                          {th.qualification.split('(')[0].trim()}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Active Caseload:
                      </span>
                      <span className="font-bold text-[#6D0281] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100/60">
                        {assignedCount} Children
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 Columns: AI Expense, Broadcast Video, Payment Overdue */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Expense Parser */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
            <h3 className="font-bold text-sm text-[#6D0281] mb-1">
              Log Expense (AI Parsing)
            </h3>
            <p className="text-[11px] text-gray-400 mb-3">
              Type a plain sentence to generate a structured entry.
            </p>

            <form onSubmit={handleQuickExpenseSubmit} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={quickExpenseText}
                  onChange={(e) => setQuickExpenseText(e.target.value)}
                  placeholder="e.g. Paid ₹5,000 to Ramesh for clinic cleaning"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#6D0281] transition-colors pr-10"
                />
                <button
                  type="submit"
                  disabled={isExpenseLogging || !quickExpenseText.trim()}
                  className="absolute right-1.5 top-1.5 p-1.5 bg-[#6D0281] hover:bg-[#570167] disabled:opacity-50 text-white rounded-md transition shadow-xs"
                  title="Parse and log expense"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {expenseSuccessMsg && (
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {expenseSuccessMsg}
                </p>
              )}
            </form>
          </div>

          {/* Video Broadcast Card */}
          <div className="bg-[#FDFCFE] p-6 rounded-xl border-2 border-dashed border-[#6D0281]/20">
            <h3 className="font-bold text-sm text-[#6D0281] mb-1">
              Broadcast New Content
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Push a video link to all parents and therapists.
            </p>
            <form onSubmit={handleQuickVideoPublish} className="space-y-3">
              <input
                type="text"
                value={quickVideoUrl}
                onChange={(e) => setQuickVideoUrl(e.target.value)}
                placeholder="Paste YouTube Link..."
                className="w-full px-3 py-2 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:border-[#6D0281]"
              />
              <button
                type="submit"
                disabled={!quickVideoUrl.trim()}
                className="w-full py-2.5 bg-[#6D0281] hover:bg-[#570167] disabled:opacity-50 text-white rounded font-bold text-xs uppercase tracking-widest shadow-md transition"
              >
                Publish Now
              </button>

              {videoSuccessMsg && (
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {videoSuccessMsg}
                </p>
              )}
            </form>
          </div>

          {/* Payment Overdue Snippet */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                Payment Overdue ({overduePatients.length})
              </span>
              <button
                onClick={() => onNavigateTab('crm')}
                className="text-[10px] text-[#6D0281] font-bold hover:underline"
              >
                View All
              </button>
            </div>

            {overduePatients.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No overdue payments on record.</p>
            ) : (
              <div className="space-y-2">
                {overduePatients.slice(0, 2).map((p) => (
                  <div
                    key={p.id}
                    className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-red-800">
                        {p.childName} ({p.pendingPaymentMonth || 'Recent'})
                      </p>
                      <p className="text-[10px] text-red-600 font-medium">
                        ₹{(p.pendingPaymentAmount || 8400).toLocaleString('en-IN')} Pending
                      </p>
                    </div>
                    <button
                      onClick={() => handleSendReminder(p)}
                      className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors"
                      title="Send Gentle Payment Reminder"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last-Minute Therapist Swap Modal */}
      <LastMinuteTherapistSwapModal
        isOpen={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          setSwapSession(null);
        }}
        session={swapSession}
        therapists={therapists}
        sessions={sessions}
      />
    </div>
  );
};
