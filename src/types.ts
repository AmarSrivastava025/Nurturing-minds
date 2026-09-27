export type Role = 'admin' | 'parent' | 'therapist';

export interface Patient {
  id: string;
  childName: string;
  age: number;
  bloodGroup: string;
  symptom: string;
  chiefComplaint: string;
  fatherName: string;
  fatherContact: string;
  motherName: string;
  motherContact: string;
  primaryContact: 'father' | 'mother';
  emergencyContact: 'father' | 'mother';
  sessionsPerWeek: number;
  assignedTherapistId: string;
  paymentStatus: 'current' | 'late' | 'partial';
  createdAt: string; // ISO — only after assessment + payment confirmed
  sessionTiming: string;
  parentUserId?: string;
  parentEmail?: string;
  parentLoginId?: string; // Member / Parent Login ID
  parentPassword?: string; // Member / Parent Password
  passwordLastReset?: string; // ISO timestamp
  pendingPaymentAmount?: number;
  pendingPaymentMonth?: string;
}

export interface Therapist {
  id: string;
  userId: string; // linked auth user
  name: string;
  photoUrl: string;
  qualification: string;
  summary: string;
  email: string;
  phone?: string;
  loginId?: string; // Therapist Login ID
  password?: string; // Therapist Password
  passwordLastReset?: string; // ISO timestamp
  specialization?: string;
  experienceYears?: number;
  status?: 'active' | 'on_leave';
  availableDays?: string[];
  workingHours?: string;
}

export interface ClinicSlot {
  id: string;
  slotNumber: number;
  startTime: string; // '16:00' (24-hr format)
  endTime: string; // '16:45' (24-hr format, strictly 45 minutes)
  timeSlotLabel: string; // '04:00 PM - 04:45 PM'
  durationMinutes: 45;
  isBlocked?: boolean;
  blockReason?: string;
}

export interface DailySlotConfig {
  date: string; // 'YYYY-MM-DD'
  targetSlots: number; // How many slots admin decided to fix for this day
  slots: ClinicSlot[];
}

export interface DayOfWeekSlotTemplate {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  defaultSlots: number;
  startHour: string; // e.g. '10:00' or '14:00'
  bufferMinutes: number; // e.g. 15 min between 45-min slots
}

export interface Session {
  id: string;
  patientId: string;
  therapistId: string;
  scheduledAt: string; // ISO — editable only by admin
  status: 'scheduled' | 'completed' | 'missed';
  progressNote?: string; // 1-3 word therapist entry
  durationMinutes?: number;
  timeSlot?: string;
  isSubstitute?: boolean;
  originalTherapistId?: string;
  substituteReason?: string;
}

export interface ProgressSummary {
  id: string;
  patientId: string;
  periodStart: string;
  periodEnd: string;
  aiDraft: string;
  approved: boolean;
  approvedAt?: string;
  providerStamp: string; // which model produced the draft
  notesIncluded?: string[];
}

export interface Invoice {
  id: string;
  patientId: string;
  invoiceNumber: string;
  amount: number;
  issuedAt: string;
  pdfUrl?: string;
  paymentMode: 'UPI' | 'Bank Transfer' | 'Card' | 'Cash';
  description: string;
  status: 'paid' | 'pending';
}

export interface Expense {
  id: string;
  amount: number;
  payee: string;
  date: string;
  rawInput?: string; // the original sentence typed
  rawSentence?: string;
  providerStamp?: string;
  modelStamp?: string;
  category: string;
}

export interface Program {
  id: string;
  title: string;
  imageUrl: string;
  summary: string;
}

export interface Notification {
  id: string;
  userId: string; // specific user ID or 'all' or role string
  targetRole?: Role | 'all';
  type: 'therapist_mapped' | 'video_published' | 'late_payment' | 'progress_approved' | 'general' | 'session_scheduled';
  message: string;
  read: boolean;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface PublishedVideo {
  id: string;
  youtubeUrl: string;
  title: string;
  description?: string;
  publishedAt: string;
  publishedBy: string;
}

export interface DoctorProfile {
  name: string;
  title: string;
  photoUrl: string;
  bio: string;
  qualifications: string;
  clinicAddress: string;
  contactEmail: string;
  phone: string;
  adminLoginId?: string;
  adminPassword?: string;
}

export interface InviteCode {
  id: string;
  code: string;
  role: 'parent' | 'therapist';
  patientId?: string; // child linked to parent invite
  recipientName?: string;
  createdAt: string;
  used: boolean;
}

export interface UserSession {
  id: string;
  role: Role;
  name: string;
  email: string;
  patientId?: string; // if role === 'parent'
  therapistId?: string; // if role === 'therapist'
}
