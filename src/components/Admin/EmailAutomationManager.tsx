import React, { useState } from 'react';
import {
  Mail,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { EmailLog, Patient, Session, Therapist } from '../../types';
import {
  formatAppointmentDate,
  generateBookingConfirmationHtml,
  generateReminderEmailHtml,
  generateFeedbackEmailHtml,
  processSessionEmailSequence,
  checkAndSendScheduledEmails,
} from '../../services/automation/email-confirmation-sequence';

interface EmailAutomationManagerProps {
  emailLogs: EmailLog[];
  sessions: Session[];
  patients: Patient[];
  therapists: Therapist[];
}

export const EmailAutomationManager: React.FC<EmailAutomationManagerProps> = ({
  emailLogs,
  sessions,
  patients,
  therapists,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions.length > 0 ? sessions[0].id : ''
  );
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(
    null
  );

  // Email Preview Modal State
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    subject: string;
    html: string;
    type: string;
  }>({
    isOpen: false,
    subject: '',
    html: '',
    type: '',
  });

  // Calculate statistics
  const totalSent = emailLogs.filter((l) => l.status === 'sent').length;
  const totalScheduled = emailLogs.filter((l) => l.status === 'scheduled').length;
  const totalFailed = emailLogs.filter((l) => l.status === 'failed').length;
  const totalAttempts = totalSent + totalFailed;
  const successRate = totalAttempts > 0 ? Math.round((totalSent / totalAttempts) * 100) : 100;

  // Filter logs
  const filteredLogs = emailLogs.filter((log) => {
    if (filterType !== 'all' && log.emailType !== filterType) return false;
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    return true;
  });

  const handleTriggerTest = async () => {
    if (!selectedSessionId) {
      setActionMessage({ text: 'Please select a session first.', isError: true });
      return;
    }

    setIsProcessing(true);
    setActionMessage({ text: 'Executing email confirmation sequence...' });

    try {
      const session = sessions.find((s) => s.id === selectedSessionId);
      const res = await processSessionEmailSequence(selectedSessionId, session);

      if (res.success) {
        setActionMessage({
          text: `Success: Booking confirmation email dispatched and 2-day reminder / 1-day feedback queued.`,
        });
      } else {
        setActionMessage({
          text: `Notice: ${res.message || 'Operation finished'}. Check log details below.`,
          isError: !res.success,
        });
      }
    } catch (err: any) {
      setActionMessage({ text: `Error: ${err.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunScheduledCheck = async () => {
    setIsProcessing(true);
    setActionMessage({ text: 'Checking for due reminder and feedback emails...' });

    try {
      const result = await checkAndSendScheduledEmails();
      setActionMessage({
        text: `Cron check finished: Processed ${result.processedCount} scheduled emails, dispatched ${result.sentCount}.`,
      });
    } catch (err: any) {
      setActionMessage({ text: `Scheduled check failed: ${err.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenPreview = (type: 'booking_confirmation' | 'reminder_2days' | 'feedback_1day') => {
    const samplePatient = patients[0] || {
      motherName: 'Pooja Sharma',
      childName: 'Aarav Sharma',
      parentEmail: 'pooja.sharma@example.com',
    };
    const sampleTherapist = therapists[0] || {
      name: 'Dr. Sweety Bhatnagar',
    };

    let result = { subject: '', html: '' };

    if (type === 'booking_confirmation') {
      result = generateBookingConfirmationHtml({
        parentName: samplePatient.motherName || 'Pooja Sharma',
        childName: samplePatient.childName || 'Aarav',
        scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        timeSlot: '03:00 PM - 03:45 PM',
        therapistName: sampleTherapist.name,
      });
    } else if (type === 'reminder_2days') {
      result = generateReminderEmailHtml({
        parentName: samplePatient.motherName || 'Pooja Sharma',
        childName: samplePatient.childName || 'Aarav',
        scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        timeSlot: '03:00 PM - 03:45 PM',
        therapistName: sampleTherapist.name,
      });
    } else {
      result = generateFeedbackEmailHtml({
        parentName: samplePatient.motherName || 'Pooja Sharma',
        childName: samplePatient.childName || 'Aarav',
      });
    }

    setPreviewModal({
      isOpen: true,
      subject: result.subject,
      html: result.html,
      type,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-teal-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                Service 3: Active
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
                Resend API Ready
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Mail className="w-6 h-6 text-teal-400" />
              Automated Email Confirmation Sequence
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Listens to new therapy session bookings in Firestore and delivers 3 automated emails to
              parents: Immediate Booking Confirmation, 2-Day Reminder, and 1-Day Post-Session Feedback.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunScheduledCheck}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              Run Scheduled Check
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all ${
            actionMessage.isError
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.isError ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-sm p-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Emails Delivered</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalSent}</div>
          <p className="text-xs text-slate-500 mt-1">Direct to parent inboxes</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Scheduled Queue</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{totalScheduled}</div>
          <p className="text-xs text-slate-500 mt-1">2-Day Reminders & Feedback</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
            <ShieldCheck className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-teal-600">{successRate}%</div>
          <p className="text-xs text-slate-500 mt-1">&lt;2% Bounce target</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Logs</span>
            <Mail className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{emailLogs.length}</div>
          <p className="text-xs text-slate-500 mt-1">Firestore tracked events</p>
        </div>
      </div>

      {/* Manual Test & Template Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Trigger Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-800 text-base">Test Automated Email Sequence</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Select any clinic session to test the full pipeline: fetches parent data, formats the
            dates, sends Email 1 immediately, and schedules Emails 2 & 3 in Firestore.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full sm:flex-1 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white"
            >
              {sessions.map((ses) => {
                const pat = patients.find((p) => p.id === ses.patientId);
                const th = therapists.find((t) => t.id === ses.therapistId);
                return (
                  <option key={ses.id} value={ses.id}>
                    {ses.id} — {pat?.childName || 'Child'} ({pat?.motherName || 'Parent'}) |{' '}
                    {formatAppointmentDate(ses.scheduledAt)} ({ses.timeSlot || '45m'}) |{' '}
                    {th?.name || 'Therapist'}
                  </option>
                );
              })}
            </select>

            <button
              onClick={handleTriggerTest}
              disabled={isProcessing || !selectedSessionId}
              className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Trigger Sequence Now
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              From: connect@drsweetybhatnagar.com
            </span>
            <span>Location: 2nd Floor, Navalur, Chennai</span>
            <span>Duration: 45 Minutes strictly</span>
          </div>
        </div>

        {/* Template Previews Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-base">Email Template Inspection</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Inspect the exact HTML emails delivered to parents formatted according to clinical PRD
              specifications.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleOpenPreview('booking_confirmation')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 text-xs font-medium text-slate-700 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  <span>1. Booking Confirmation (Immediate)</span>
                </div>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleOpenPreview('reminder_2days')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-xs font-medium text-slate-700 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>2. 2-Day Reminder (Pre-Session)</span>
                </div>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleOpenPreview('feedback_1day')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs font-medium text-slate-700 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>3. 1-Day Feedback Request</span>
                </div>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
            Resend SDK v60 &middot; Firestore collection: <code className="text-teal-600 font-mono">emailLogs</code>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Firestore Email Logs & Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live updates from <code className="text-teal-600 font-mono">emailLogs</code> collection
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="all">All Email Types</option>
              <option value="booking_confirmation">Booking Confirmation</option>
              <option value="reminder_2days">2-Day Reminder</option>
              <option value="feedback_1day">1-Day Feedback</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="scheduled">Scheduled</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Mail className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No email log records found</p>
            <p className="text-xs text-slate-400 mt-1">
              Create a new session or click &ldquo;Trigger Sequence Now&rdquo; to send the first confirmation email.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {log.emailType === 'booking_confirmation' && (
                          <span className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-semibold">
                            Booking Confirmed
                          </span>
                        )}
                        {log.emailType === 'reminder_2days' && (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                            2-Day Reminder
                          </span>
                        )}
                        {log.emailType === 'feedback_1day' && (
                          <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold">
                            1-Day Feedback
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {log.recipientName || 'Parent'}
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          {log.recipientEmail}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {log.sessionId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-[240px] truncate" title={log.subject}>
                        {log.subject || 'Session Update'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {log.status === 'sent' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Sent
                          </span>
                        )}
                        {log.status === 'scheduled' && (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            <Clock className="w-3 h-3" />
                            Scheduled
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span
                            className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-medium"
                            title={log.error || 'Failed'}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HTML Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{previewModal.subject}</h4>
                <p className="text-xs text-slate-500 mt-0.5">Sender: connect@drsweetybhatnagar.com</p>
              </div>
              <button
                onClick={() => setPreviewModal({ ...previewModal, isOpen: false })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <div
                className="bg-white rounded-xl shadow-xs overflow-hidden"
                dangerouslySetInnerHTML={{ __html: previewModal.html }}
              />
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Standard Nurturing Minds Email Template</span>
              <button
                onClick={() => setPreviewModal({ ...previewModal, isOpen: false })}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
