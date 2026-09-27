import { ClinicSlot, DayOfWeekSlotTemplate } from '../types';

/**
 * Format a 24-hour time string ("16:00") to 12-hour display ("04:00 PM")
 */
export function formatTime12h(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let hour = parseInt(hStr, 10);
  const minute = parseInt(mStr || '0', 10);
  if (isNaN(hour)) return time24;

  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;

  const padH = hour < 10 ? `0${hour}` : `${hour}`;
  const padM = minute < 10 ? `0${minute}` : `${minute}`;
  return `${padH}:${padM} ${ampm}`;
}

/**
 * Adds exact minutes to a 24-hour time ("16:00" + 45 -> "16:45")
 */
export function addMinutesToTime(time24: string, minutesToAdd: number): string {
  const [hStr, mStr] = time24.split(':');
  let hour = parseInt(hStr, 10);
  let minute = parseInt(mStr || '0', 10);

  if (isNaN(hour)) hour = 0;
  if (isNaN(minute)) minute = 0;

  const totalMinutes = hour * 60 + minute + minutesToAdd;
  const newHour = Math.floor((totalMinutes / 60) % 24);
  const newMinute = totalMinutes % 60;

  const padH = newHour < 10 ? `0${newHour}` : `${newHour}`;
  const padM = newMinute < 10 ? `0${newMinute}` : `${newMinute}`;
  return `${padH}:${padM}`;
}

/**
 * Generates the strictly 45-minute end time
 */
export function calculate45MinEndTime(startTime24: string): string {
  return addMinutesToTime(startTime24, 45);
}

/**
 * Formats a 45-minute slot label: "04:00 PM - 04:45 PM"
 */
export function format45MinSlotLabel(startTime24: string): string {
  const endTime24 = calculate45MinEndTime(startTime24);
  return `${formatTime12h(startTime24)} - ${formatTime12h(endTime24)}`;
}

/**
 * Default weekly schedule template configured for Dr. Sweety Bhatnagar's clinic
 */
export const DEFAULT_WEEKLY_SLOT_TEMPLATES: DayOfWeekSlotTemplate[] = [
  { day: 'Monday', defaultSlots: 6, startHour: '14:00', bufferMinutes: 15 },
  { day: 'Tuesday', defaultSlots: 5, startHour: '14:30', bufferMinutes: 15 },
  { day: 'Wednesday', defaultSlots: 6, startHour: '14:00', bufferMinutes: 15 },
  { day: 'Thursday', defaultSlots: 5, startHour: '14:30', bufferMinutes: 15 },
  { day: 'Friday', defaultSlots: 6, startHour: '14:00', bufferMinutes: 15 },
  { day: 'Saturday', defaultSlots: 4, startHour: '10:00', bufferMinutes: 15 },
  { day: 'Sunday', defaultSlots: 0, startHour: '10:00', bufferMinutes: 15 },
];

/**
 * Generates an array of 45-minute slots for a given slot count and start time
 */
export function generate45MinSlots(
  dateStr: string,
  slotCount: number,
  startHour: string = '14:00',
  bufferMinutes: number = 15
): ClinicSlot[] {
  const slots: ClinicSlot[] = [];
  let currentTime = startHour;

  for (let i = 1; i <= slotCount; i++) {
    const startTime = currentTime;
    const endTime = calculate45MinEndTime(startTime);
    const timeSlotLabel = `${formatTime12h(startTime)} - ${formatTime12h(endTime)}`;

    slots.push({
      id: `slot-${dateStr}-${i}-${startTime.replace(':', '')}`,
      slotNumber: i,
      startTime,
      endTime,
      timeSlotLabel,
      durationMinutes: 45,
      isBlocked: false,
    });

    // Advance by 45 minutes + buffer (e.g. 15 min buffer = 60 min cycle)
    currentTime = addMinutesToTime(startTime, 45 + bufferMinutes);
  }

  return slots;
}

/**
 * Get the day of week name from a YYYY-MM-DD date string
 */
export function getDayOfWeek(dateStr: string): DayOfWeekSlotTemplate['day'] {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const days: DayOfWeekSlotTemplate['day'][] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[dateObj.getDay()];
}
