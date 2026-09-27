import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  Sparkles,
  Phone,
  MapPin,
  Mail,
  UserCheck,
  ShieldCheck,
  Video,
  BookOpen,
  Receipt,
  Heart,
  AlertCircle,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  Save,
} from 'lucide-react';
import {
  DoctorProfile,
  Invoice,
  Patient,
  Program,
  ProgressSummary,
  PublishedVideo,
  Session,
  Therapist,
} from '../../types';
import { downloadInvoicePDF } from '../../services/pdf';
import { store } from '../../services/store';

interface MemberViewProps {
  patient: Patient;
  therapists: Therapist[];
  sessions: Session[];
  progressSummaries: ProgressSummary[];
  invoices: Invoice[];
  programs: Program[];
  publishedVideo: PublishedVideo | null;
  doctorProfile: DoctorProfile;
}

export const MemberView: React.FC<MemberViewProps> = ({
  patient,
  therapists,
  sessions,
  progressSummaries,
  invoices,
  programs,
  publishedVideo,
  doctorProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'progress' | 'receipts' | 'programs' | 'team' | 'account'>('schedule');

  // Password management state
  const [newPassword, setNewPassword] = useState(patient.parentPassword || 'parent123');
  const [showPassword, setShowPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [passwordSaveSuccess, setPasswordSaveSuccess] = useState(false);

  const assignedTherapist = therapists.find((t) => t.id === patient.assignedTherapistId);

  // Filter child's sessions (read-only)
  const childSessions = sessions
    .filter((s) => s.patientId === patient.id)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // Filter approved progress summaries ONLY!
  // CRITICAL RULE: Never show raw session notes or unapproved drafts to parents
  const approvedSummaries = progressSummaries.filter(
    (p) => p.patientId === patient.id && p.approved
  );

  // Child invoices
  const childInvoices = invoices.filter((i) => i.patientId === patient.id);

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : url;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-[#6D0281] to-[#510160] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold text-purple-100 mb-2">
              <Heart className="w-3.5 h-3.5 fill-current text-pink-300" />
              Live In-Center Parent Partnership Model
            </div>
            <h1 className="text-xl md:text-2xl font-bold">
              Welcome, {patient.motherName} & {patient.fatherName}
            </h1>
            <p className="text-xs md:text-sm text-purple-200 mt-1 max-w-xl">
              Developmental records, schedules, and guidance for <strong>{patient.childName}</strong> ({patient.age} yrs, {patient.bloodGroup}).
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-xs p-3.5 rounded-xl border border-white/20 text-xs">
            <p className="text-purple-200 text-[10px] uppercase font-bold tracking-wider">Assigned Therapist</p>
            <p className="font-bold text-white text-sm mt-0.5">
              {assignedTherapist ? assignedTherapist.name : 'Dr. Sweety Bhatnagar'}
            </p>
            <p className="text-[11px] text-purple-200">{patient.sessionsPerWeek} sessions / week</p>
          </div>
        </div>
      </div>

      {/* Late Payment Notice Banner (if flagged by Dr. Bhatnagar) */}
      {patient.paymentStatus === 'late' && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold">Payment Reminder from Center Director:</p>
            <p className="mt-0.5 italic">
              &quot;Dear Parents, Gentle Reminder for the Late Payment of {patient.pendingPaymentAmount ? `₹${patient.pendingPaymentAmount.toLocaleString('en-IN')}` : ''} {patient.pendingPaymentMonth ? `for ${patient.pendingPaymentMonth}` : ''}.&quot;
            </p>
            <p className="text-[11px] text-amber-700 mt-1">
              Please contact Dr. Sweety Bhatnagar or use UPI at the reception counter.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-[#6D0281] text-white shadow-xs'
              : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          Scheduled Sessions
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'progress'
              ? 'bg-[#6D0281] text-white shadow-xs'
              : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Developmental Progress ({approvedSummaries.length})
        </button>

        <button
          onClick={() => setActiveTab('receipts')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'receipts'
              ? 'bg-[#6D0281] text-white shadow-xs'
              : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Payment Receipts ({childInvoices.length})
        </button>

        <button
          onClick={() => setActiveTab('programs')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'programs'
              ? 'bg-[#6D0281] text-white shadow-xs'
              : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Clinical Programs
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'team'
              ? 'bg-[#6D0281] text-white shadow-xs'
              : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Clinical Team
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'account'
              ? 'bg-[#6D0281] text-white shadow-xs'
              : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          My Login & Password
        </button>
      </div>

      {/* Tab 1: Scheduled Sessions (STRICTLY READ-ONLY) */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-100 text-[#6D0281] shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xs text-purple-900 leading-relaxed">
              <p className="font-bold">In-Center Attendance & Rescheduling Protocol:</p>
              <p className="mt-0.5">
                Parents sit inside the therapy room and watch sessions live.
                All session times are scheduled personally by Dr. Sweety Bhatnagar.
                To request any slot adjustment or rescheduling, please call the center directly at <strong>+91 98110 23456</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {patient.childName}&apos;s Upcoming & Completed Sessions
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {childSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No scheduled sessions on record. Contact Dr. Bhatnagar to assign your slot.
                </div>
              ) : (
                childSessions.map((session) => {
                  const therapist = therapists.find((t) => t.id === session.therapistId);
                  const dateStr = new Date(session.scheduledAt).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div key={session.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#6D0281] font-bold text-xs shrink-0 border border-purple-100">
                          {session.timeSlot?.split(' ')[0] || 'OT'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{dateStr}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Slot: {session.timeSlot || '04:00 PM - 05:00 PM'} • Therapist: <strong>{therapist ? therapist.name : 'Dr. Sweety Bhatnagar'}</strong>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                          session.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {session.status === 'completed' ? 'Session Attended' : 'Scheduled In-Center'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Approved Progress Summaries (NEVER RAW NOTES) */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs text-emerald-900 leading-relaxed">
              <p className="font-bold">Official Practice Progress Reports:</p>
              <p className="mt-0.5">
                Every report here is personally reviewed, clinically verified, and approved by <strong>Dr. Sweety Bhatnagar</strong> to synthesize developmental milestones across sensory, motor, and regulation domains.
              </p>
            </div>
          </div>

          {approvedSummaries.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              <Sparkles className="w-8 h-8 mx-auto text-purple-300 mb-2" />
              Dr. Sweety Bhatnagar is currently preparing your child&apos;s fortnightly developmental review. It will appear here immediately upon clinical approval.
            </div>
          ) : (
            <div className="space-y-4">
              {approvedSummaries.map((summary) => (
                <div
                  key={summary.id}
                  className="bg-white p-5 rounded-2xl border border-purple-100/80 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Developmental Fortnightly Review ({summary.periodStart} to {summary.periodEnd})
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Approved by Dr. Sweety Bhatnagar • Nurturing Minds Therapy Center
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Clinically Approved
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed bg-purple-50/40 p-4 rounded-xl border border-purple-100/70 font-normal">
                    {summary.aiDraft}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Official Invoices / Receipts (PDF Download) */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-purple-100/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Payment Receipts Register
                </h3>
                <p className="text-[11px] text-slate-500">
                  Valid for insurance, tax exemption, and company therapy reimbursement
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {childInvoices.length === 0 ? (
                <p className="p-8 text-center text-slate-400">No payment receipts issued yet.</p>
              ) : (
                childInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-900">{inv.description}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Receipt: <strong className="text-[#6D0281]">{inv.invoiceNumber}</strong> • Date: {new Date(inv.issuedAt).toLocaleDateString('en-IN')} • Mode: {inv.paymentMode}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm text-slate-900">
                        ₹ {inv.amount.toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => downloadInvoicePDF(inv, patient, assignedTherapist)}
                        className="px-3 py-1.5 bg-[#6D0281] hover:bg-[#570167] text-white font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Programs Offered */}
      {activeTab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {programs.map((prog) => (
            <div
              key={prog.id}
              className="bg-white rounded-2xl border border-purple-100/80 overflow-hidden shadow-xs"
            >
              <div className="h-40 overflow-hidden bg-slate-100">
                <img
                  src={prog.imageUrl}
                  alt={prog.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="text-sm font-bold text-slate-900 mb-2">{prog.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {prog.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 5: Clinical Team (Dr. Sweety Bhatnagar & Therapists) */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Doctor Profile */}
          <div className="bg-white p-6 rounded-2xl border border-purple-100/80 shadow-xs">
            <div className="flex flex-col md:flex-row items-start gap-5">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#6D0281] shrink-0 bg-slate-100 shadow-xs">
                <img
                  src={doctorProfile.photoUrl}
                  alt={doctorProfile.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2 flex-1">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{doctorProfile.name}</h3>
                  <p className="text-xs font-semibold text-[#6D0281]">{doctorProfile.qualifications}</p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {doctorProfile.bio}
                </p>

                <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-500 border-t border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#6D0281]" />
                    {doctorProfile.clinicAddress}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#6D0281]" />
                    {doctorProfile.contactPhone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#6D0281]" />
                    {doctorProfile.contactEmail}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Therapist Profiles */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Practice Pediatric Occupational Therapists
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {therapists.map((t) => (
                <div
                  key={t.id}
                  className="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-purple-200">
                    <img
                      src={t.photoUrl}
                      alt={t.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{t.name}</h4>
                    <p className="text-[11px] font-medium text-[#6D0281]">{t.qualification}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{t.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: My Login & Password Function */}
      {activeTab === 'account' && (
        <div className="space-y-5 animate-in fade-in">
          {passwordSaveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 font-bold">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Password updated successfully! You can use this new password to log in next time.</span>
            </div>
          )}

          {/* Account Details Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#6D0281] flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Member Portal Login Credentials</h3>
                  <p className="text-xs text-slate-500">
                    Child: <strong>{patient.childName}</strong> • Parents: {patient.motherName} & {patient.fatherName}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-[#6D0281] border border-purple-200">
                Active Member Account
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Login ID Display */}
              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Your Portal Login ID / Username
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-[#6D0281]">
                    {patient.parentLoginId || patient.parentEmail || patient.motherContact}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(patient.parentLoginId || patient.parentEmail || patient.motherContact);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="p-1.5 rounded-lg text-[#6D0281] hover:bg-purple-100 transition"
                    title="Copy Login ID"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  You can also log in using your registered email (<strong>{patient.parentEmail || 'your email'}</strong>) or mobile number.
                </p>
              </div>

              {/* Password Form */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Portal Password Management
                </span>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-9 pr-10 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!newPassword.trim()) return;
                      store.updateMemberCredentials(patient.id, {
                        parentPassword: newPassword.trim(),
                      });
                      setPasswordSaveSuccess(true);
                      setTimeout(() => setPasswordSaveSuccess(false), 3500);
                    }}
                    className="w-full py-2 bg-[#6D0281] hover:bg-[#570167] text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Update My Password</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Assistance Card */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs flex items-start gap-3">
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 text-amber-900 leading-relaxed">
                <p className="font-bold">Forgot your password or unable to log in?</p>
                <p className="text-[11px] text-amber-800">
                  Dr. Sweety Bhatnagar (Clinical Director) can reset your password instantly at the clinic reception or via phone/WhatsApp at <strong>{doctorProfile.phone}</strong> and provide you with a fresh login slip.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded YouTube Guidance Video (Broadcast by Dr. Bhatnagar) */}
      {publishedVideo && (
        <div className="bg-white p-5 rounded-2xl border border-purple-100/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-4 h-4 text-[#6D0281]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Educational Video Guidance from Dr. Sweety Bhatnagar
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 aspect-video rounded-xl overflow-hidden bg-slate-900 shadow-xs">
              <iframe
                src={getEmbedUrl(publishedVideo.youtubeUrl)}
                title={publishedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h4 className="text-sm font-bold text-slate-900">{publishedVideo.title}</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {publishedVideo.description}
              </p>
              <p className="text-[10px] text-slate-400 mt-3">
                Published on {new Date(publishedVideo.publishedAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
