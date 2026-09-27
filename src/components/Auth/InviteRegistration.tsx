import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight, UserCheck, ShieldCheck, X } from 'lucide-react';
import { store } from '../../services/store';
import { InviteCode, Patient } from '../../types';

interface InviteRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  invites: InviteCode[];
  patients: Patient[];
}

export const InviteRegistration: React.FC<InviteRegistrationProps> = ({
  isOpen,
  onClose,
  invites,
  patients,
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [verifiedInvite, setVerifiedInvite] = useState<InviteCode | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Registration fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [qualification, setQualification] = useState('');
  const [summary, setSummary] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  if (!isOpen) return null;

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const code = inviteCode.trim().toUpperCase();
    const found = invites.find((i) => i.code.trim().toUpperCase() === code && !i.used);

    if (!found) {
      setErrorMessage(
        'Invalid or already claimed invite code. Open self-signup is disabled; please contact Dr. Sweety Bhatnagar.'
      );
      return;
    }

    setVerifiedInvite(found);
    setName(found.recipientName);
    setEmail(`${found.recipientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`);
    if (found.role === 'therapist') {
      setQualification('BOT, Pediatric Occupational Therapist');
      setSummary('Certified occupational therapist specializing in sensory integration and handwriting.');
    }
  };

  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedInvite) return;

    try {
      store.claimInvite(verifiedInvite.code, {
        name: name.trim(),
        email: email.trim(),
        qualification: qualification.trim(),
        summary: summary.trim(),
      });
      setRegistrationSuccess(true);
      setTimeout(() => {
        setRegistrationSuccess(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const matchedPatient = verifiedInvite?.patientId
    ? patients.find((p) => p.id === verifiedInvite.patientId)
    : null;

  const availableInvites = invites.filter((i) => !i.used);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-purple-100 text-[#6D0281]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Invite-Gated Registration</h3>
            <p className="text-xs text-slate-500">Authorized clinic registration for parents and staff</p>
          </div>
        </div>

        {/* Informational constraint banner */}
        <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-900 space-y-1 mb-4">
          <p className="font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#6D0281]" />
            Strict Invite Policy:
          </p>
          <p>
            Accounts are created exclusively through invite codes issued by Dr. Sweety Bhatnagar after 90-min assessment and payment. Open self-signup is disabled.
          </p>
        </div>

        {!verifiedInvite ? (
          <form onSubmit={handleVerifyCode} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Enter Authorized Invite Code *
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. NM-PARENT-4821 or NM-THERAPIST-9102"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none uppercase font-mono tracking-wider font-bold"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick-test helpers for active invites */}
            {availableInvites.length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                  Click Sample Active Code to Test:
                </p>
                <div className="space-y-1">
                  {availableInvites.slice(0, 3).map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => setInviteCode(inv.code)}
                      className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-purple-50 border border-slate-200 text-[11px] flex items-center justify-between transition"
                    >
                      <span className="font-mono font-bold text-[#6D0281]">{inv.code}</span>
                      <span className="text-slate-500 capitalize">{inv.recipientName} ({inv.role})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#6D0281] hover:bg-[#570167] text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
            >
              Verify Code <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleCompleteRegistration} className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
              <p className="font-bold">Code Verified: {verifiedInvite.code}</p>
              <p className="mt-0.5">
                Role: <strong>{verifiedInvite.role === 'parent' ? 'Member (Parent)' : 'Therapist'}</strong>
              </p>
              {matchedPatient && (
                <p className="mt-0.5 text-emerald-800">
                  Linked Child Patient: <strong>{matchedPatient.childName}</strong> ({matchedPatient.age} yrs)
                </p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Your Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
              />
            </div>

            {verifiedInvite.role === 'therapist' && (
              <>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Clinical Qualification *</label>
                  <input
                    type="text"
                    required
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Professional Summary *</label>
                  <textarea
                    rows={2}
                    required
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                  />
                </div>
              </>
            )}

            {registrationSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Account created and linked successfully! Switching view...
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVerifiedInvite(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#6D0281] hover:bg-[#570167] text-white font-bold rounded-xl transition shadow-xs"
              >
                Complete Registration
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
