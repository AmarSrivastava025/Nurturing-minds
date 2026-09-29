import React, { useEffect, useState } from 'react';
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
  Users,
  Search,
  Filter,
  Edit3,
  CheckCircle2,
  Calendar,
  User,
} from 'lucide-react';
import { EmailLog, Patient, Session, Therapist } from '../../types';
import { store } from '../../services/store';
import {
  formatAppointmentDate,
  generateBookingConfirmationHtml,
  generateReminderEmailHtml,
  generateFeedbackEmailHtml,
  CLINIC_LOCATION,
  processSessionEmailSequence,
  checkAndSendScheduledEmails,
  fetchEmailServiceStatus,
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

  // Test sequence selection mode: 'patient' or 'session'
  const [testMode, setTestMode] = useState<'patient' | 'session'>('patient');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    patients.length > 0 ? patients[0].id : ''
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions.length > 0 ? sessions[0].id : ''
  );

  // Patient directory search and filter
  const [patientSearch, setPatientSearch] = useState('');
  const [patientEmailFilter, setPatientEmailFilter] = useState<'all' | 'configured' | 'missing'>('all');

  // Quick Email Edit Modal
  const [quickEmailModal, setQuickEmailModal] = useState<{
    isOpen: boolean;
    patient: Patient | null;
    emailValue: string;
  }>({
    isOpen: false,
    patient: null,
    emailValue: '',
  });

  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(
    null
  );

  const [emailService, setEmailService] = useState<{
    online: boolean;
    resendConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchEmailServiceStatus().then((status) => {
      if (isMounted) setEmailService(status);
    });
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Patient Email Status Breakdown
  const patientsWithEmail = patients.filter(
    (p) => p.parentEmail && p.parentEmail.trim().includes('@')
  );
  const patientsMissingEmail = patients.filter(
    (p) => !p.parentEmail || !p.parentEmail.trim().includes('@')
  );

  // Filtered patients for directory
  const filteredPatients = patients.filter((p) => {
    const searchLower = patientSearch.toLowerCase();
    const matchesSearch =
      p.childName.toLowerCase().includes(searchLower) ||
      p.motherName.toLowerCase().includes(searchLower) ||
      p.fatherName.toLowerCase().includes(searchLower) ||
      (p.parentEmail && p.parentEmail.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    const hasEmail = Boolean(p.parentEmail && p.parentEmail.trim().includes('@'));
    if (patientEmailFilter === 'configured') return hasEmail;
    if (patientEmailFilter === 'missing') return !hasEmail;
    return true;
  });

  // Filter logs
  const filteredLogs = emailLogs.filter((log) => {
    if (filterType !== 'all' && log.emailType !== filterType) return false;
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    return true;
  });

  // Selected patient object for test card
  const activeTestPatient =
    patients.find((p) => p.id === selectedPatientId) || patients[0] || null;
  const activeAssignedTherapist = activeTestPatient
    ? therapists.find((t) => t.id === activeTestPatient.assignedTherapistId)
    : null;

  const handleOpenQuickEmail = (patient: Patient) => {
    setQuickEmailModal({
      isOpen: true,
      patient,
      emailValue: patient.parentEmail || '',
    });
  };

  const handleSaveQuickEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEmailModal.patient) return;
    const cleanEmail = quickEmailModal.emailValue.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setActionMessage({ text: 'Please enter a valid email address with an @ symbol.', isError: true });
      return;
    }

    store.updatePatient(quickEmailModal.patient.id, {
      parentEmail: cleanEmail,
      parentLoginId: cleanEmail,
    });

    setActionMessage({
      text: `Successfully registered parent email "${cleanEmail}" for ${quickEmailModal.patient.childName}. Automation is now ready!`,
    });
    setQuickEmailModal({ isOpen: false, patient: null, emailValue: '' });
  };

  const handleTriggerTest = async () => {
    setIsProcessing(true);
    setActionMessage({ text: 'Executing email confirmation sequence...' });

    try {
      if (testMode === 'patient') {
        if (!activeTestPatient) {
          setActionMessage({ text: 'Please select a patient first.', isError: true });
          setIsProcessing(false);
          return;
        }

        if (!activeTestPatient.parentEmail || !activeTestPatient.parentEmail.includes('@')) {
          setActionMessage({
            text: `Cannot trigger sequence: ${activeTestPatient.childName} does not have a registered parent email. Please click "+ Add Email" below to set it.`,
            isError: true,
          });
          handleOpenQuickEmail(activeTestPatient);
          setIsProcessing(false);
          return;
        }

        // Find existing session or create an initial upcoming session for this patient
        let targetSession = sessions.find((s) => s.patientId === activeTestPatient.id);
        if (!targetSession) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(16, 0, 0, 0);

          targetSession = store.createSession({
            patientId: activeTestPatient.id,
            therapistId: activeTestPatient.assignedTherapistId || therapists[0]?.id || 'th-1',
            scheduledAt: tomorrow.toISOString(),
            status: 'scheduled',
            timeSlot: '04:00 PM - 04:45 PM',
            durationMinutes: 45,
          });
        }

        const res = await processSessionEmailSequence(
          targetSession.id,
          targetSession,
          activeTestPatient,
          activeAssignedTherapist || undefined
        );

        if (res.success) {
          setActionMessage({
            text: `Success: Booking confirmation dispatched to ${activeTestPatient.parentEmail} for ${activeTestPatient.childName}, and 2-day reminder / 1-day feedback queued.`,
          });
        } else {
          setActionMessage({
            text: `Notice: ${res.message || 'Operation finished'}. Check log details below.`,
            isError: !res.success,
          });
        }
      } else {
        // By Session Mode
        if (!selectedSessionId) {
          setActionMessage({ text: 'Please select a session first.', isError: true });
          setIsProcessing(false);
          return;
        }

        const session = sessions.find((s) => s.id === selectedSessionId);
        const pat = session ? patients.find((p) => p.id === session.patientId) : undefined;
        const th = session ? therapists.find((t) => t.id === session.therapistId) : undefined;

        if (pat && (!pat.parentEmail || !pat.parentEmail.includes('@'))) {
          setActionMessage({
            text: `Cannot trigger sequence: Parent email is missing for ${pat.childName}. Please click "+ Add Email" to configure.`,
            isError: true,
          });
          handleOpenQuickEmail(pat);
          setIsProcessing(false);
          return;
        }

        const res = await processSessionEmailSequence(selectedSessionId, session, pat, th);

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
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                  emailService?.resendConfigured
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {emailService === null
                  ? 'Checking email service...'
                  : emailService.resendConfigured
                  ? 'Resend API Ready'
                  : 'Resend API Not Configured'}
              </span>
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
                {patients.length} Registered Patients
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Mail className="w-6 h-6 text-teal-400" />
              Automated Email Confirmation Sequence
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Delivers 3 automated emails to enrolled families: Immediate Booking Confirmation, 2-Day Pre-Session Reminder, and 1-Day Post-Session Feedback Request.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunScheduledCheck}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              Run Scheduled Check
            </button>
          </div>
        </div>
      </div>

      {/* Action Notice Message Banner */}
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
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-sm p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Missing Email Alert Banner */}
      {patientsMissingEmail.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Action Required: {patientsMissingEmail.length} patient(s) do not have a parent email registered.
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Automated booking confirmations and reminders will fail for:{' '}
                <strong>
                  {patientsMissingEmail
                    .map((p) => p.childName)
                    .slice(0, 3)
                    .join(', ')}
                  {patientsMissingEmail.length > 3 ? ` and ${patientsMissingEmail.length - 3} more` : ''}
                </strong>
                .
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setPatientEmailFilter('missing');
              const el = document.getElementById('patient-email-directory');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
          >
            Review &amp; Add Emails
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
          <p className="text-xs text-slate-500 mt-1">2-Day Reminders &amp; Feedback</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Email Coverage</span>
            <Users className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-teal-600">
            {patients.length > 0
              ? `${Math.round((patientsWithEmail.length / patients.length) * 100)}%`
              : '100%'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {patientsWithEmail.length} of {patients.length} parents with email
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">{successRate}%</div>
          <p className="text-xs text-slate-500 mt-1">&lt;2% Bounce target</p>
        </div>
      </div>

      {/* Manual Test & Template Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Trigger Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-800 text-base">Test Automated Email Sequence</h3>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTestMode('patient')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  testMode === 'patient'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Registered Patient ({patients.length})
              </button>
              <button
                type="button"
                onClick={() => setTestMode('session')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  testMode === 'session'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Booked Session ({sessions.length})
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-4">
            {testMode === 'patient'
              ? 'Select any patient from your roster. The system dispatches Email 1 (Booking Confirmation) directly to the parent, and schedules Email 2 (2-Day Reminder) and Email 3 (Feedback) in Firestore.'
              : 'Select any clinic session from the calendar schedule to test the email dispatch pipeline.'}
          </p>

          {/* Test Selector */}
          {testMode === 'patient' ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full sm:flex-1 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white"
                >
                  {patients.map((pat) => {
                    const th = therapists.find((t) => t.id === pat.assignedTherapistId);
                    return (
                      <option key={pat.id} value={pat.id}>
                        {pat.childName} — {pat.motherName || pat.fatherName || 'Parent'} |{' '}
                        {pat.parentEmail ? `✉️ ${pat.parentEmail}` : '⚠️ NO EMAIL REGISTERED'} |{' '}
                        {th?.name || 'Therapist'}
                      </option>
                    );
                  })}
                </select>

                <button
                  onClick={handleTriggerTest}
                  disabled={isProcessing || !selectedPatientId}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Trigger Sequence Now
                </button>
              </div>

              {/* Status Box for Active Patient */}
              {activeTestPatient && (
                <div
                  className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                    activeTestPatient.parentEmail
                      ? 'bg-teal-50/70 border-teal-200 text-teal-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {activeTestPatient.parentEmail ? (
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {activeTestPatient.parentEmail ? (
                        <>
                          Target Parent Email: <strong>{activeTestPatient.parentEmail}</strong> (
                          {activeTestPatient.motherName || activeTestPatient.fatherName}) &middot; Therapist:{' '}
                          <strong>{activeAssignedTherapist?.name || 'Assigned Therapist'}</strong>
                        </>
                      ) : (
                        <>
                          <strong>{activeTestPatient.childName}</strong> has no email address configured.
                          Cannot deliver email automation.
                        </>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenQuickEmail(activeTestPatient)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer ${
                      activeTestPatient.parentEmail
                        ? 'text-teal-700 bg-teal-100/60 hover:bg-teal-200/80'
                        : 'text-white bg-amber-600 hover:bg-amber-700 shadow-2xs'
                    }`}
                  >
                    {activeTestPatient.parentEmail ? 'Edit Email' : '+ Enter Email Now'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white"
              >
                {sessions.map((ses) => {
                  const pat = patients.find((p) => p.id === ses.patientId);
                  const th = therapists.find((t) => t.id === ses.therapistId);
                  return (
                    <option key={ses.id} value={ses.id}>
                      {ses.id} — {pat?.childName || 'Child'} ({pat?.motherName || 'Parent'}) |{' '}
                      {pat?.parentEmail ? pat.parentEmail : '⚠️ No email'} |{' '}
                      {formatAppointmentDate(ses.scheduledAt)} ({ses.timeSlot || '45m'}) |{' '}
                      {th?.name || 'Therapist'}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={handleTriggerTest}
                disabled={isProcessing || !selectedSessionId}
                className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Trigger Sequence Now
              </button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              From: connect@drsweetybhatnagar.com
            </span>
            <span>Location: {CLINIC_LOCATION}</span>
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
              Inspect the exact HTML emails delivered to parents formatted according to clinical PRD specifications.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleOpenPreview('booking_confirmation')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 text-xs font-medium text-slate-700 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  <span>1. Booking Confirmation (Immediate)</span>
                </div>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleOpenPreview('reminder_2days')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-xs font-medium text-slate-700 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>2. 2-Day Reminder (Pre-Session)</span>
                </div>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleOpenPreview('feedback_1day')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs font-medium text-slate-700 flex items-center justify-between transition-all cursor-pointer"
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
            Resend SDK v6 &middot; server-side sending &middot; Firestore collection: <code className="text-teal-600 font-mono">emailLogs</code>
          </div>
        </div>
      </div>

      {/* Registered Patients & Email Automation Directory Section */}
      <div id="patient-email-directory" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-800 text-base">
                Registered Patients &amp; Email Automation Roster
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and manage parent email addresses for all enrolled children. Trigger test confirmation sequences directly for any patient.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search child, parent, or email..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-teal-500 w-48 sm:w-56"
              />
            </div>

            {/* Email Filter Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setPatientEmailFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  patientEmailFilter === 'all'
                    ? 'bg-white text-slate-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({patients.length})
              </button>
              <button
                type="button"
                onClick={() => setPatientEmailFilter('configured')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  patientEmailFilter === 'configured'
                    ? 'bg-white text-teal-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Configured ({patientsWithEmail.length})
              </button>
              <button
                type="button"
                onClick={() => setPatientEmailFilter('missing')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  patientEmailFilter === 'missing'
                    ? 'bg-white text-rose-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Missing ({patientsMissingEmail.length})
              </button>
            </div>
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No patients found matching your search</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Child Patient</th>
                  <th className="py-3 px-4">Parent / Contact</th>
                  <th className="py-3 px-4">Registered Parent Email</th>
                  <th className="py-3 px-4">Therapist &amp; Schedule</th>
                  <th className="py-3 px-4">Automations</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((pat) => {
                  const th = therapists.find((t) => t.id === pat.assignedTherapistId);
                  const patientLogs = emailLogs.filter(
                    (l) =>
                      l.recipientEmail === pat.parentEmail ||
                      sessions.some((s) => s.patientId === pat.id && s.id === l.sessionId)
                  );
                  const hasEmail = Boolean(pat.parentEmail && pat.parentEmail.trim().includes('@'));

                  return (
                    <tr key={pat.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {pat.childName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{pat.childName}</div>
                            <div className="text-[11px] text-slate-400">
                              Age {pat.age} &middot; Blood {pat.bloodGroup}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {pat.motherName || pat.fatherName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {pat.motherContact || pat.fatherContact}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {hasEmail ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-slate-800 font-semibold bg-slate-100/80 px-2.5 py-1 rounded-lg">
                              <Mail className="w-3 h-3 text-teal-600" />
                              {pat.parentEmail}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenQuickEmail(pat)}
                              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              No Email Configured
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenQuickEmail(pat)}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-bold transition shadow-2xs cursor-pointer"
                            >
                              + Add Email
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{th?.name || 'Assigned OT'}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {pat.sessionTiming}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                          <Send className="w-2.5 h-2.5 text-slate-400" />
                          {patientLogs.length} events logged
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPatientId(pat.id);
                              setTestMode('patient');
                              const el = document.querySelector('select');
                              el?.focus();
                              handleTriggerTest();
                            }}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                            title="Trigger 3-email sequence immediately"
                          >
                            Send Sequence
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickEmail(pat)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Update parent email"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Firestore Email Logs &amp; Audit Trail</h3>
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
              Select a patient above or click &ldquo;Trigger Sequence Now&rdquo; to send the first confirmation email.
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
                        <div className="text-slate-500 text-[11px] font-mono">
                          {log.recipientEmail}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {log.sessionId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-[240px] truncate" title={log.subject}>
                        {log.subject}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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

      {/* Quick Email Edit Modal */}
      {quickEmailModal.isOpen && quickEmailModal.patient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Configure Email: {quickEmailModal.patient.childName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Parent: {quickEmailModal.patient.motherName || quickEmailModal.patient.fatherName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickEmailModal({ isOpen: false, patient: null, emailValue: '' })}
                className="text-slate-400 hover:text-slate-600 text-base font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickEmail} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block text-xs mb-1">
                  Parent / Guardian Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="e.g. parent.name@example.com"
                    value={quickEmailModal.emailValue}
                    onChange={(e) =>
                      setQuickEmailModal({ ...quickEmailModal, emailValue: e.target.value })
                    }
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  All automated appointment confirmations, reminders, and feedback links will be dispatched to this inbox.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickEmailModal({ isOpen: false, patient: null, emailValue: '' })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs cursor-pointer"
                >
                  Save Email &amp; Enable Automation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
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
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 cursor-pointer"
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
