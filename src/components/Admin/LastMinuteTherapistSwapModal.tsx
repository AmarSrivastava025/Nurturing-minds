import React, { useState } from 'react';
import {
  UserCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  RefreshCw,
  BellRing,
  UserX,
  Sparkles,
} from 'lucide-react';
import { Patient, Session, Therapist } from '../../types';
import { store } from '../../services/store';

interface LastMinuteTherapistSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: Session | null;
  patient?: Patient | null;
  therapists: Therapist[];
  sessions?: Session[];
  onSuccess?: (message: string) => void;
}

export const LastMinuteTherapistSwapModal: React.FC<LastMinuteTherapistSwapModalProps> = ({
  isOpen,
  onClose,
  session,
  patient,
  therapists,
  sessions = [],
  onSuccess,
}) => {
  if (!isOpen) return null;

  // Derive active child patient and current therapist
  const currentPatient =
    patient || (session ? store.getState().patients.find((p) => p.id === session.patientId) : null);
  const currentTherapistId = session?.therapistId || currentPatient?.assignedTherapistId || '';
  const currentTherapist = therapists.find((t) => t.id === currentTherapistId);

  // Available substitute therapists (excluding currently assigned therapist if more than 1 therapist exists)
  const availableTherapists = therapists;

  // Selected replacement therapist
  const initialNewTherapist =
    availableTherapists.find((t) => t.id !== currentTherapistId)?.id || availableTherapists[0]?.id || '';
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>(initialNewTherapist);

  // Swap scope: 'session_only' vs 'permanent'
  const [scope, setScope] = useState<'session_only' | 'permanent'>(
    session ? 'session_only' : 'permanent'
  );

  // Reason & Handover note
  const [reason, setReason] = useState<string>('Therapist sick leave / emergency cover');
  const [customNote, setCustomNote] = useState<string>('');
  const [notifyParent, setNotifyParent] = useState<boolean>(true);

  // Check if a therapist has a time conflict with the session's slot
  const checkTherapistConflict = (therapistId: string) => {
    if (!session) return false;
    const sessionDate = session.scheduledAt.split('T')[0];
    const sessionTimeSlot = session.timeSlot;

    return sessions.some(
      (s) =>
        s.id !== session.id &&
        s.therapistId === therapistId &&
        s.scheduledAt.startsWith(sessionDate) &&
        s.timeSlot === sessionTimeSlot &&
        s.status === 'scheduled'
    );
  };

  const selectedTherapistHasConflict = checkTherapistConflict(selectedTherapistId);
  const selectedTherapistObj = therapists.find((t) => t.id === selectedTherapistId);

  const handleConfirmSwap = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTherapistId) {
      alert('Please select a replacement therapist.');
      return;
    }

    if (selectedTherapistId === currentTherapistId) {
      alert('Please select a different therapist to perform the reassignment.');
      return;
    }

    const fullReason = customNote.trim()
      ? `${reason}: ${customNote.trim()}`
      : reason;

    if (session) {
      // Reassign specific session (with optional permanent cascade)
      store.reassignSessionTherapist(session.id, selectedTherapistId, {
        reason: fullReason,
        isPermanent: scope === 'permanent',
        notifyParent,
      });

      const message =
        scope === 'permanent'
          ? `Therapist permanently changed to ${selectedTherapistObj?.name || 'new therapist'} for ${currentPatient?.childName || 'child'} and all upcoming sessions.`
          : `Emergency substitute ${selectedTherapistObj?.name || 'new therapist'} assigned for today's session (${session.timeSlot || '45m slot'}).`;

      if (onSuccess) onSuccess(message);
    } else if (currentPatient) {
      // Reassign primary therapist for patient directly
      store.reassignPatientPrimaryTherapist(currentPatient.id, selectedTherapistId, {
        updateUpcomingSessions: true,
        reason: fullReason,
      });

      const message = `Primary therapist updated to ${selectedTherapistObj?.name || 'new therapist'} for ${currentPatient.childName}. Upcoming sessions synchronized.`;
      if (onSuccess) onSuccess(message);
    }

    onClose();
  };

  const formattedDate = session
    ? new Date(session.scheduledAt).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : 'Ongoing Practice Schedule';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 my-8 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Last-Minute Therapist Swap
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6D0281] text-white">
                  Dr. Bhatnagar Authority
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Immediately swap or substitute therapist for urgent cover with automated alerts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleConfirmSwap} className="overflow-y-auto py-4 space-y-4 flex-1 text-xs">
          {/* Child & Session Summary Card */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-purple-700">
                  Child Patient
                </p>
                <h4 className="text-sm font-bold text-slate-900">
                  {currentPatient?.childName || 'Child Patient'}
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {currentPatient?.age} yrs • Parent: {currentPatient?.motherName} ({currentPatient?.primaryContact === 'mother' ? currentPatient?.motherContact : currentPatient?.fatherContact})
                </p>
              </div>

              {session && (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6D0281] bg-white px-2.5 py-1 rounded-xl border border-purple-200">
                    <Clock className="w-3.5 h-3.5 text-[#6D0281]" />
                    {session.timeSlot || '45-Min Slot'}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">{formattedDate}</p>
                </div>
              )}
            </div>

            {/* Current vs Replacement Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-purple-100">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Currently Assigned</p>
                  <p className="font-bold text-slate-800 text-xs">
                    {currentTherapist?.name || 'Unassigned'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[170px]">
                    {currentTherapist?.qualification || 'OT Specialist'}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-100 text-[#6D0281]">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-purple-700 font-semibold uppercase">Selected Substitute</p>
                  <p className="font-bold text-slate-900 text-xs">
                    {selectedTherapistObj?.name || 'Select below'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[170px]">
                    {selectedTherapistObj?.qualification || 'Ready for cover'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Replacement Therapist Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block text-xs">
              Select Replacement / Substitute Therapist *
            </label>

            <div className="space-y-1.5">
              {availableTherapists.map((therapist) => {
                const isSelected = therapist.id === selectedTherapistId;
                const isCurrent = therapist.id === currentTherapistId;
                const hasConflict = checkTherapistConflict(therapist.id);

                return (
                  <label
                    key={therapist.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-purple-50 border-[#6D0281] ring-1 ring-[#6D0281]'
                        : isCurrent
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="substituteTherapist"
                        value={therapist.id}
                        checked={isSelected}
                        onChange={() => setSelectedTherapistId(therapist.id)}
                        disabled={isCurrent}
                        className="text-[#6D0281] focus:ring-[#6D0281]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{therapist.name}</span>
                          {therapist.id === 'th-3' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#6D0281] text-white">
                              Practice Director
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-200 text-slate-700">
                              Currently Assigned
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {therapist.qualification} • {therapist.experience}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {hasConflict ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Has conflicting slot
                        </span>
                      ) : isCurrent ? (
                        <span className="text-[10px] text-slate-400">Current</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Available
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedTherapistHasConflict && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Notice:</strong> {selectedTherapistObj?.name} already has another session
                  at this time. You may still reassign if conducting joint or supervised intervention.
                </span>
              </div>
            )}
          </div>

          {/* Reassignment Scope (Temporary vs Permanent) */}
          {session && (
            <div className="space-y-2">
              <label className="font-bold text-slate-800 block text-xs">
                Scope of Reassignment
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('session_only')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    scope === 'session_only'
                      ? 'bg-purple-50/80 border-[#6D0281] ring-1 ring-[#6D0281]'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Substitute THIS Session Only
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Temporary cover for today. Child&apos;s primary therapist and future sessions stay unchanged.
                    </span>
                  </div>
                  <span className="mt-2 text-[10px] font-bold text-purple-700">
                    ✓ Recommended for sick leave / urgent cover
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('permanent')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    scope === 'permanent'
                      ? 'bg-purple-50/80 border-[#6D0281] ring-1 ring-[#6D0281]'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Permanent Reassignment
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Update primary therapist in CRM and reassign all upcoming scheduled sessions.
                    </span>
                  </div>
                  <span className="mt-2 text-[10px] font-bold text-[#6D0281]">
                    ✓ Full caseload transfer
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Reason & Quick Selection Chips */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block text-xs">
              Reason for Last-Minute Swap
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Therapist emergency leave',
                'Therapist sick leave',
                'Clinical specialty requirement',
                'Supervised evaluation by Dr. Bhatnagar',
                'Parent timing request',
              ].map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setReason(pill)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                    reason === pill
                      ? 'bg-[#6D0281] text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Optional clinical notes or handover instructions for substitute..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none text-xs"
            />
          </div>

          {/* Automated Alert Dispatches */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <p className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-[#6D0281]" />
              Automated Notification Dispatches (On Confirmation):
            </p>
            <div className="space-y-1 text-[11px] text-slate-600">
              <p className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  Urgent assignment alert sent to <strong>{selectedTherapistObj?.name}</strong> with child details.
                </span>
              </p>
              {currentTherapist && (
                <p className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>
                    Relief notification sent to <strong>{currentTherapist.name}</strong>.
                  </span>
                </p>
              )}
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyParent}
                  onChange={(e) => setNotifyParent(e.target.checked)}
                  className="rounded text-[#6D0281] focus:ring-[#6D0281]"
                />
                <span className="font-medium text-slate-700">
                  Notify parent via Parent Portal & automated WhatsApp/SMS of therapist update
                </span>
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedTherapistId === currentTherapistId}
              className="px-5 py-2 text-xs font-bold text-white bg-[#6D0281] hover:bg-[#570167] rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              Confirm Therapist Swap & Dispatch Alerts
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
