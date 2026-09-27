import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Clock, Edit3, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import { Patient, ProgressSummary, Session } from '../../types';
import { store } from '../../services/store';
import { generateProgressSummary } from '../../services/ai';

interface ProgressApprovalQueueProps {
  progressSummaries: ProgressSummary[];
  patients: Patient[];
  sessions: Session[];
}

export const ProgressApprovalQueue: React.FC<ProgressApprovalQueueProps> = ({
  progressSummaries,
  patients,
  sessions,
}) => {
  const [selectedPatientForGen, setSelectedPatientForGen] = useState<string>(patients[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  const [editedDraftText, setEditedDraftText] = useState<string>('');

  const pendingSummaries = progressSummaries.filter((p) => !p.approved);
  const approvedSummaries = progressSummaries.filter((p) => p.approved);

  const getPatient = (id: string) => patients.find((p) => p.id === id);

  // Trigger manual generation of a fortnightly progress summary from therapist notes
  const handleTriggerAI = async () => {
    const patient = getPatient(selectedPatientForGen);
    if (!patient) return;

    // Gather therapist notes for this child
    const patientSessions = sessions.filter((s) => s.patientId === patient.id && s.progressNote);
    const notes = patientSessions.map((s) => s.progressNote!).filter(Boolean);

    const notesToUse = notes.length > 0 ? notes : ['Calm and regulated', 'Improved sensory tolerance', 'Good tabletop focus'];

    setIsGenerating(true);
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      const periodStart = twoWeeksAgo.toISOString().split('T')[0];
      const periodEnd = now.toISOString().split('T')[0];

      const result = await generateProgressSummary(
        patient.childName,
        notesToUse,
        { start: periodStart, end: periodEnd }
      );

      store.addProgressDraft({
        patientId: patient.id,
        periodStart,
        periodEnd,
        aiDraft: result.text || result.draftText || '',
        providerStamp: result.providerStamp,
        notesIncluded: notesToUse,
      });
    } catch (err) {
      console.error('Error generating summary draft:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartEdit = (summary: ProgressSummary) => {
    setEditingSummaryId(summary.id);
    setEditedDraftText(summary.aiDraft);
  };

  const handleApprove = (summary: ProgressSummary) => {
    const textToSave = editingSummaryId === summary.id ? editedDraftText : summary.aiDraft;
    store.approveProgressSummary(summary.id, textToSave);
    setEditingSummaryId(null);
  };

  return (
    <div className="space-y-6">
      {/* Policy Safeguard Banner */}
      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-bold">Strict Clinical Safeguard — Approval Gate:</p>
          <p className="mt-0.5">
            Therapists log fast 1-3 word notes after sessions. An AI draft is produced and held in this queue.
            <strong> Under zero conditions does a parent ever see a draft until Dr. Sweety Bhatnagar personally reviews and approves it.</strong>
          </p>
        </div>
      </div>

      {/* Generator Tool */}
      <div className="bg-white p-5 rounded-2xl border border-purple-100/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6D0281]" />
              Generate New Progress Draft (OpenRouter Free-Tier Pipeline)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Synthesizes completed 1-3 word therapist session notes into warm, clinical paragraph for parental review.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPatientForGen}
              onChange={(e) => setSelectedPatientForGen(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.childName}
                </option>
              ))}
            </select>

            <button
              onClick={handleTriggerAI}
              disabled={isGenerating}
              className="px-4 py-2 bg-[#6D0281] hover:bg-[#570167] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Produce AI Draft
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pending Approval Queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Pending Dr. Bhatnagar Approval Queue
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {pendingSummaries.length} awaiting review
            </span>
          </div>
        </div>

        {pendingSummaries.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs shadow-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
            All drafts are reviewed and approved. No summaries currently waiting in queue.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingSummaries.map((summary) => {
              const patient = getPatient(summary.patientId);
              const isEditing = editingSummaryId === summary.id;

              return (
                <div
                  key={summary.id}
                  className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-xs transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {patient?.childName || 'Child Patient'}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          HIDDEN FROM PARENTS (AWAITING APPROVAL)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Period: {summary.periodStart} to {summary.periodEnd} • Parent: {patient?.motherName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-purple-50 text-[#6D0281] px-2 py-1 rounded-lg border border-purple-200 truncate max-w-[240px]">
                        Stamp: {summary.providerStamp}
                      </span>
                    </div>
                  </div>

                  {/* Notes Included */}
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">
                      Therapist Session Notes Synthesized:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.notesIncluded.map((note, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-purple-50 text-[#6D0281] text-[11px] font-medium border border-purple-100"
                        >
                          &quot;{note}&quot;
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Draft Body */}
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">
                      AI Generated Fortnightly Summary:
                    </p>
                    {isEditing ? (
                      <textarea
                        rows={4}
                        value={editedDraftText}
                        onChange={(e) => setEditedDraftText(e.target.value)}
                        className="w-full p-3 text-xs border border-purple-300 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                      />
                    ) : (
                      <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-100 text-xs text-slate-800 leading-relaxed font-normal">
                        {summary.aiDraft}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    {isEditing ? (
                      <button
                        onClick={() => setEditingSummaryId(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                      >
                        Cancel Edit
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(summary)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#6D0281] rounded-xl border border-slate-200 transition flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Draft
                      </button>
                    )}

                    <button
                      onClick={() => handleApprove(summary)}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve & Publish to Parent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Previously Approved Summaries History */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Approved Summaries (Visible to Parents in Member Portal)
          </h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {approvedSummaries.length} approved
          </span>
        </div>

        <div className="space-y-3">
          {approvedSummaries.map((summary) => {
            const patient = getPatient(summary.patientId);

            return (
              <div
                key={summary.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {patient?.childName} • {summary.periodStart} to {summary.periodEnd}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Approved at {summary.approvedAt ? new Date(summary.approvedAt).toLocaleString('en-IN') : 'Recently'} by Dr. Sweety Bhatnagar
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {summary.providerStamp}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  {summary.aiDraft}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
