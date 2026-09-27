import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
  Sliders,
  Settings,
  ListFilter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Patient, Session, Therapist } from '../../types';
import { store } from '../../services/store';
import { DailySlotPlanner } from './DailySlotPlanner';
import { WeeklySlotConfigModal } from './WeeklySlotConfigModal';
import { LastMinuteTherapistSwapModal } from './LastMinuteTherapistSwapModal';
import { calculate45MinEndTime, format45MinSlotLabel, formatTime12h } from '../../utils/slotUtils';

interface SchedulingManagerProps {
  sessions: Session[];
  patients: Patient[];
  therapists: Therapist[];
}

export const SchedulingManager: React.FC<SchedulingManagerProps> = ({
  sessions,
  patients,
  therapists,
}) => {
  const [viewMode, setViewMode] = useState<'planner' | 'table'>('planner');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWeeklyConfigModal, setShowWeeklyConfigModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [swapSession, setSwapSession] = useState<Session | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);

  // Search & Filter State for Master Table
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTherapist, setFilterTherapist] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form State for Session Booking Modal
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>(therapists[0]?.id || '');
  const [slotDate, setSlotDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slotTime, setSlotTime] = useState<string>('16:00');
  const [slotLabel, setSlotLabel] = useState<string>('04:00 PM - 04:45 PM');
  const [slotStatus, setSlotStatus] = useState<Session['status']>('scheduled');
  const [selectedSlotPreset, setSelectedSlotPreset] = useState<string>('custom');

  const getPatient = (id: string) => patients.find((p) => p.id === id);
  const getTherapist = (id: string) => therapists.find((t) => t.id === id);

  // Available fixed slots for the selected date in modal
  const dailyConfig = store.getDailySlotConfig(slotDate);
  const daySlots = dailyConfig?.slots || [];

  // When slotTime changes, recalculate the strict 45-minute label
  const handleStartTimeChange = (newStartTime: string) => {
    setSlotTime(newStartTime);
    const newLabel = format45MinSlotLabel(newStartTime);
    setSlotLabel(newLabel);
    setSelectedSlotPreset('custom');
  };

  // When user selects a preset 45-min slot from today's fixed slots
  const handleSlotPresetSelect = (presetVal: string) => {
    setSelectedSlotPreset(presetVal);
    if (presetVal !== 'custom') {
      const matched = daySlots.find((s) => s.id === presetVal);
      if (matched) {
        setSlotTime(matched.startTime);
        setSlotLabel(matched.timeSlotLabel);
      }
    }
  };

  // Open modal from planner slot card
  const handleOpenScheduleModal = (params?: {
    date: string;
    timeSlotLabel: string;
    startTime: string;
  }) => {
    setEditingSession(null);
    if (params) {
      setSlotDate(params.date);
      if (params.startTime) {
        setSlotTime(params.startTime);
        setSlotLabel(params.timeSlotLabel || format45MinSlotLabel(params.startTime));
      } else {
        setSlotTime('16:00');
        setSlotLabel('04:00 PM - 04:45 PM');
      }
    } else {
      setSlotDate(selectedDate);
      setSlotTime('16:00');
      setSlotLabel('04:00 PM - 04:45 PM');
    }
    setSlotStatus('scheduled');
    setSelectedSlotPreset('custom');
    setShowAddModal(true);
  };

  const handleOpenEditSession = (session: Session) => {
    setEditingSession(session);
    setSelectedPatientId(session.patientId);
    setSelectedTherapistId(session.therapistId);
    try {
      const dateObj = new Date(session.scheduledAt);
      setSlotDate(dateObj.toISOString().split('T')[0]);
      const timePart = dateObj.toISOString().substring(11, 16);
      setSlotTime(timePart || '16:00');
    } catch {
      setSlotDate(new Date().toISOString().split('T')[0]);
      setSlotTime('16:00');
    }
    setSlotLabel(session.timeSlot || '04:00 PM - 04:45 PM');
    setSlotStatus(session.status);
    setSelectedSlotPreset('custom');
    setShowAddModal(true);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedTherapistId) {
      alert('Please select both a child patient and an assigned therapist.');
      return;
    }

    const fullScheduledAt = `${slotDate}T${slotTime}:00.000Z`;

    if (editingSession) {
      store.updateSession(editingSession.id, {
        patientId: selectedPatientId,
        therapistId: selectedTherapistId,
        scheduledAt: fullScheduledAt,
        timeSlot: slotLabel,
        status: slotStatus,
        durationMinutes: 45,
      });
      setEditingSession(null);
    } else {
      store.createSession({
        patientId: selectedPatientId,
        therapistId: selectedTherapistId,
        scheduledAt: fullScheduledAt,
        timeSlot: slotLabel,
        status: 'scheduled',
        durationMinutes: 45,
      });
    }

    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this scheduled session?')) {
      store.deleteSession(id);
    }
  };

  // Filtered Sessions for Master Table
  const filteredSessions = sessions.filter((s) => {
    const patient = getPatient(s.patientId);
    const childName = patient?.childName?.toLowerCase() || '';
    const parentName = `${patient?.motherName || ''} ${patient?.fatherName || ''}`.toLowerCase();
    const matchesSearch =
      childName.includes(searchTerm.toLowerCase()) ||
      parentName.includes(searchTerm.toLowerCase());

    const matchesTherapist =
      filterTherapist === 'all' || s.therapistId === filterTherapist;

    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;

    return matchesSearch && matchesTherapist && matchesStatus;
  });

  const sortedFilteredSessions = [...filteredSessions].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  return (
    <div className="space-y-5">
      {/* Sole Scheduling Authority Policy Banner */}
      <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-purple-100 text-[#6D0281] shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs text-purple-900 leading-relaxed">
          <div className="flex items-center gap-2">
            <p className="font-bold">Sole Scheduling Authority (Dr. Sweety Bhatnagar Exclusive Control):</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6D0281] text-white">
              Standard 45-Min Sessions
            </span>
          </div>
          <p className="mt-0.5 text-purple-800">
            Per practice policy, Dr. Bhatnagar is the sole authority to fix daily slot capacity,
            assign children to slots, or move appointments. Each clinical OT intervention is locked to
            45 minutes with a structured transition buffer.
          </p>
        </div>
      </div>

      {/* View Mode Switcher & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-white border border-purple-100/90 rounded-2xl shadow-2xs">
          <button
            onClick={() => setViewMode('planner')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              viewMode === 'planner'
                ? 'bg-[#6D0281] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Daily 45-Min Slot Planner
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              viewMode === 'table'
                ? 'bg-[#6D0281] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/50'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            Master Sessions List ({sessions.length})
          </button>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowWeeklyConfigModal(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-[#6D0281]" />
            Weekly Capacity Defaults
          </button>

          <button
            onClick={() => handleOpenScheduleModal()}
            className="px-4 py-2 bg-[#6D0281] hover:bg-[#570167] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Schedule New 45-Min Slot
          </button>
        </div>
      </div>

      {/* VIEW 1: Daily Slot Planner (Primary View) */}
      {viewMode === 'planner' && (
        <DailySlotPlanner
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          sessions={sessions}
          patients={patients}
          therapists={therapists}
          onOpenScheduleModal={handleOpenScheduleModal}
          onOpenEditSession={handleOpenEditSession}
          onOpenWeeklyConfig={() => setShowWeeklyConfigModal(true)}
        />
      )}

      {/* VIEW 2: Master Sessions List Table */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-purple-100/80 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by child or parent name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterTherapist}
                onChange={(e) => setFilterTherapist(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6D0281] bg-white text-slate-700"
              >
                <option value="all">All Therapists</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6D0281] bg-white text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </select>
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-2xl border border-purple-100/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-purple-50/70 border-b border-purple-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date & 45-Min Slot</th>
                    <th className="py-3 px-4">Child Patient</th>
                    <th className="py-3 px-4">Assigned Therapist</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Therapist 1-3 Word Note</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedFilteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No sessions match the current search or filters.
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredSessions.map((session) => {
                      const patient = getPatient(session.patientId);
                      const therapist = getTherapist(session.therapistId);
                      const dateFormatted = new Date(session.scheduledAt).toLocaleDateString(
                        'en-IN',
                        {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      );

                      return (
                        <tr key={session.id} className="hover:bg-purple-50/30 transition">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">{dateFormatted}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-[#6D0281]" />
                              {session.timeSlot || '04:00 PM - 04:45 PM'}
                              <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-semibold ml-1">
                                45m
                              </span>
                            </p>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">
                              {patient?.childName || 'Child'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {patient?.motherName} (
                              {patient?.primaryContact === 'mother'
                                ? patient.motherContact
                                : patient?.fatherContact}
                              )
                            </p>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-[#6D0281]" />
                                {therapist?.name || 'Dr. Sweety Bhatnagar'}
                              </p>
                              {session.isSubstitute && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                                  title={session.substituteReason || 'Substitute cover'}
                                >
                                  Substitute
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                session.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : session.status === 'missed'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {session.status.toUpperCase()}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {session.progressNote ? (
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-[#6D0281] font-medium text-[11px]">
                                &quot;{session.progressNote}&quot;
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                No note logged yet
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSwapSession(session);
                                  setShowSwapModal(true);
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition flex items-center gap-1 border border-amber-200"
                                title="Emergency or last-minute therapist swap"
                              >
                                <RefreshCw className="w-3 h-3 text-amber-700" />
                                Swap
                              </button>
                              <button
                                onClick={() => handleOpenEditSession(session)}
                                className="p-1.5 text-slate-500 hover:text-[#6D0281] hover:bg-purple-50 rounded-lg transition"
                                title="Move or Reschedule Slot"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(session.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Cancel Slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* Schedule / Move Slot Modal (Strict 45-Minute OT Standard) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {editingSession ? 'Move / Reschedule Slot' : 'Assign Child to 45-Min Slot'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6D0281] text-white">
                    45 Min OT
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dr. Sweety Bhatnagar sole authority for all therapy appointments.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Select Child Patient *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-white font-medium"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.childName} ({p.age}y, {p.sessionTiming})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Assigned Therapist *
                </label>
                <select
                  value={selectedTherapistId}
                  onChange={(e) => setSelectedTherapistId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-white font-medium"
                >
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Slot Selection
                  </label>
                  <select
                    value={selectedSlotPreset}
                    onChange={(e) => handleSlotPresetSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-white"
                  >
                    <option value="custom">Custom 45-Min Timing</option>
                    {daySlots.map((s) => (
                      <option key={s.id} value={s.id}>
                        Slot #{s.slotNumber}: {s.timeSlotLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={slotTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Computed 45-Min Label
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={slotLabel}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* 45-Min Confirmation Badge */}
              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center gap-2 text-purple-900">
                <Clock className="w-4 h-4 text-[#6D0281] shrink-0" />
                <div>
                  <p className="font-bold">Standard 45-Minute Therapy Slot:</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {slotLabel} • Strictly 45 minutes of clinical one-to-one therapy.
                  </p>
                </div>
              </div>

              {editingSession && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Session Status
                  </label>
                  <select
                    value={slotStatus}
                    onChange={(e) => setSlotStatus(e.target.value as Session['status'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-white"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#6D0281] hover:bg-[#570167] rounded-xl transition shadow-xs"
                >
                  {editingSession ? 'Update Slot' : 'Confirm 45-Min Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weekly Slot Blueprint Modal */}
      <WeeklySlotConfigModal
        isOpen={showWeeklyConfigModal}
        onClose={() => setShowWeeklyConfigModal(false)}
      />

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
