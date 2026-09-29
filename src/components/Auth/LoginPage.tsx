import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Heart,
  Phone,
  HelpCircle,
} from 'lucide-react';
import { DoctorProfile, InviteCode, Patient, Role, Therapist, UserSession } from '../../types';
import { store } from '../../services/store';

interface LoginPageProps {
  doctorProfile: DoctorProfile;
  therapists: Therapist[];
  patients: Patient[];
  invites: InviteCode[];
  onLogin: (user: UserSession) => void;
  onOpenInviteRegistration?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  doctorProfile,
  therapists,
  patients,
  invites,
  onLogin,
  onOpenInviteRegistration,
}) => {
  // Default to parent portal for parents arriving at the clinic link
  const [activeTab, setActiveTab] = useState<Role | 'invite'>('parent');

  // Universal / Role credential inputs - START BLANK FOR SECURITY
  const [loginIdInput, setLoginIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Invite code tab state
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Status & error state
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When switching tabs, clear inputs to maintain security
  const handleTabChange = (newTab: Role | 'invite') => {
    setActiveTab(newTab);
    setErrorMessage('');
    setShowPassword(false);
    setLoginIdInput('');
    setPasswordInput('');
  };

  // Submit Login credentials
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const result = store.authenticate(loginIdInput, passwordInput);

    if (!result.success || !result.user) {
      setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
      setIsSubmitting(false);
      return;
    }

    // Success
    onLogin(result.user);
    setIsSubmitting(false);
  };

  // Handle Invite Code validation
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      setInviteError('Please enter your invitation code.');
      return;
    }

    const found = invites.find((i) => i.code.trim().toUpperCase() === code && !i.used);
    if (!found) {
      setInviteError('Invalid or expired invite code. Please check with Dr. Sweety Bhatnagar.');
      return;
    }

    if (onOpenInviteRegistration) {
      onOpenInviteRegistration();
    } else {
      if (found.role === 'parent' && found.patientId) {
        const patient = patients.find((p) => p.id === found.patientId);
        const parentUser: UserSession = {
          id: `user-${found.id}`,
          role: 'parent',
          name: `${found.recipientName} (Parent)`,
          email: `${found.recipientName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          patientId: patient?.id,
        };
        store.login(parentUser);
        onLogin(parentUser);
      } else {
        const therapistUser: UserSession = {
          id: `user-${found.id}`,
          role: 'therapist',
          name: found.recipientName,
          email: `${found.recipientName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        };
        store.login(therapistUser);
        onLogin(therapistUser);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-[#FAF7FC] via-[#FDFCFE] to-purple-50/50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Clinic Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white p-0.5 shadow-xs border border-purple-200 overflow-hidden flex items-center justify-center shrink-0">
            <img
              src="/logo.svg"
              alt="Nurturing Minds Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="text-[#6D0281] font-black text-sm tracking-wide uppercase block">
              NURTURING MINDS
            </span>
            <span className="text-slate-500 text-[10px] tracking-wider uppercase font-semibold">
              Therapy Center • Dr. Sweety Bhatnagar
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-purple-800 bg-purple-100/60 px-3 py-1 rounded-full border border-purple-200">
          <ShieldCheck className="w-3.5 h-3.5 text-[#6D0281]" />
          <span>Credential-Based Secure Access</span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="max-w-xl mx-auto w-full my-auto">
        <div className="bg-white rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/80 overflow-hidden backdrop-blur-xs">
          {/* Card Top Banner */}
          <div className="bg-linear-to-r from-[#6D0281] to-[#8804a1] px-6 py-6 sm:px-8 text-white relative">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider text-purple-100 border border-white/10">
                    <KeyRound className="w-3 h-3 text-amber-300" />
                    Authorized Clinical Sign In
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-200 border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Firestore (asia-south1)
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Welcome to Nurturing Minds
                </h2>
                <p className="text-xs text-purple-100 leading-relaxed max-w-md">
                  Login with your User ID and Password to access pediatric therapy records, milestone summaries, schedules, and invoices.
                </p>
              </div>

              <div className="hidden sm:block shrink-0 pl-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/30 shadow-md bg-purple-900">
                  <img
                    src={doctorProfile.photoUrl}
                    alt={doctorProfile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Role Navigation Tabs */}
          <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50/50 p-1.5 text-xs font-bold text-slate-600">
            <button
              type="button"
              id="tab-parent"
              onClick={() => handleTabChange('parent')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'parent'
                  ? 'bg-white text-[#6D0281] shadow-xs border border-purple-100'
                  : 'hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Parent Portal</span>
            </button>

            <button
              type="button"
              id="tab-therapist"
              onClick={() => handleTabChange('therapist')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'therapist'
                  ? 'bg-white text-[#6D0281] shadow-xs border border-purple-100'
                  : 'hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-purple-600" />
              <span>Therapists</span>
            </button>

            <button
              type="button"
              id="tab-admin"
              onClick={() => handleTabChange('admin')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-[#6D0281] shadow-xs border border-purple-100'
                  : 'hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-[#6D0281]" />
              <span>Director</span>
            </button>

            <button
              type="button"
              id="tab-invite"
              onClick={() => handleTabChange('invite')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'invite'
                  ? 'bg-white text-[#6D0281] shadow-xs border border-purple-100'
                  : 'hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>Invite Code</span>
            </button>
          </div>

          {/* Form Content Area */}
          <div className="p-6 sm:p-8">
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1, 2, 3: CREDENTIAL LOGIN (Parent, Therapist, Director) */}
            {activeTab !== 'invite' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Role description banner */}
                {activeTab === 'parent' && (
                  <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-100 text-xs text-rose-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold flex items-center gap-1.5 text-rose-800">
                        <Heart className="w-3.5 h-3.5 text-rose-600" />
                        <span>Registered Parent & Family Portal</span>
                      </p>
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                        Family Access
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-700">
                      Sign in with your registered Parent Mobile Number, Email, or Login ID and Password to view your child&apos;s therapy milestones, schedule, and receipts.
                    </p>
                  </div>
                )}

                {activeTab === 'therapist' && (
                  <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold flex items-center gap-1.5 text-blue-800">
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Clinical Staff Login (Therapist Portal)</span>
                      </p>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        Staff Auth
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-700">
                      Enter your clinical Staff Login ID and password to access schedules and log quick session notes.
                    </p>
                  </div>
                )}

                {activeTab === 'admin' && (
                  <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-200 shadow-2xs">
                        <img
                          src={doctorProfile.photoUrl}
                          alt={doctorProfile.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{doctorProfile.name}</h4>
                        <p className="text-[10px] text-purple-700 font-semibold">
                          Practice Director & Sole Administrator
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6D0281] text-white">
                      Director Access
                    </span>
                  </div>
                )}

                {/* Login ID Input Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {activeTab === 'admin'
                      ? 'Admin Email / Login ID *'
                      : activeTab === 'therapist'
                      ? 'Staff Login ID or Email *'
                      : 'Parent Mobile, Email, or Login ID *'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      id="universal-login-id"
                      value={loginIdInput}
                      onChange={(e) => setLoginIdInput(e.target.value)}
                      placeholder={
                        activeTab === 'admin'
                          ? 'connect@drsweetybhatnagar.com'
                          : activeTab === 'therapist'
                          ? 'e.g. ritu.verma@nurturingminds.com'
                          : 'e.g. 9789305029 or parent email'
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D0281] focus:border-transparent transition bg-slate-50/40 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Password Input Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      id="universal-password-input"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 text-xs font-mono font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D0281] focus:border-transparent transition bg-slate-50/40 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Account recovery helper notice */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>
                    Forgot your credentials or need access? Please contact Dr. Sweety Bhatnagar at reception or call the clinic helpline at <strong>+91 97893 05029</strong>.
                  </p>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  id="btn-login-submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-[#6D0281] hover:bg-[#570167] text-white font-bold text-xs transition shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {activeTab === 'admin'
                      ? 'Sign In as Dr. Sweety Bhatnagar'
                      : activeTab === 'therapist'
                      ? 'Sign In to Therapist Portal'
                      : 'Sign In to Parent Portal'}
                  </span>
                </button>
              </form>
            )}

            {/* TAB 4: Invite Code Redemption */}
            {activeTab === 'invite' && (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs text-amber-900">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <KeyRound className="w-3.5 h-3.5" />
                    Private Invitation Code Required
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Nurturing Minds does not use public signups. Families and staff receive an individualized invite code from Dr. Sweety Bhatnagar.
                  </p>
                </div>

                {inviteError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    {inviteError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Enter Invite Code *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="e.g. NM-PAT-AARAV-4821"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold tracking-wider uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D0281] focus:border-transparent transition bg-slate-50/40 focus:bg-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Check the WhatsApp / SMS message or invoice invite slip provided by Dr. Bhatnagar.
                  </p>
                </div>

                <button
                  type="submit"
                  id="btn-invite-verify-submit"
                  className="w-full py-3 px-4 rounded-xl bg-[#6D0281] hover:bg-[#570167] text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Verify & Unlock Portal</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-4xl mx-auto w-full text-center text-slate-400 text-xs py-4 space-y-1">
        <p className="font-medium text-slate-500">
          Nurturing Minds Therapy Center • Clinical Practice of Dr. Sweety Bhatnagar (B.O.T, M.O.T, NDT, SI Certified)
        </p>
        <p className="text-[11px] text-slate-400">
          In-Center Live Parent Partnership • Direct Sensory Integration • Confidential Clinical Records
        </p>
      </footer>
    </div>
  );
};
