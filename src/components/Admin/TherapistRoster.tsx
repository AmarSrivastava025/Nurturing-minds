import React, { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { Patient, Session, Therapist } from '../../types';
import { store } from '../../services/store';
import {
  DAY_SHORT,
  ROSTER_DAYS,
  ROSTER_SLOT_TIMES,
  addDays,
  buildCellLookup,
  dayNameOf,
  dateStrOfIso,
  isoFor,
  isWithinWorkingBlocks,
  parseDateStr,
  sessionsPerWeekByPatient,
  slotLabel,
  startOfWeek,
  toDateStr,
} from '../../utils/rosterUtils';

interface TherapistRosterProps {
  sessions: Session[];
  patients: Patient[];
  therapists: Therapist[];
}

function formatShortDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const TherapistRoster: React.FC<TherapistRosterProps> = ({ sessions, patients, therapists }) => {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateStr(new Date()));
  const [assignTarget, setAssignTarget] = useState<{ therapistId: string; time: string } | null>(null);
  const [search, setSearch] = useState('');

  const activeTherapists = useMemo(
    () => therapists.filter((t) => t.status !== 'on_leave'),
    [therapists]
  );

  const weekDates = useMemo(
    () => ROSTER_DAYS.map((_, index) => toDateStr(addDays(weekStart, index))),
    [weekStart]
  );

  const dateForSelected = useMemo(() => {
    const dayName = dayNameOf(selectedDate);
    const index = ROSTER_DAYS.indexOf(dayName);
    if (index === -1) return weekDates[0];
    return weekDates[index];
  }, [selectedDate, weekDates]);

  const cellLookup = useMemo(
    () => buildCellLookup(sessions, dateForSelected),
    [sessions, dateForSelected]
  );

  const weeklyCounts = useMemo(
    () => sessionsPerWeekByPatient(sessions, weekStart),
    [sessions, weekStart]
  );

  const selectedDayName = dayNameOf(dateForSelected);

  const therapistLoad = useMemo(() => {
    const load: Record<string, number> = {};
    for (const therapist of activeTherapists) load[therapist.id] = 0;
    for (const key of Object.keys(cellLookup)) {
      const [therapistId] = key.split('|');
      if (load[therapistId] !== undefined) load[therapistId] += cellLookup[key].length;
    }
    return load;
  }, [cellLookup, activeTherapists]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = [...patients].sort((a, b) => a.childName.localeCompare(b.childName));
    if (!term) return list;
    return list.filter(
      (p) =>
        p.childName.toLowerCase().includes(term) ||
        (p.motherName || '').toLowerCase().includes(term) ||
        (p.fatherName || '').toLowerCase().includes(term)
    );
  }, [patients, search]);

  const goWeek = (offset: number) => {
    const next = addDays(weekStart, offset * 7);
    setWeekStart(next);
    setSelectedDate(toDateStr(next));
  };

  const goToday = () => {
    const today = new Date();
    setWeekStart(startOfWeek(today));
    setSelectedDate(toDateStr(today));
  };

  const handleAssign = (patient: Patient) => {
    if (!assignTarget) return;
    store.createSession({
      patientId: patient.id,
      therapistId: assignTarget.therapistId,
      scheduledAt: isoFor(dateForSelected, assignTarget.time),
      status: 'scheduled',
      timeSlot: slotLabel(assignTarget.time),
      durationMinutes: 45,
      notifyParent: false,
    });
    setAssignTarget(null);
    setSearch('');
  };

  const handleRemove = (session: Session) => {
    store.deleteSession(session.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#6D0281] to-[#570167] rounded-2xl p-5 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-200" />
            <h2 className="text-lg font-bold tracking-tight">Therapist Roster</h2>
          </div>
          <p className="text-purple-200 text-xs mt-1">
            One column per therapist, 45-minute slots. Planning here does not email parents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goWeek(-1)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition"
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold transition"
          >
            Today
          </button>
          <button
            onClick={() => goWeek(1)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {weekDates.map((dateStr, index) => {
          const isActive = dateStr === dateForSelected;
          const count = sessions.filter(
            (s) => dateStrOfIso(s.scheduledAt) === dateStr && s.status !== 'missed'
          ).length;
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition flex items-center gap-2 ${
                isActive
                  ? 'bg-[#6D0281] text-white border-[#6D0281] shadow'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
              }`}
            >
              <span>{DAY_SHORT[ROSTER_DAYS[index]]}</span>
              <span className={isActive ? 'text-purple-200' : 'text-slate-400'}>
                {formatShortDate(dateStr)}
              </span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/25' : 'bg-purple-100 text-[#6D0281]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold py-3 px-3 w-24">
                    Time
                  </th>
                  {activeTherapists.map((therapist) => (
                    <th key={therapist.id} className="text-left py-3 px-3 border-l border-slate-200">
                      <div className="text-xs font-bold text-slate-800 truncate">{therapist.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {therapistLoad[therapist.id] || 0} on {DAY_SHORT[selectedDayName] || selectedDayName}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROSTER_SLOT_TIMES.map((time, rowIndex) => {
                  const isAfternoonGap = time === '16:15' && rowIndex > 0;
                  return (
                    <tr
                      key={time}
                      className={`border-b border-slate-100 ${isAfternoonGap ? 'border-t-2 border-t-slate-200' : ''}`}
                    >
                      <td className="py-2 px-3 align-top">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                          <Clock className="w-3 h-3 text-purple-400" />
                          {time}
                        </div>
                      </td>
                      {activeTherapists.map((therapist) => {
                        const key = `${therapist.id}|${time}`;
                        const cellSessions = cellLookup[key] || [];
                        const available = isWithinWorkingBlocks(therapist, selectedDayName, time);
                        return (
                          <td key={key} className="border-l border-slate-100 align-top p-1.5">
                            {!available ? (
                              <div className="h-10 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300">
                                off
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {cellSessions.map((session) => {
                                  const patient = patients.find((p) => p.id === session.patientId);
                                  return (
                                    <div
                                      key={session.id}
                                      className="group flex items-center justify-between gap-1 rounded-lg bg-purple-50 border border-purple-200 px-2 py-1.5"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-semibold text-[#6D0281] truncate">
                                          {patient ? patient.childName : 'Unknown'}
                                        </div>
                                        <div className="text-[9px] text-purple-400">
                                          {(weeklyCounts[session.patientId] || 0)}x this week
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleRemove(session)}
                                        className="opacity-0 group-hover:opacity-100 text-purple-400 hover:text-red-500 transition"
                                        title="Remove"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                                <button
                                  onClick={() => {
                                    setAssignTarget({ therapistId: therapist.id, time });
                                    setSearch('');
                                  }}
                                  className="w-full h-8 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:border-purple-400 hover:text-[#6D0281] hover:bg-purple-50/50 transition flex items-center justify-center"
                                  title="Assign a child"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6D0281]" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sessions this week
            </h3>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100">
            {[...patients]
              .sort((a, b) => (weeklyCounts[b.id] || 0) - (weeklyCounts[a.id] || 0))
              .map((patient) => {
                const count = weeklyCounts[patient.id] || 0;
                return (
                  <div key={patient.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700 truncate">
                        {patient.childName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {patient.motherName || patient.fatherName || '—'}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        count === 0
                          ? 'bg-slate-100 text-slate-400'
                          : count >= 4
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-purple-100 text-[#6D0281]'
                      }`}
                    >
                      {count}/wk
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {assignTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setAssignTarget(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Assign a child</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {therapists.find((t) => t.id === assignTarget.therapistId)?.name} ·{' '}
                  {DAY_SHORT[selectedDayName] || selectedDayName} {formatShortDate(dateForSelected)} ·{' '}
                  {slotLabel(assignTarget.time)}
                </p>
              </div>
              <button onClick={() => setAssignTarget(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search child or parent name..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100">
              {filteredPatients.length === 0 && (
                <p className="p-4 text-xs text-slate-400">No children match that search.</p>
              )}
              {filteredPatients.map((patient) => {
                const bookedSession = (cellLookup[`${assignTarget.therapistId}|${assignTarget.time}`] || []).find(
                  (s) => s.patientId === patient.id
                );
                return (
                  <button
                    key={patient.id}
                    disabled={Boolean(bookedSession)}
                    onClick={() => handleAssign(patient)}
                    className={`w-full text-left px-5 py-2.5 flex items-center justify-between gap-3 transition ${
                      bookedSession ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700 truncate">
                        {patient.childName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {patient.motherName || patient.fatherName || '—'} ·{' '}
                        {weeklyCounts[patient.id] || 0}x this week
                      </div>
                    </div>
                    {bookedSession ? (
                      <span className="text-[10px] text-slate-400">already booked</span>
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-[#6D0281]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
