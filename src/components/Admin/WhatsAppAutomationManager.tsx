import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Phone,
  ShieldCheck,
  UserCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Search,
  Filter,
  ArrowUpRight,
  Share2,
} from 'lucide-react';
import { store } from '../../services/store';
import { MessageLog, Session, Patient, Therapist } from '../../types';
import {
  cleanPhoneNumber,
  createWhatsAppDirectUrl,
  generate24hReminderText,
  generate2hReminderText,
  generateTherapistSwapAlertText,
  generateBookingAlertText,
  formatMessageDate,
  CLINIC_NAME,
  CLINIC_LOCATION,
  CLINIC_PHONE,
  CLINIC_DIRECTOR,
} from '../../services/automation/whatsapp-sms-service';

interface WhatsAppAutomationManagerProps {
  messageLogs?: MessageLog[];
  sessions?: Session[];
  patients?: Patient[];
  therapists?: Therapist[];
}

export const WhatsAppAutomationManager: React.FC<WhatsAppAutomationManagerProps> = ({
  messageLogs: propMessageLogs,
  sessions: propSessions,
  patients: propPatients,
  therapists: propTherapists,
}) => {
  const storeState = store.getState();
  const sessions = propSessions || storeState.sessions || [];
  const patients = propPatients || storeState.patients || [];
  const therapists = propTherapists || storeState.therapists || [];
  const messageLogs = propMessageLogs || storeState.messageLogs || [];

  // Selected session for manual testing
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id || ''
  );
  const [selectedMessageType, setSelectedMessageType] = useState<
    'reminder_24h' | 'reminder_2h' | 'therapist_swap' | 'booking_alert'
  >('reminder_24h');
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [selectedSwapTherapistId, setSelectedSwapTherapistId] = useState<string>(
    therapists[0]?.id || ''
  );
  const [swapReason, setSwapReason] = useState<string>('Clinical schedule realignment');

  // Trigger state
  const [isSending, setIsSending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Template Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<
    'reminder_24h' | 'reminder_2h' | 'therapist_swap' | 'booking_alert' | null
  >(null);

  // Filters for Audit Logs
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');

  // Active selected session details
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null;
  }, [sessions, selectedSessionId]);

  const activePatient = useMemo(() => {
    if (!activeSession) return null;
    return patients.find((p) => p.id === activeSession.patientId) || null;
  }, [activeSession, patients]);

  const activeTherapist = useMemo(() => {
    if (!activeSession) return null;
    return therapists.find((t) => t.id === activeSession.therapistId) || null;
  }, [activeSession, therapists]);

  // Derive recipient phone & name
  const recipientInfo = useMemo(() => {
    if (!activePatient) return { name: 'Parent', phone: '', cleanPhone: '' };
    const isFather = activePatient.primaryContact === 'father';
    const name = isFather
      ? activePatient.fatherName || 'Parent'
      : activePatient.motherName || 'Parent';
    const rawPhone = isFather
      ? activePatient.fatherContact || activePatient.motherContact || ''
      : activePatient.motherContact || activePatient.fatherContact || '';
    const { formatted } = cleanPhoneNumber(rawPhone);
    return { name, phone: rawPhone, cleanPhone: formatted };
  }, [activePatient]);

  // Dynamic preview text for current settings
  const currentPreviewMessage = useMemo(() => {
    if (!activeSession || !activePatient) return '';
    const therapistName =
      selectedMessageType === 'therapist_swap'
        ? therapists.find((t) => t.id === selectedSwapTherapistId)?.name || 'Dr. Sweety Bhatnagar'
        : activeTherapist?.name || 'Dr. Sweety Bhatnagar';

    if (selectedMessageType === 'reminder_24h') {
      return generate24hReminderText({
        parentName: recipientInfo.name,
        childName: activePatient.childName,
        scheduledAt: activeSession.scheduledAt,
        timeSlot: activeSession.timeSlot || '45-Minute Therapy Slot',
        therapistName,
      });
    } else if (selectedMessageType === 'reminder_2h') {
      return generate2hReminderText({
        parentName: recipientInfo.name,
        childName: activePatient.childName,
        timeSlot: activeSession.timeSlot || '45-Minute Therapy Slot',
        therapistName,
      });
    } else if (selectedMessageType === 'therapist_swap') {
      return generateTherapistSwapAlertText({
        parentName: recipientInfo.name,
        childName: activePatient.childName,
        timeSlot: activeSession.timeSlot || '45-Minute Therapy Slot',
        newTherapistName: therapistName,
        reason: swapReason,
      });
    } else {
      return generateBookingAlertText({
        parentName: recipientInfo.name,
        childName: activePatient.childName,
        scheduledAt: activeSession.scheduledAt,
        timeSlot: activeSession.timeSlot || '45-Minute Therapy Slot',
        therapistName,
      });
    }
  }, [
    activeSession,
    activePatient,
    activeTherapist,
    selectedMessageType,
    selectedSwapTherapistId,
    swapReason,
    therapists,
    recipientInfo,
  ]);

  // Direct WhatsApp Web / Mobile Link
  const directWhatsAppLink = useMemo(() => {
    if (!recipientInfo.phone || !currentPreviewMessage) return '';
    return createWhatsAppDirectUrl(recipientInfo.phone, currentPreviewMessage);
  }, [recipientInfo.phone, currentPreviewMessage]);

  // Metrics
  const stats = useMemo(() => {
    const totalSent = messageLogs.filter((l) => l.status === 'sent').length;
    const totalScheduled = messageLogs.filter((l) => l.status === 'scheduled').length;
    const swapAlerts = messageLogs.filter((l) => l.messageType === 'therapist_swap').length;
    const totalAttempted = messageLogs.filter((l) => l.status === 'sent' || l.status === 'failed').length;
    const successRate = totalAttempted > 0 ? Math.round((totalSent / totalAttempted) * 100) : 100;

    return { totalSent, totalScheduled, swapAlerts, successRate, totalLogs: messageLogs.length };
  }, [messageLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return messageLogs.filter((log) => {
      const matchesSearch =
        (log.recipientName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.childName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.recipientPhone || '').includes(searchQuery) ||
        (log.sessionId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.body || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'all' || log.messageType === filterType;
      const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
      const matchesChannel = filterChannel === 'all' || log.channel === filterChannel;

      return matchesSearch && matchesType && matchesStatus && matchesChannel;
    });
  }, [messageLogs, searchQuery, filterType, filterStatus, filterChannel]);

  // Handler: Trigger Automation Now
  const handleTriggerMessage = async () => {
    if (!activeSession) return;
    setIsSending(true);
    setActionFeedback(null);

    try {
      let result;
      if (selectedMessageType === 'therapist_swap') {
        const { triggerTherapistSwapWhatsAppAlert } = await import(
          '../../services/automation/whatsapp-sms-service'
        );
        result = await triggerTherapistSwapWhatsAppAlert({
          sessionId: activeSession.id,
          newTherapistId: selectedSwapTherapistId,
          reason: swapReason,
          channel: selectedChannel,
        });
      } else {
        result = await store.triggerSessionWhatsAppSequence(activeSession.id, {
          customType: selectedMessageType,
          channel: selectedChannel,
        });
      }

      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: `Automated ${selectedChannel.toUpperCase()} alert sent successfully to ${recipientInfo.name} (${recipientInfo.cleanPhone || recipientInfo.phone})!`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: result.error || 'Failed to dispatch alert. Check phone configuration.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred during dispatch.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-purple-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold mb-2 backdrop-blur-xs border border-emerald-400/30">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Service 4: WhatsApp & SMS Automation</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Parent WhatsApp & SMS Automation Center
            </h1>
            <p className="text-emerald-100/90 text-sm mt-1 max-w-2xl">
              Automated 24h & 2h pre-session appointment reminders, urgent therapist cover alerts,
              and 1-click direct parent WhatsApp messaging for Dr. Sweety Bhatnagar's practice.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-medium border border-white/20">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Clinic: {CLINIC_LOCATION}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Messages Delivered
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">{stats.totalSent}</div>
          <p className="text-xs text-slate-500 mt-1">Direct to parent mobile numbers</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Scheduled Queue
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">{stats.totalScheduled}</div>
          <p className="text-xs text-slate-500 mt-1">24h & 2h pre-session reminders</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Emergency Swap Alerts
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">{stats.swapAlerts}</div>
          <p className="text-xs text-slate-500 mt-1">Instant continuity notices</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Delivery Success
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">{stats.successRate}%</div>
          <p className="text-xs text-slate-500 mt-1">Total tracked events: {stats.totalLogs}</p>
        </div>
      </div>

      {/* Main Interactive Testing & Trigger Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dispatch Controls */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Trigger Automated WhatsApp / SMS Alert
                </h2>
                <p className="text-xs text-slate-500">
                  Select a session and message type to simulate or trigger immediate delivery
                </p>
              </div>
            </div>
          </div>

          {/* Feedback Banner */}
          {actionFeedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{actionFeedback.message}</span>
              </div>
              <button
                onClick={() => setActionFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                &times;
              </button>
            </div>
          )}

          {/* 1. Select Session */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Select Clinic Session
            </label>
            <div className="relative">
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full text-xs font-medium text-slate-800 bg-slate-50/80 border border-slate-300 rounded-xl px-3.5 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {sessions.map((s) => {
                  const pat = patients.find((p) => p.id === s.patientId);
                  const th = therapists.find((t) => t.id === s.therapistId);
                  const dateStr = formatMessageDate(s.scheduledAt);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.id} — {pat?.childName || 'Child'} ({pat?.motherName || pat?.fatherName || 'Parent'}) | {dateStr} ({s.timeSlot || '45m'}) | {th?.name || 'Dr Sweety'}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* Recipient Details Chip */}
            {activePatient && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 mt-2">
                <div>
                  <span className="font-semibold text-emerald-950">Recipient: </span>
                  <span className="text-emerald-800">
                    {recipientInfo.name} (Parent of <strong>{activePatient.childName}</strong>)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-900 font-mono font-bold">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{recipientInfo.cleanPhone || recipientInfo.phone || 'No phone on file'}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Message Type & Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Message Alert Type
              </label>
              <select
                value={selectedMessageType}
                onChange={(e) => setSelectedMessageType(e.target.value as any)}
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="reminder_24h">24-Hour Pre-Session Reminder</option>
                <option value="reminder_2h">2-Hour Urgent Session Reminder</option>
                <option value="therapist_swap">Emergency Therapist Swap Notice</option>
                <option value="booking_alert">Booking Confirmation Alert</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Dispatch Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChannel('whatsapp')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                    selectedChannel === 'whatsapp'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChannel('sms')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                    selectedChannel === 'sms'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>SMS</span>
                </button>
              </div>
            </div>
          </div>

          {/* Conditional Options for Therapist Swap */}
          {selectedMessageType === 'therapist_swap' && (
            <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                <RefreshCw className="w-4 h-4 text-purple-700" />
                <span>Substitute Therapist Configuration</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-purple-900">
                    Assigned Substitute Therapist
                  </label>
                  <select
                    value={selectedSwapTherapistId}
                    onChange={(e) => setSelectedSwapTherapistId(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 mt-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {therapists.map((th) => (
                      <option key={th.id} value={th.id}>
                        {th.name} ({th.qualification})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-purple-900">
                    Reason for Notice
                  </label>
                  <input
                    type="text"
                    value={swapReason}
                    onChange={(e) => setSwapReason(e.target.value)}
                    placeholder="e.g. Clinical schedule realignment"
                    className="w-full text-xs font-medium text-slate-800 bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 mt-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={handleTriggerMessage}
              disabled={isSending || !activeSession}
              className="flex-1 min-w-[200px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching {selectedChannel.toUpperCase()}...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Automated {selectedChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</span>
                </>
              )}
            </button>

            {/* Direct 1-Click WhatsApp Parent Launcher */}
            {directWhatsAppLink && (
              <a
                href={directWhatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                title="Open WhatsApp Web or Mobile App with pre-filled message"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>Open in WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        {/* Right Column: Live Message Preview in Phone Bubble */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Live WhatsApp Message Preview
              </span>
            </div>
            <button
              onClick={() => setPreviewTemplate(selectedMessageType)}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
          </div>

          {/* WhatsApp Chat Simulated Screen */}
          <div className="flex-1 mt-4 rounded-xl bg-[#e5ddd5] p-3 sm:p-4 border border-slate-300 flex flex-col justify-end min-h-[300px] relative overflow-hidden shadow-inner">
            {/* Background doodle pattern subtle overlay */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(#128C7E 0.75px, transparent 0.75px), radial-gradient(#075E54 0.75px, #e5ddd5 0.75px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Clinic Sender Header */}
            <div className="bg-[#075e54] text-white p-2.5 rounded-lg mb-3 shadow-xs flex items-center justify-between text-xs z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                  NM
                </div>
                <div>
                  <div className="font-bold">{CLINIC_NAME}</div>
                  <div className="text-[10px] text-emerald-200">Official Clinical Care</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-200">Verified</span>
            </div>

            {/* WhatsApp Chat Bubble */}
            <div className="bg-[#dcf8c6] text-slate-800 p-3.5 rounded-2xl rounded-tr-none shadow-md text-xs leading-relaxed whitespace-pre-line z-10 max-w-[94%] ml-auto border border-emerald-200/50">
              {currentPreviewMessage}
              <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-2 font-mono">
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-emerald-700 font-bold">✓✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Inspection Cards */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Pre-Configured Clinical Templates
            </h3>
            <p className="text-xs text-slate-500">
              Approved communication scripts with exact PRD parameters, clinic phone, and Navalur address
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            4 Templates Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div
            onClick={() => setPreviewTemplate('reminder_24h')}
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-emerald-700">
              <span>1. 24-Hour Reminder</span>
              <Eye className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-xs text-slate-500 mt-2 line-clamp-3">
              Friendly pre-session reminder with date, time, 45-min duration, and 5-min arrival recommendation.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-emerald-600">View Template &rarr;</div>
          </div>

          <div
            onClick={() => setPreviewTemplate('reminder_2h')}
            className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-amber-700">
              <span>2. 2-Hour Reminder</span>
              <Eye className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-xs text-slate-500 mt-2 line-clamp-3">
              Urgent session alert with OMR clinic address, comfort toy tip, and direct delay helpline.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-amber-600">View Template &rarr;</div>
          </div>

          <div
            onClick={() => setPreviewTemplate('therapist_swap')}
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-purple-700">
              <span>3. Therapist Swap Notice</span>
              <Eye className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-xs text-slate-500 mt-2 line-clamp-3">
              Immediate reassurance note with replacement therapist name and clinical continuity review confirmation.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-purple-600">View Template &rarr;</div>
          </div>

          <div
            onClick={() => setPreviewTemplate('booking_alert')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-blue-700">
              <span>4. Booking Confirmed</span>
              <Eye className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-xs text-slate-500 mt-2 line-clamp-3">
              Instant appointment confirmation sent as soon as Dr. Sweety or admin schedules a new therapy slot.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-blue-600">View Template &rarr;</div>
          </div>
        </div>
      </div>

      {/* Audit Trail & Message Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Firestore Message Logs & Real-Time Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Synchronized live from the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">messageLogs</code> collection
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                Showing {filteredLogs.length} of {messageLogs.length} logs
              </span>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search parent, child, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Message Types</option>
                <option value="reminder_24h">24-Hour Reminder</option>
                <option value="reminder_2h">2-Hour Reminder</option>
                <option value="therapist_swap">Therapist Swap Alert</option>
                <option value="booking_alert">Booking Confirmation</option>
              </select>
            </div>

            <div>
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Channels</option>
                <option value="whatsapp">WhatsApp Only</option>
                <option value="sms">SMS Only</option>
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="scheduled">Scheduled</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Type / Channel</th>
                <th className="py-3 px-4">Recipient & Child</th>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">Message Snippet</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No message logs found. Trigger a test message above to generate your first log!
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const typeLabel =
                    log.messageType === 'reminder_24h'
                      ? '24h Reminder'
                      : log.messageType === 'reminder_2h'
                      ? '2h Reminder'
                      : log.messageType === 'therapist_swap'
                      ? 'Therapist Swap'
                      : 'Booking Confirmed';

                  const badgeColor =
                    log.messageType === 'therapist_swap'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : log.messageType === 'reminder_2h'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  const waLink = createWhatsAppDirectUrl(log.recipientPhone, log.body);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center w-max px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}
                          >
                            {typeLabel}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {log.channel}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{log.recipientName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {log.recipientPhone}
                        </div>
                        {log.childName && (
                          <div className="text-[10px] text-purple-700 font-medium">
                            Child: {log.childName}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {log.sessionId}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-[11px] text-slate-600 line-clamp-2" title={log.body}>
                          {log.body}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <div>
                          {new Date(log.sentAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.sentAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {log.status === 'sent' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Sent</span>
                          </span>
                        )}
                        {log.status === 'scheduled' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            <Clock className="w-3 h-3" />
                            <span>Scheduled</span>
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold"
                            title={log.error || 'Delivery failed'}
                          >
                            <AlertCircle className="w-3 h-3" />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {log.recipientPhone && log.recipientPhone !== 'MISSING' && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition"
                            title="Open direct WhatsApp conversation with parent"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Chat</span>
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {previewTemplate === 'reminder_24h'
                    ? '24-Hour Pre-Session Reminder'
                    : previewTemplate === 'reminder_2h'
                    ? '2-Hour Urgent Session Reminder'
                    : previewTemplate === 'therapist_swap'
                    ? 'Emergency Therapist Swap Notice'
                    : 'Booking Confirmation Alert'}
                </h3>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="bg-[#e5ddd5] p-4 rounded-xl border border-slate-300">
              <div className="bg-[#dcf8c6] text-slate-800 p-4 rounded-2xl rounded-tr-none shadow-sm text-xs leading-relaxed whitespace-pre-line">
                {previewTemplate === 'reminder_24h' &&
                  generate24hReminderText({
                    parentName: 'Priya Sharma',
                    childName: 'Aarav Sharma',
                    scheduledAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                    timeSlot: '04:00 PM - 04:45 PM',
                    therapistName: 'Ritu Verma',
                  })}

                {previewTemplate === 'reminder_2h' &&
                  generate2hReminderText({
                    parentName: 'Priya Sharma',
                    childName: 'Aarav Sharma',
                    timeSlot: '04:00 PM - 04:45 PM',
                    therapistName: 'Ritu Verma',
                  })}

                {previewTemplate === 'therapist_swap' &&
                  generateTherapistSwapAlertText({
                    parentName: 'Priya Sharma',
                    childName: 'Aarav Sharma',
                    timeSlot: '04:00 PM - 04:45 PM',
                    newTherapistName: 'Dr. Sweety Bhatnagar',
                    reason: 'Therapist emergency cover',
                  })}

                {previewTemplate === 'booking_alert' &&
                  generateBookingAlertText({
                    parentName: 'Priya Sharma',
                    childName: 'Aarav Sharma',
                    scheduledAt: new Date().toISOString(),
                    timeSlot: '04:00 PM - 04:45 PM',
                    therapistName: 'Ritu Verma',
                  })}

                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-2 font-mono">
                  <span>10:30 AM</span>
                  <span className="text-emerald-700 font-bold">✓✓</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition cursor-pointer"
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
