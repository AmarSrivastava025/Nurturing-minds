import React, { useState } from 'react';
import { UserPlus, Copy, Check, AlertTriangle, ShieldCheck, RefreshCw, KeyRound } from 'lucide-react';
import { InviteCode, Patient } from '../../types';
import { store } from '../../services/store';

interface InviteManagerProps {
  invites: InviteCode[];
  patients: Patient[];
}

export const InviteManager: React.FC<InviteManagerProps> = ({ invites, patients }) => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCutoverModal, setShowCutoverModal] = useState(false);
  const [role, setRole] = useState<'parent' | 'therapist'>('parent');
  const [recipientName, setRecipientName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cutoverConfirmText, setCutoverConfirmText] = useState('');

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) return;

    store.createInvite(
      role,
      recipientName.trim(),
      role === 'parent' ? selectedPatientId : undefined
    );

    setRecipientName('');
    setShowGenerateModal(false);
  };

  const handleCopy = (invite: InviteCode) => {
    navigator.clipboard.writeText(
      `Nurturing Minds Registration Invite: Use code [ ${invite.code} ] to register your authorized account at Nurturing Minds Therapy Center.`
    );
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCutover = () => {
    if (cutoverConfirmText !== 'WIPE AND CUTOVER') {
      alert('Please type "WIPE AND CUTOVER" exactly to confirm.');
      return;
    }
    store.wipeSeedDataAndCutover();
    setShowCutoverModal(false);
    setCutoverConfirmText('');
    alert('Practice test data has been successfully wiped. You are now live and ready for patient onboarding!');
  };

  const handleRestoreDemo = () => {
    if (confirm('Restore default sample seed data for testing?')) {
      store.resetToSeedData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#6D0281]" />
            Invite-Gated Access & Cutover Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict invite-only registration. Open self-signup is strictly disabled.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2.5 bg-[#6D0281] hover:bg-[#570167] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Generate Registration Invite
          </button>

          <button
            onClick={() => setShowCutoverModal(true)}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center gap-1.5"
            title="Step 10: Cutover to Live Practice"
          >
            <AlertTriangle className="w-4 h-4" />
            Cutover to Live
          </button>
        </div>
      </div>

      {/* Invites Table */}
      <div className="bg-white rounded-2xl border border-purple-100/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Authorized Invites Register ({invites.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Only users with an active code can register an account
            </p>
          </div>

          <button
            onClick={handleRestoreDemo}
            className="text-[11px] font-semibold text-slate-500 hover:text-[#6D0281] flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Seed Data
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Invite Code</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Authorized Recipient</th>
                <th className="py-2.5 px-4">Created Date</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Share Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#6D0281]">
                    {invite.code}
                  </td>
                  <td className="py-3 px-4 capitalize">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        invite.role === 'parent'
                          ? 'bg-purple-100 text-[#6D0281]'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {invite.role === 'parent' ? 'Member (Parent)' : 'Therapist'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {invite.recipientName}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(invite.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        invite.used
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {invite.used ? 'CLAIMED / REGISTERED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleCopy(invite)}
                      disabled={invite.used}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-purple-50 hover:text-[#6D0281] disabled:opacity-40 transition inline-flex items-center gap-1"
                    >
                      {copiedId === invite.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Invite Link
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Invite Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Generate Invite-Gated Code</h3>
            <p className="text-xs text-slate-500 mb-4">
              Authorizes a parent or therapist to register without exposing open self-signup.
            </p>

            <form onSubmit={handleGenerate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('parent')}
                    className={`py-2 px-3 rounded-xl font-bold border text-xs transition ${
                      role === 'parent'
                        ? 'bg-[#6D0281] text-white border-[#6D0281]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Member / Parent
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('therapist')}
                    className={`py-2 px-3 rounded-xl font-bold border text-xs transition ${
                      role === 'therapist'
                        ? 'bg-[#6D0281] text-white border-[#6D0281]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Therapist
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Recipient Name *</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Priya Sharma or Anjali Gupta"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                />
              </div>

              {role === 'parent' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Map to Child Patient *</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-white font-medium"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.childName} (Mother: {p.motherName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#6D0281] hover:bg-[#570167] rounded-xl transition shadow-xs"
                >
                  Generate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 10: Cutover Safeguard Modal */}
      {showCutoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border-2 border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Step 10: Cutover to Live Clinical Practice
                </h3>
                <p className="text-xs text-slate-500">Autonomous transition to production onboarding</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-rose-50/60 p-3.5 rounded-xl border border-rose-100">
              <p className="font-semibold text-rose-900">What this action does:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Wipes all test/demo child patients and practice invoices.</li>
                <li>Wipes demo sessions and test AI progress summaries.</li>
                <li>Retains Dr. Sweety Bhatnagar as clinical director.</li>
                <li>Retains standard clinical programs (Sensory, Soundsory, OT).</li>
                <li>Leaves the practice clean and ready for live client onboarding without developer intervention!</li>
              </ul>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Type &quot;WIPE AND CUTOVER&quot; to proceed:
              </label>
              <input
                type="text"
                value={cutoverConfirmText}
                onChange={(e) => setCutoverConfirmText(e.target.value)}
                placeholder="WIPE AND CUTOVER"
                className="w-full px-3 py-2 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-xs font-mono"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCutoverModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCutover}
                disabled={cutoverConfirmText !== 'WIPE AND CUTOVER'}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-xl transition shadow-xs"
              >
                Confirm Cutover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
