import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Edit2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Sliders,
  CheckCircle2,
  Ban,
  RotateCcw,
  Sparkles,
  Settings,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ClinicSlot, DailySlotConfig, Patient, Session, Therapist } from '../../types';
import { store } from '../../services/store';
import { formatTime12h, calculate45MinEndTime } from '../../utils/slotUtils';
import { LastMinuteTherapistSwapModal } from './LastMinuteTherapistSwapModal';

interface DailySlotPlannerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  sessions: Session[];
  patients: Patient[];
  therapists: Therapist[];
  onOpenScheduleModal: (params?: {
    date: string;
    timeSlotLabel: string;
    startTime: string;
  }) => void;
  onOpenEditSession: (session: Session) => void;
  onOpenWeeklyConfig: () => void;
}

export const DailySlotPlanner: React.FC<DailySlotPlannerProps> = ({
  selectedDate,
  onDateChange,
  sessions,
  patients,
  therapists,
  onOpenScheduleModal,
  onOpenEditSession,
  onOpenWeeklyConfig,
}) => {
  // Retrieve the day's slot configuration from store
  const dailyConfig: DailySlotConfig = store.getDailySlotConfig(selectedDate);
  const slots: ClinicSlot[] = dailyConfig.slots || [];

  // Local state for adjusting slot capacity
  const [slotCountInput, setSlotCountInput] = useState<number>(dailyConfig.targetSlots);
  const [startHourInput, setStartHourInput] = useState<string>(
    slots[0]?.startTime || '14:00'
  );
  const [bufferMinutesInput, setBufferMinutesInput] = useState<number>(15);
  const [showAddCustomSlotModal, setShowAddCustomSlotModal] = useState(false);
  const [customSlotStartTime, setCustomSlotStartTime] = useState('17:00');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [swapSession, setSwapSession] = useState<Session | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);

  // Sync state if selectedDate changes
  React.useEffect(() => {
    const config = store.getDailySlotConfig(selectedDate);
    setSlotCountInput(config.targetSlots);
    if (config.slots && config.slots[0]) {
      setStartHourInput(config.slots[0].startTime);
    }
  }, [selectedDate]);

  // Find sessions occurring on this date
  const daySessions = sessions.filter((s) => {
    try {
      const sessionDate = new Date(s.scheduledAt).toISOString().split('T')[0];
      return sessionDate === selectedDate;
    } catch {
      return false;
    }
  });

  // Match each slot with its scheduled session (if any)
  const getSessionForSlot = (slot: ClinicSlot): Session | undefined => {
    return daySessions.find((s) => {
      if (s.timeSlot && s.timeSlot.includes(slot.timeSlotLabel)) return true;
      if (s.timeSlot && slot.timeSlotLabel.includes(s.timeSlot)) return true;
      // Match by start time in ISO
      try {
        const sessionTime = new Date(s.scheduledAt).toISOString().substring(11, 16);
        return sessionTime === slot.startTime;
      } catch {
        return false;
      }
    });
  };

  const getPatient = (id: string) => patients.find((p) => p.id === id);
  const getTherapist = (id: string) => therapists.find((t) => t.id === id);

  // Date Navigation Helpers
  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const yStr = dateObj.getFullYear();
    const mStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dStr = String(dateObj.getDate()).padStart(2, '0');
    onDateChange(`${yStr}-${mStr}-${dStr}`);
  };

  const setToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    onDateChange(todayStr);
  };

  // Formatted date string
  const [year, month, day] = selectedDate.split('-').map(Number);
  const dateObject = new Date(year, month - 1, day);
  const formattedDateTitle = dateObject.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Slot Management actions
  const handleApplySlotCount = () => {
    store.setDailySlotCount(
      selectedDate,
      slotCountInput,
      startHourInput,
      bufferMinutesInput
    );
    showFeedback(`Fixed ${slotCountInput} slots (45 min each) for ${formattedDateTitle}!`);
  };

  const handleIncrementSlots = () => {
    const nextCount = Math.min(12, dailyConfig.targetSlots + 1);
    setSlotCountInput(nextCount);
    store.setDailySlotCount(
      selectedDate,
      nextCount,
      startHourInput,
      bufferMinutesInput
    );
    showFeedback(`Added slot #${nextCount} for today.`);
  };

  const handleDecrementSlots = () => {
    if (dailyConfig.targetSlots <= 0) return;
    const nextCount = Math.max(0, dailyConfig.targetSlots - 1);
    setSlotCountInput(nextCount);
    store.setDailySlotCount(
      selectedDate,
      nextCount,
      startHourInput,
      bufferMinutesInput
    );
    showFeedback(`Capacity reduced to ${nextCount} slots.`);
  };

  const handleAddCustomSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.addCustomSlot(selectedDate, customSlotStartTime);
    setShowAddCustomSlotModal(false);
    showFeedback(`New 45-min slot added starting at ${formatTime12h(customSlotStartTime)}.`);
  };

  const handleDeleteSlot = (slotId: string) => {
    if (confirm('Are you sure you want to remove this slot from today’s fixed schedule?')) {
      store.removeCustomSlot(selectedDate, slotId);
      showFeedback('Slot removed from daily schedule.');
    }
  };

  const handleToggleBlock = (slot: ClinicSlot) => {
    store.toggleSlotBlocked(selectedDate, slot.id);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Cancel this scheduled session? The 45-minute slot will return to Available.')) {
      store.deleteSession(sessionId);
      showFeedback('Session cancelled. Slot is now available.');
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Metrics
  const totalSlotsCount = slots.length;
  const bookedCount = slots.filter((slot) => getSessionForSlot(slot)).length;
  const blockedCount = slots.filter((slot) => slot.isBlocked).length;
  const availableCount = totalSlotsCount - bookedCount - blockedCount;
  const occupancyPercent = totalSlotsCount > 0 ? Math.round((bookedCount / totalSlotsCount) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Date Navigation & Primary Title Bar */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-[#6D0281] border border-purple-100 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{formattedDateTitle}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#6D0281] border border-purple-200">
                45-Min Slots
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Dr. Sweety Bhatnagar Sole Scheduling Authority • Direct slot allocation
            </p>
          </div>
        </div>

        {/* Date Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={setToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white rounded-lg transition"
            >
              Today
            </button>
            <button
              onClick={() => shiftDate(1)}
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
          />

          <button
            onClick={onOpenWeeklyConfig}
            className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#6D0281] text-xs font-semibold flex items-center gap-1.5 transition"
            title="Configure Weekly Default Slot Limits"
          >
            <Settings className="w-3.5 h-3.5" />
            Weekly Blueprint
          </button>
        </div>
      </div>

      {/* Daily Slot Decision Panel: "I can decide how many slot I need to fix each day" */}
      <div className="bg-gradient-to-br from-[#6D0281]/5 via-purple-50/50 to-white p-5 rounded-2xl border border-purple-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Capacity Decider & Stepper */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#6D0281]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Fix Daily Slot Capacity for this Date
              </h3>
            </div>
            <p className="text-xs text-slate-600 max-w-xl">
              Decide exactly how many 45-minute therapy slots you want to fix for today. You can
              increase or reduce slots on the fly, or adjust the clinic opening hour.
            </p>

            {/* Stepper and Quick Controls */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center bg-white border border-purple-200 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={handleDecrementSlots}
                  disabled={dailyConfig.targetSlots <= 0}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-800 font-bold text-sm flex items-center justify-center transition disabled:opacity-40"
                  title="Reduce 1 Slot"
                >
                  -
                </button>

                <div className="px-4 text-center">
                  <span className="text-base font-extrabold text-[#6D0281]">
                    {dailyConfig.targetSlots}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium ml-1">
                    {dailyConfig.targetSlots === 1 ? 'Slot Fixed' : 'Slots Fixed'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleIncrementSlots}
                  disabled={dailyConfig.targetSlots >= 12}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-800 font-bold text-sm flex items-center justify-center transition disabled:opacity-40"
                  title="Add 1 Slot"
                >
                  +
                </button>
              </div>

              {/* Action: Add Custom Slot */}
              <button
                onClick={() => setShowAddCustomSlotModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-purple-50 text-[#6D0281] border border-purple-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Specific Slot (+45m)
              </button>
            </div>
          </div>

          {/* Right: Quick Settings Form (First Slot Start Time & Buffer) */}
          <div className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-xs flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                First Slot Starts At
              </label>
              <input
                type="time"
                value={startHourInput}
                onChange={(e) => setStartHourInput(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Buffer Between Slots
              </label>
              <select
                value={bufferMinutesInput}
                onChange={(e) => setBufferMinutesInput(Number(e.target.value))}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-white"
              >
                <option value={0}>0 min (Back-to-Back)</option>
                <option value={10}>10 min break</option>
                <option value={15}>15 min break (Standard)</option>
                <option value={20}>20 min break</option>
              </select>
            </div>

            <button
              onClick={handleApplySlotCount}
              className="px-4 py-1.5 rounded-lg bg-[#6D0281] hover:bg-[#570167] text-white font-bold text-xs transition shadow-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Apply & Reset Day
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Daily Capacity Overview Chips */}
        <div className="mt-4 pt-3 border-t border-purple-100/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6D0281]"></span>
              <span className="text-slate-600">Fixed Total:</span>
              <span className="font-bold text-slate-900">{totalSlotsCount} Slots</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-600">Booked / Active:</span>
              <span className="font-bold text-blue-700">{bookedCount}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">Available:</span>
              <span className="font-bold text-emerald-700">{availableCount}</span>
            </div>

            {blockedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span className="text-slate-600">Blocked / Break:</span>
                <span className="font-bold text-slate-600">{blockedCount}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Occupancy:</span>
            <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#6D0281] h-full rounded-full transition-all duration-300"
                style={{ width: `${occupancyPercent}%` }}
              ></div>
            </div>
            <span className="font-bold text-[#6D0281]">{occupancyPercent}%</span>
          </div>
        </div>
      </div>

      {/* Fixed 45-Minute Slots Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>Today&apos;s 45-Minute Slot Board</span>
            <span className="text-[11px] font-normal text-slate-500 lowercase">
              ({totalSlotsCount} fixed slots)
            </span>
          </h3>

          <button
            onClick={() => onOpenScheduleModal({ date: selectedDate, timeSlotLabel: '', startTime: '16:00' })}
            className="text-xs font-semibold text-[#6D0281] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Direct Schedule Booking
          </button>
        </div>

        {slots.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-purple-200 p-12 text-center text-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-[#6D0281] flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No Slots Fixed for This Day</h4>
            <p className="text-slate-500 max-w-sm mx-auto">
              You haven&apos;t fixed any therapy slots for {formattedDateTitle}. Click the button
              below to generate the standard 45-minute slots.
            </p>
            <button
              onClick={() => {
                setSlotCountInput(5);
                store.setDailySlotCount(selectedDate, 5, '14:00', 15);
              }}
              className="px-4 py-2 bg-[#6D0281] hover:bg-[#570167] text-white font-bold rounded-xl shadow-xs transition"
            >
              Fix 5 Slots for Today (45 Min Each)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {slots.map((slot) => {
              const session = getSessionForSlot(slot);
              const patient = session ? getPatient(session.patientId) : null;
              const therapist = session ? getTherapist(session.therapistId) : null;

              return (
                <div
                  key={slot.id}
                  className={`rounded-2xl border transition p-4 flex flex-col justify-between ${
                    slot.isBlocked
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : session
                      ? 'bg-white border-purple-200 shadow-xs'
                      : 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300 shadow-2xs'
                  }`}
                >
                  {/* Top: Slot Header & Timings */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#6D0281]/10 text-[#6D0281] font-extrabold text-[11px]">
                          Slot #{slot.slotNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-[#6D0281] font-bold text-[10px]">
                          45 Min
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(slot)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition"
                          title={slot.isBlocked ? 'Unblock Slot' : 'Block Slot (Break)'}
                        >
                          <Ban className={`w-3.5 h-3.5 ${slot.isBlocked ? 'text-amber-600' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-md transition"
                          title="Remove this slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
                      <Clock className="w-4 h-4 text-[#6D0281]" />
                      <span>{slot.timeSlotLabel}</span>
                    </div>

                    {/* Slot Content Body */}
                    {slot.isBlocked ? (
                      <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-slate-700">
                          <Ban className="w-3.5 h-3.5 text-amber-600" />
                          Slot Blocked / Clinic Break
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {slot.blockReason || 'Reserved for therapist preparation & sensory gym disinfection'}
                        </p>
                      </div>
                    ) : session ? (
                      <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">
                              {patient ? patient.childName : 'Child Patient'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {patient?.age} yrs, {patient?.bloodGroup} • Parent: {patient?.motherName}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              session.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {session.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 text-[11px] text-slate-700 font-semibold pt-1 border-t border-purple-100/80">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#6D0281]" />
                            <span>{therapist?.name || 'Dr. Sweety Bhatnagar'}</span>
                          </div>
                          {session.isSubstitute && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1"
                              title={session.substituteReason || 'Substitute cover'}
                            >
                              <RefreshCw className="w-2.5 h-2.5 text-amber-700" />
                              Substitute
                            </span>
                          )}
                        </div>

                        {session.progressNote && (
                          <p className="text-[10px] italic text-[#6D0281] bg-white p-1.5 rounded-lg border border-purple-100">
                            &quot;{session.progressNote}&quot;
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Available 45-Min OT Slot
                        </div>
                        <p className="text-[11px] text-emerald-700">
                          Ready for patient assignment by Dr. Bhatnagar.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Button */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    {slot.isBlocked ? (
                      <button
                        onClick={() => handleToggleBlock(slot)}
                        className="w-full py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
                      >
                        Unblock Slot
                      </button>
                    ) : session ? (
                      <div className="w-full flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSwapSession(session);
                            setShowSwapModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition flex items-center gap-1 border border-amber-200 shadow-2xs"
                          title="Last-minute therapist swap or emergency substitute"
                        >
                          <RefreshCw className="w-3 h-3 text-amber-700" />
                          Swap Therapist
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenEditSession(session)}
                            className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-[#6D0281] hover:bg-purple-50 rounded-lg transition flex items-center gap-1"
                            title="Move slot time or update"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Cancel session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          onOpenScheduleModal({
                            date: selectedDate,
                            timeSlotLabel: slot.timeSlotLabel,
                            startTime: slot.startTime,
                          })
                        }
                        className="w-full py-2 rounded-xl bg-[#6D0281] hover:bg-[#570167] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Assign Child & Therapist
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Custom Slot Modal */}
      {showAddCustomSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-purple-100 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Add Specific 45-Min Slot to {formattedDateTitle}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Duration will be locked to 45 minutes automatically.
            </p>

            <form onSubmit={handleAddCustomSlotSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Slot Start Time</label>
                <input
                  type="time"
                  required
                  value={customSlotStartTime}
                  onChange={(e) => setCustomSlotStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100 text-purple-900 text-xs">
                <p className="font-semibold text-[#6D0281]">Automatic 45-Min Calculation:</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {formatTime12h(customSlotStartTime)} to{' '}
                  {formatTime12h(calculate45MinEndTime(customSlotStartTime))} (45 mins)
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomSlotModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#6D0281] hover:bg-[#570167] text-white font-bold shadow-xs"
                >
                  Confirm Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Last-Minute Therapist Reassignment Modal */}
      <LastMinuteTherapistSwapModal
        isOpen={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          setSwapSession(null);
        }}
        session={swapSession}
        therapists={therapists}
        sessions={sessions}
        onSuccess={(msg) => showFeedback(msg)}
      />
    </div>
  );
};
