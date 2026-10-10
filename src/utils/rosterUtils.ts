import { Session, Therapist, WeekDay, WorkingBlock } from '../types';
import { addMinutesToTime, formatTime12h } from './slotUtils';

export const SESSION_MINUTES = 45;

export const ROSTER_SLOT_TIMES: string[] = [
  '10:00',
  '10:45',
  '11:30',
  '12:15',
  '13:00',
  '13:45',
  '16:15',
  '17:00',
  '17:45',
  '18:30',
  '19:15',
];

export const ROSTER_DAYS: WeekDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

export function slotLabel(startTime: string): string {
  return `${formatTime12h(startTime)} - ${formatTime12h(addMinutesToTime(startTime, SESSION_MINUTES))}`;
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dayNameOf(dateStr: string): WeekDay {
  const days: WeekDay[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[parseDateStr(dateStr).getDay()];
}

export function isoFor(dateStr: string, time24: string): string {
  const base = parseDateStr(dateStr);
  const [hh, mm] = time24.split(':').map(Number);
  base.setHours(hh, mm, 0, 0);
  return base.toISOString();
}

export function timeOfIso(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function dateStrOfIso(iso: string): string {
  return toDateStr(new Date(iso));
}

export type RosterStaffKind = 'lead' | 'ot' | 'speech';

export function defaultWorkingBlocks(kind: RosterStaffKind): WorkingBlock[] {
  const blocks: WorkingBlock[] = [];

  if (kind === 'speech') {
    for (const day of ROSTER_DAYS) {
      blocks.push({ day, startTime: '18:30', endTime: '20:15' });
    }
    return blocks;
  }

  for (const day of ROSTER_DAYS) {
    if (kind === 'lead') {
      blocks.push({ day, startTime: '10:00', endTime: '14:00' });
      blocks.push({ day, startTime: '15:00', endTime: '18:00' });
    } else {
      blocks.push({ day, startTime: '16:15', endTime: '19:15' });
    }
  }
  return blocks;
}

export function isWithinWorkingBlocks(
  therapist: Therapist | undefined,
  day: WeekDay,
  startTime: string
): boolean {
  const blocks = therapist?.workingBlocks;
  if (!blocks || blocks.length === 0) return true;
  return blocks.some(
    (block) => block.day === day && startTime >= block.startTime && startTime < block.endTime
  );
}

export interface RosterCell {
  therapistId: string;
  sessions: Session[];
}

export function buildCellLookup(
  sessions: Session[],
  dateStr: string
): Record<string, Session[]> {
  const lookup: Record<string, Session[]> = {};
  for (const session of sessions) {
    if (session.status === 'missed') continue;
    if (dateStrOfIso(session.scheduledAt) !== dateStr) continue;
    const key = `${session.therapistId}|${timeOfIso(session.scheduledAt)}`;
    if (!lookup[key]) lookup[key] = [];
    lookup[key].push(session);
  }
  return lookup;
}

export function sessionsPerWeekByPatient(sessions: Session[], weekStart: Date): Record<string, number> {
  const counts: Record<string, number> = {};
  const startIso = weekStart.getTime();
  const endIso = addDays(weekStart, 7).getTime();
  for (const session of sessions) {
    if (session.status === 'missed') continue;
    const t = new Date(session.scheduledAt).getTime();
    if (t < startIso || t >= endIso) continue;
    counts[session.patientId] = (counts[session.patientId] || 0) + 1;
  }
  return counts;
}
