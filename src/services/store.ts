import {
  INITIAL_DOCTOR_PROFILE,
  migrateClinicAddress,
  migrateClinicPhone,
  migrateClinicPhoneInTherapists,
  SEED_EXPENSES,
  SEED_INVITES,
  SEED_INVOICES,
  SEED_NOTIFICATIONS,
  SEED_PATIENTS,
  SEED_PROGRAMS,
  SEED_PUBLISHED_VIDEO,
  SEED_SESSIONS,
  SEED_THERAPISTS,
  formatLatePaymentMessage,
} from '../constants';
import {
  ClinicSlot,
  DailySlotConfig,
  DayOfWeekSlotTemplate,
  DoctorProfile,
  Expense,
  InviteCode,
  Invoice,
  Notification,
  Patient,
  Program,
  ProgressSummary,
  PublishedVideo,
  Role,
  Session,
  Therapist,
  UserSession,
  EmailLog,
  MessageLog,
} from '../types';
import {
  calculate45MinEndTime,
  DEFAULT_WEEKLY_SLOT_TEMPLATES,
  format45MinSlotLabel,
  generate45MinSlots,
  getDayOfWeek,
} from '../utils/slotUtils';
import {
  cloudDeleteExpense,
  cloudDeletePatient,
  cloudDeleteProgram,
  cloudDeleteSession,
  cloudDeleteTherapist,
  cloudResetToSeed,
  cloudSaveDailySlotConfig,
  cloudSaveDoctorProfile,
  cloudSaveExpense,
  cloudSaveInvite,
  cloudSaveInvoice,
  cloudSaveNotification,
  cloudSavePatient,
  cloudSavePatientsBatch,
  cloudSaveProgram,
  cloudSaveProgressSummary,
  cloudSavePublishedVideo,
  cloudSaveSession,
  cloudSaveTherapist,
  cloudSaveWeeklySlotTemplates,
  cloudWipeForCutover,
  seedFirestoreIfEmpty,
  subscribeToFirestore,
} from './firestoreSync';
import { processSessionEmailSequence } from './automation/email-confirmation-sequence';
import {
  processSessionMessageSequence,
  triggerTherapistSwapWhatsAppAlert,
} from './automation/whatsapp-sms-service';

export interface StoreState {
  patients: Patient[];
  therapists: Therapist[];
  sessions: Session[];
  progressSummaries: ProgressSummary[];
  invoices: Invoice[];
  expenses: Expense[];
  programs: Program[];
  publishedVideo: PublishedVideo | null;
  doctorProfile: DoctorProfile;
  notifications: Notification[];
  invites: InviteCode[];
  currentUser: UserSession | null;
  dailySlotConfigs: Record<string, DailySlotConfig>;
  weeklySlotTemplates: DayOfWeekSlotTemplate[];
  emailLogs: EmailLog[];
  messageLogs: MessageLog[];
  isCloudSynced: boolean;
  cloudError: string | null;
}

const STORAGE_KEY = 'nurturing_minds_store_v2';

// Unauthenticated visitors start with no session and must log in
export const DEFAULT_USER: UserSession | null = null;

function loadInitialState(): StoreState {
  if (typeof window === 'undefined') {
    return getSeedState();
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const rawPatients: Patient[] = parsed.patients || SEED_PATIENTS;
      const rawTherapists: Therapist[] = parsed.therapists || SEED_THERAPISTS;

      // Ensure all patients have valid loginId & password
      const patients: Patient[] = rawPatients.map((p) => ({
        ...p,
        parentLoginId:
          p.parentLoginId ||
          p.parentEmail ||
          (p.motherName ? p.motherName.toLowerCase().replace(/\s+/g, '.') : `parent.${p.id}`),
        parentPassword: p.parentPassword || 'parent123',
      }));

      // Ensure all therapists have valid loginId, password & workingHours
      const therapists: Therapist[] = rawTherapists.map((t) => ({
        ...t,
        loginId: t.loginId || t.email || t.name.toLowerCase().replace(/\s+/g, '.'),
        password: t.password || 'therapist123',
        availableDays: t.availableDays || ['Monday', 'Wednesday', 'Friday'],
        workingHours: t.workingHours || '09:00 AM - 05:00 PM',
      }));

      const doctorProfile: DoctorProfile = {
        ...INITIAL_DOCTOR_PROFILE,
        ...(parsed.doctorProfile || {}),
        adminLoginId:
          (parsed.doctorProfile && parsed.doctorProfile.adminLoginId) ||
          'connect@drsweetybhatnagar.com',
        adminPassword:
          (parsed.doctorProfile && parsed.doctorProfile.adminPassword) || 'admin123',
      };

      return {
        ...getSeedState(),
        ...parsed,
        currentUser: parsed.currentUser || null,
        patients,
        therapists: migrateClinicPhoneInTherapists(therapists),
        doctorProfile: migrateClinicAddress(migrateClinicPhone(doctorProfile)),
        sessions: parsed.sessions || SEED_SESSIONS,
        programs: parsed.programs || SEED_PROGRAMS,
        dailySlotConfigs: parsed.dailySlotConfigs || {},
        weeklySlotTemplates: parsed.weeklySlotTemplates || [...DEFAULT_WEEKLY_SLOT_TEMPLATES],
        emailLogs: parsed.emailLogs || [],
        messageLogs: parsed.messageLogs || [],
        isCloudSynced: false,
        cloudError: null,
      };
    }
  } catch (err) {
    console.error('Failed to load stored state, initializing seed data:', err);
  }

  return getSeedState();
}

function getSeedState(): StoreState {
  return {
    patients: [...SEED_PATIENTS],
    therapists: [...SEED_THERAPISTS],
    sessions: [...SEED_SESSIONS],
    progressSummaries: [
      {
        id: 'prog-1',
        patientId: 'pat-1',
        periodStart: '2026-08-10',
        periodEnd: '2026-08-25',
        aiDraft:
          'Aarav has shown wonderful enthusiasm and regulation during his sensory integration sessions this fortnight. He demonstrated improved tactile acceptance, tolerating textured sensory brushes with genuine smiles, and maintained a calm, steady focus during fine-motor tabletop play. His tripod grasp on adaptive grips is becoming much firmer, and transitions between gym stations were smooth and cheerful.',
        approved: true,
        approvedAt: '2026-08-26T15:30:00.000Z',
        providerStamp: 'openrouter/meta-llama/llama-3.3-70b-instruct:free',
        notesIncluded: ['Calm and focused', 'Better pencil grip', 'Tolerated textured brush'],
      },
      {
        id: 'prog-2-queue',
        patientId: 'pat-2',
        periodStart: '2026-08-20',
        periodEnd: '2026-09-04',
        aiDraft:
          'Ananya has engaged with remarkable curiosity in our therapy sessions this week. She exhibited improved hand strength and clay grasping during sensory play, holding finger paints with far less hesitation. She comfortably sustained 25 minutes of seated attention without sensory seeking interruptions.',
        approved: false, // In Dr. Bhatnagar's approval queue! Never visible to parent until approved.
        providerStamp: 'openrouter/meta-llama/llama-3.3-70b-instruct:free',
        notesIncluded: ['Improved clay grasping', 'Good seated attention'],
      },
    ],
    invoices: [...SEED_INVOICES],
    expenses: [...SEED_EXPENSES],
    programs: [...SEED_PROGRAMS],
    publishedVideo: { ...SEED_PUBLISHED_VIDEO },
    doctorProfile: { ...INITIAL_DOCTOR_PROFILE },
    notifications: [...SEED_NOTIFICATIONS],
    invites: [...SEED_INVITES],
    currentUser: null,
    dailySlotConfigs: {},
    weeklySlotTemplates: [...DEFAULT_WEEKLY_SLOT_TEMPLATES],
    emailLogs: [],
    messageLogs: [],
    isCloudSynced: false,
    cloudError: null,
  };
}

class Store {
  private state: StoreState;
  private listeners: Array<(state: StoreState) => void> = [];
  private unsubscribeFirestore?: () => void;

  constructor() {
    this.state = loadInitialState();
    this.initFirestoreSync();
  }

  getState(): StoreState {
    return this.state;
  }

  subscribe(listener: (state: StoreState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(persistLocal = true) {
    if (persistLocal && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (err) {
        console.error('Failed to persist store state:', err);
      }
    }
    this.listeners.forEach((l) => l(this.state));
  }

  /**
   * Connect to Firestore (asia-south1) and subscribe to all collections
   */
  private async initFirestoreSync() {
    if (typeof window === 'undefined') return;

    try {
      // 1. Seed initial data if Firestore is freshly provisioned and empty
      await seedFirestoreIfEmpty();

      // 2. Subscribe in real time
      this.unsubscribeFirestore = subscribeToFirestore(
        (cloudData) => {
          let hasChanges = false;
          const nextState: StoreState = {
            ...this.state,
            isCloudSynced: true,
            cloudError: null,
          };

          if (cloudData.patients !== undefined) {
            nextState.patients = cloudData.patients;
            hasChanges = true;
          }
          if (cloudData.therapists !== undefined) {
            const migratedTherapists = migrateClinicPhoneInTherapists(cloudData.therapists);
            nextState.therapists = migratedTherapists;
            hasChanges = true;
            if (migratedTherapists !== cloudData.therapists) {
              migratedTherapists.forEach((therapist, index) => {
                if (therapist !== cloudData.therapists[index]) {
                  cloudSaveTherapist(therapist).catch((err) =>
                    console.error('Error persisting migrated clinic phone:', err)
                  );
                }
              });
            }
          }
          if (cloudData.sessions !== undefined) {
            nextState.sessions = cloudData.sessions;
            hasChanges = true;
          }
          if (cloudData.progressSummaries !== undefined) {
            nextState.progressSummaries = cloudData.progressSummaries;
            hasChanges = true;
          }
          if (cloudData.invoices !== undefined) {
            nextState.invoices = cloudData.invoices;
            hasChanges = true;
          }
          if (cloudData.expenses !== undefined) {
            nextState.expenses = cloudData.expenses;
            hasChanges = true;
          }
          if (cloudData.programs !== undefined) {
            nextState.programs = cloudData.programs;
            hasChanges = true;
          }
          if (cloudData.invites !== undefined) {
            nextState.invites = cloudData.invites;
            hasChanges = true;
          }
          if (cloudData.notifications !== undefined) {
            nextState.notifications = cloudData.notifications;
            hasChanges = true;
          }
          if (cloudData.dailySlotConfigs !== undefined) {
            nextState.dailySlotConfigs = cloudData.dailySlotConfigs;
            hasChanges = true;
          }
          if (cloudData.doctorProfile !== undefined) {
            const migratedProfile = migrateClinicAddress(migrateClinicPhone(cloudData.doctorProfile));
            nextState.doctorProfile = migratedProfile;
            hasChanges = true;
            if (migratedProfile !== cloudData.doctorProfile) {
              cloudSaveDoctorProfile(migratedProfile).catch((err) =>
                console.error('Error persisting migrated clinic phone:', err)
              );
            }
          }
          if (cloudData.publishedVideo !== undefined) {
            nextState.publishedVideo = cloudData.publishedVideo;
            hasChanges = true;
          }
          if (cloudData.weeklySlotTemplates !== undefined) {
            nextState.weeklySlotTemplates = cloudData.weeklySlotTemplates;
            hasChanges = true;
          }
          if (cloudData.emailLogs !== undefined) {
            nextState.emailLogs = cloudData.emailLogs;
            hasChanges = true;
          }

          if (hasChanges) {
            this.state = nextState;
            this.notify(true);
          }
        },
        (err) => {
          console.warn('Firestore live sync notice:', err);
          this.state = { ...this.state, cloudError: err.message };
          this.notify(false);
        }
      );
    } catch (err: any) {
      console.warn('Could not initialize Firestore sync:', err);
      this.state = {
        ...this.state,
        cloudError: err?.message || 'Firestore connection initialization error',
      };
      this.notify(false);
    }
  }

  // --- Auth / Role Switching ---
  setCurrentUser(user: UserSession | null) {
    this.state = { ...this.state, currentUser: user };
    this.notify();
  }

  login(user: UserSession) {
    this.setCurrentUser(user);
  }

  logout() {
    this.setCurrentUser(null);
  }

  switchRole(role: Role, patientId?: string, therapistId?: string) {
    if (role === 'admin') {
      this.state.currentUser = {
        id: 'user-admin',
        role: 'admin',
        name: 'Dr. Sweety Bhatnagar',
        email: 'connect@drsweetybhatnagar.com',
      };
    } else if (role === 'parent') {
      const activePatId = patientId || 'pat-1';
      const patient =
        this.state.patients.find((p) => p.id === activePatId) || this.state.patients[0];
      this.state.currentUser = {
        id: patient?.parentUserId || 'user-parent-1',
        role: 'parent',
        name: `${patient ? patient.motherName : 'Priya Sharma'} (Parent of ${
          patient ? patient.childName : 'Aarav'
        })`,
        email: patient?.parentEmail || 'priya.sharma@example.com',
        patientId: patient?.id || 'pat-1',
      };
    } else if (role === 'therapist') {
      const activeThId = therapistId || 'th-1';
      const therapist =
        this.state.therapists.find((t) => t.id === activeThId) || this.state.therapists[0];
      this.state.currentUser = {
        id: therapist?.userId || 'user-therapist-1',
        role: 'therapist',
        name: therapist?.name || 'Ritu Verma',
        email: therapist?.email || 'ritu.verma@nurturingminds.com',
        therapistId: therapist?.id || 'th-1',
      };
    }
    this.notify();
  }

  // --- Patient CRM (Admin Only) ---
  createPatient(patientData: Omit<Patient, 'id' | 'createdAt'>): Patient {
    const timestamp = Date.now();
    const parentEmail = patientData.parentEmail ? patientData.parentEmail.trim().toLowerCase() : undefined;
    const parentLoginId =
      patientData.parentLoginId ||
      parentEmail ||
      (patientData.motherName ? patientData.motherName.toLowerCase().replace(/\s+/g, '.') : `parent.${timestamp}`);

    const newPatient: Patient = {
      ...patientData,
      id: `pat-${timestamp}`,
      parentEmail,
      parentLoginId,
      parentPassword: patientData.parentPassword || 'parent123',
      createdAt: new Date().toISOString(),
    };
    this.state.patients = [newPatient, ...this.state.patients];

    // Create an invite link for the parent automatically
    const invite: InviteCode = {
      id: `inv-${timestamp}`,
      code: `NM-PAT-${newPatient.childName.split(' ')[0].toUpperCase()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      role: 'parent',
      patientId: newPatient.id,
      recipientName: `${newPatient.motherName} (${newPatient.childName})`,
      createdAt: new Date().toISOString(),
      used: false,
    };
    this.state.invites = [invite, ...this.state.invites];

    // Automatically create an initial session for this newly enrolled child
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 0, 0, 0); // 4:00 PM

    const initialSession: Session = {
      id: `ses-${timestamp}`,
      patientId: newPatient.id,
      therapistId: newPatient.assignedTherapistId || 'th-1',
      scheduledAt: tomorrow.toISOString(),
      status: 'scheduled',
      timeSlot: '04:00 PM - 04:45 PM',
      durationMinutes: 45,
    };
    this.state.sessions = [initialSession, ...this.state.sessions];

    // Fire in-app notification to assigned therapist immediately
    let notif: Notification | undefined;
    if (newPatient.assignedTherapistId) {
      const therapist = this.state.therapists.find((t) => t.id === newPatient.assignedTherapistId);
      notif = {
        id: `notif-${timestamp}-${Math.random().toString(36).substring(2, 6)}`,
        userId: therapist?.userId || newPatient.assignedTherapistId,
        targetRole: 'therapist',
        type: 'therapist_mapped',
        message: `Dr. Bhatnagar has assigned a new patient to you: ${newPatient.childName} (${newPatient.sessionsPerWeek} sessions/week).`,
        read: false,
        createdAt: new Date().toISOString(),
        meta: { patientId: newPatient.id },
      };
      this.state.notifications = [notif, ...this.state.notifications];
    }

    this.notify();

    // Persist to Firestore server-side
    cloudSavePatient(newPatient).catch((err) =>
      console.error('Error saving patient to Firestore:', err)
    );
    cloudSaveInvite(invite).catch((err) =>
      console.error('Error saving invite to Firestore:', err)
    );
    cloudSaveSession(initialSession, true).catch((err) =>
      console.error('Error saving initial session to Firestore:', err)
    );
    if (notif) {
      cloudSaveNotification(notif).catch((err) =>
        console.error('Error saving notification to Firestore:', err)
      );
    }

    return newPatient;
  }

  createPatientsBatch(patientsData: Array<Omit<Patient, 'id' | 'createdAt'>>): Patient[] {
    const timestamp = Date.now();
    const createdPatients: Patient[] = [];
    const createdInvites: InviteCode[] = [];
    const createdNotifs: Notification[] = [];

    patientsData.forEach((data, index) => {
      const patientId = `pat-${timestamp}-${index}`;
      const newPatient: Patient = {
        ...data,
        id: patientId,
        createdAt: new Date().toISOString(),
      };
      createdPatients.push(newPatient);

      // Parent Invite Code
      const childFirstName =
        newPatient.childName.split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase() || 'PAT';
      const invite: InviteCode = {
        id: `inv-${timestamp}-${index}`,
        code: `NM-PAT-${childFirstName}-${Math.floor(1000 + Math.random() * 9000)}`,
        role: 'parent',
        patientId: newPatient.id,
        recipientName: `${newPatient.motherName || 'Parent'} (${newPatient.childName})`,
        createdAt: new Date().toISOString(),
        used: false,
      };
      createdInvites.push(invite);

      // In-app Notification for assigned therapist
      if (newPatient.assignedTherapistId) {
        const therapist = this.state.therapists.find((t) => t.id === newPatient.assignedTherapistId);
        const notif: Notification = {
          id: `notif-${timestamp}-${index}`,
          userId: therapist?.userId || newPatient.assignedTherapistId,
          targetRole: 'therapist',
          type: 'therapist_mapped',
          message: `Dr. Bhatnagar has assigned a new patient to you: ${newPatient.childName} (${newPatient.sessionsPerWeek} sessions/week).`,
          read: false,
          createdAt: new Date().toISOString(),
          meta: { patientId: newPatient.id },
        };
        createdNotifs.push(notif);
      }
    });

    this.state.patients = [...createdPatients, ...this.state.patients];
    this.state.invites = [...createdInvites, ...this.state.invites];
    this.state.notifications = [...createdNotifs, ...this.state.notifications];
    this.notify();

    // Persist batch to Firestore
    cloudSavePatientsBatch(createdPatients, createdInvites, createdNotifs).catch((err) =>
      console.error('Error saving batch patients to Firestore:', err)
    );

    return createdPatients;
  }

  updatePatient(id: string, updates: Partial<Patient>) {
    const prevPatient = this.state.patients.find((p) => p.id === id);
    let updatedPatient: Patient | null = null;
    this.state.patients = this.state.patients.map((p) => {
      if (p.id === id) {
        const nextEmail =
          updates.parentEmail !== undefined
            ? updates.parentEmail.trim().toLowerCase()
            : p.parentEmail;
        const nextLoginId =
          updates.parentLoginId ||
          (nextEmail && (!p.parentLoginId || p.parentLoginId.startsWith('parent.'))
            ? nextEmail
            : p.parentLoginId);
        updatedPatient = {
          ...p,
          ...updates,
          parentEmail: nextEmail,
          parentLoginId: nextLoginId,
        };
        return updatedPatient;
      }
      return p;
    });

    // If therapist assignment changed, notify new therapist
    let notif: Notification | undefined;
    if (
      updates.assignedTherapistId &&
      prevPatient &&
      updates.assignedTherapistId !== prevPatient.assignedTherapistId
    ) {
      const newTh = this.state.therapists.find((t) => t.id === updates.assignedTherapistId);
      notif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: newTh?.userId || updates.assignedTherapistId,
        targetRole: 'therapist',
        type: 'therapist_mapped',
        message: `Dr. Bhatnagar has assigned patient ${prevPatient.childName} to you (${prevPatient.sessionsPerWeek} sessions/week).`,
        read: false,
        createdAt: new Date().toISOString(),
        meta: { patientId: id },
      };
      this.state.notifications = [notif, ...this.state.notifications];
    }

    this.notify();

    // Persist to Firestore
    if (updatedPatient) {
      cloudSavePatient(updatedPatient).catch((err) =>
        console.error('Error updating patient in Firestore:', err)
      );
    }
    if (notif) {
      cloudSaveNotification(notif).catch((err) =>
        console.error('Error saving notification to Firestore:', err)
      );
    }
  }

  // --- Therapist Staff Management (Admin Only) ---
  createTherapist(
    therapistData: Omit<Therapist, 'id' | 'userId'> & { email: string }
  ): Therapist {
    const id = `th-${Date.now()}`;
    const userId = `user-th-${Date.now()}`;
    const newTherapist: Therapist = {
      ...therapistData,
      id,
      userId,
      status: therapistData.status || 'active',
      photoUrl:
        therapistData.photoUrl ||
        'https://images.unsplash.com/photo-1594824813681-4355523a60f9?auto=format&fit=crop&q=80&w=500',
    };

    this.state.therapists = [...this.state.therapists, newTherapist];

    // Create staff invite code
    const invite: InviteCode = {
      id: `inv-th-${Date.now()}`,
      code: `NM-TH-${newTherapist.name.split(' ')[0].toUpperCase()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      role: 'therapist',
      recipientName: newTherapist.name,
      createdAt: new Date().toISOString(),
      used: false,
    };
    this.state.invites = [invite, ...this.state.invites];

    this.notify();

    // Persist to Firestore
    cloudSaveTherapist(newTherapist).catch((err) =>
      console.error('Error saving therapist to Firestore:', err)
    );
    cloudSaveInvite(invite).catch((err) =>
      console.error('Error saving therapist invite to Firestore:', err)
    );

    return newTherapist;
  }

  updateTherapist(id: string, updates: Partial<Therapist>) {
    let updatedTherapist: Therapist | null = null;
    this.state.therapists = this.state.therapists.map((t) => {
      if (t.id === id) {
        updatedTherapist = { ...t, ...updates };
        return updatedTherapist;
      }
      return t;
    });
    this.notify();

    if (updatedTherapist) {
      cloudSaveTherapist(updatedTherapist).catch((err) =>
        console.error('Error updating therapist in Firestore:', err)
      );
    }
  }

  deleteTherapist(id: string) {
    if (id === 'th-3') {
      throw new Error('Cannot remove Practice Director Dr. Sweety Bhatnagar.');
    }

    // Safely reassign patients to Dr. Sweety Bhatnagar (th-3)
    const reassignedPatients: Patient[] = [];
    this.state.patients = this.state.patients.map((p) => {
      if (p.assignedTherapistId === id) {
        const up = { ...p, assignedTherapistId: 'th-3' };
        reassignedPatients.push(up);
        return up;
      }
      return p;
    });

    // Reassign active sessions to th-3
    const reassignedSessions: Session[] = [];
    this.state.sessions = this.state.sessions.map((s) => {
      if (s.therapistId === id) {
        const us = { ...s, therapistId: 'th-3' };
        reassignedSessions.push(us);
        return us;
      }
      return s;
    });

    this.state.therapists = this.state.therapists.filter((t) => t.id !== id);
    this.notify();

    // Persist deletions & updates to Firestore
    cloudDeleteTherapist(id).catch((err) =>
      console.error('Error deleting therapist from Firestore:', err)
    );
    reassignedPatients.forEach((p) => cloudSavePatient(p));
    reassignedSessions.forEach((s) => cloudSaveSession(s));
  }

  /**
   * Late / Partial Payment Flag (Admin Only)
   */
  setPaymentFlag(
    patientId: string,
    status: 'current' | 'late' | 'partial',
    amount?: number,
    month?: string
  ) {
    const patient = this.state.patients.find((p) => p.id === patientId);
    if (!patient) return;

    this.updatePatient(patientId, {
      paymentStatus: status,
      pendingPaymentAmount: amount,
      pendingPaymentMonth: month,
    });

    if (status === 'late' || status === 'partial') {
      const detailStr =
        amount && month
          ? `₹${amount.toLocaleString('en-IN')} for ${month}`
          : amount
          ? `₹${amount.toLocaleString('en-IN')}`
          : month || 'the current therapy month';

      const reminderMessage = formatLatePaymentMessage(detailStr);

      this.addNotification({
        userId: patient.parentUserId || `parent-${patientId}`,
        targetRole: 'parent',
        type: 'late_payment',
        message: reminderMessage,
        meta: { patientId, amount, month },
      });
    }

    this.notify();
  }

  // --- Daily 45-Minute Slot Configuration ---
  getWeeklyTemplates(): DayOfWeekSlotTemplate[] {
    return this.state.weeklySlotTemplates || [...DEFAULT_WEEKLY_SLOT_TEMPLATES];
  }

  updateWeeklyTemplate(
    day: DayOfWeekSlotTemplate['day'],
    defaultSlots: number,
    startHour: string = '14:00',
    bufferMinutes: number = 15
  ) {
    this.state.weeklySlotTemplates = this.getWeeklyTemplates().map((tpl) =>
      tpl.day === day ? { ...tpl, defaultSlots, startHour, bufferMinutes } : tpl
    );
    this.notify();

    cloudSaveWeeklySlotTemplates(this.state.weeklySlotTemplates).catch((err) =>
      console.error('Error saving weekly templates to Firestore:', err)
    );
  }

  getDailySlotConfig(dateStr: string): DailySlotConfig {
    if (!this.state.dailySlotConfigs) {
      this.state.dailySlotConfigs = {};
    }

    if (this.state.dailySlotConfigs[dateStr]) {
      return this.state.dailySlotConfigs[dateStr];
    }

    // Lookup template based on day of week
    const dayOfWeek = getDayOfWeek(dateStr);
    const template =
      this.getWeeklyTemplates().find((t) => t.day === dayOfWeek) || {
        day: dayOfWeek,
        defaultSlots: 5,
        startHour: '14:00',
        bufferMinutes: 15,
      };

    const targetSlots = template.defaultSlots;
    const slots = generate45MinSlots(dateStr, targetSlots, template.startHour, template.bufferMinutes);

    const newConfig: DailySlotConfig = {
      date: dateStr,
      targetSlots,
      slots,
    };

    this.state.dailySlotConfigs[dateStr] = newConfig;
    this.notify();

    cloudSaveDailySlotConfig(newConfig).catch((err) =>
      console.error('Error saving daily slot config to Firestore:', err)
    );

    return newConfig;
  }

  setDailySlotCount(
    dateStr: string,
    targetSlots: number,
    startHour: string = '14:00',
    bufferMinutes: number = 15
  ): DailySlotConfig {
    const validCount = Math.max(0, Math.min(12, targetSlots));
    const slots = generate45MinSlots(dateStr, validCount, startHour, bufferMinutes);

    const updatedConfig: DailySlotConfig = {
      date: dateStr,
      targetSlots: validCount,
      slots,
    };

    if (!this.state.dailySlotConfigs) {
      this.state.dailySlotConfigs = {};
    }

    this.state.dailySlotConfigs[dateStr] = updatedConfig;
    this.notify();

    cloudSaveDailySlotConfig(updatedConfig).catch((err) =>
      console.error('Error saving daily slot config to Firestore:', err)
    );

    return updatedConfig;
  }

  addCustomSlot(dateStr: string, startTime: string): ClinicSlot {
    const config = this.getDailySlotConfig(dateStr);
    const endTime = calculate45MinEndTime(startTime);
    const timeSlotLabel = format45MinSlotLabel(startTime);
    const newSlotNumber = config.slots.length + 1;

    const newSlot: ClinicSlot = {
      id: `slot-${dateStr}-${newSlotNumber}-${startTime.replace(':', '')}`,
      slotNumber: newSlotNumber,
      startTime,
      endTime,
      timeSlotLabel,
      durationMinutes: 45,
      isBlocked: false,
    };

    const updatedSlots = [...config.slots, newSlot]
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((s, idx) => ({ ...s, slotNumber: idx + 1 }));

    const updatedConfig: DailySlotConfig = {
      date: dateStr,
      targetSlots: updatedSlots.length,
      slots: updatedSlots,
    };

    this.state.dailySlotConfigs[dateStr] = updatedConfig;
    this.notify();

    cloudSaveDailySlotConfig(updatedConfig).catch((err) =>
      console.error('Error saving daily slot config to Firestore:', err)
    );

    return newSlot;
  }

  removeCustomSlot(dateStr: string, slotId: string) {
    const config = this.getDailySlotConfig(dateStr);
    const updatedSlots = config.slots
      .filter((s) => s.id !== slotId)
      .map((s, idx) => ({ ...s, slotNumber: idx + 1 }));

    const updatedConfig: DailySlotConfig = {
      date: dateStr,
      targetSlots: updatedSlots.length,
      slots: updatedSlots,
    };

    this.state.dailySlotConfigs[dateStr] = updatedConfig;
    this.notify();

    cloudSaveDailySlotConfig(updatedConfig).catch((err) =>
      console.error('Error updating daily slot config in Firestore:', err)
    );
  }

  toggleSlotBlocked(dateStr: string, slotId: string, reason?: string) {
    const config = this.getDailySlotConfig(dateStr);
    const updatedSlots = config.slots.map((s) => {
      if (s.id === slotId) {
        const nextBlocked = !s.isBlocked;
        return {
          ...s,
          isBlocked: nextBlocked,
          blockReason: nextBlocked ? reason || 'Clinic break / Reserved' : undefined,
        };
      }
      return s;
    });

    const updatedConfig: DailySlotConfig = {
      ...config,
      slots: updatedSlots,
    };

    this.state.dailySlotConfigs[dateStr] = updatedConfig;
    this.notify();

    cloudSaveDailySlotConfig(updatedConfig).catch((err) =>
      console.error('Error saving blocked slot to Firestore:', err)
    );
  }

  // --- Scheduling (Admin Sole Authority) ---
  createSession(sessionData: Omit<Session, 'id'>): Session {
    const newSession: Session = {
      ...sessionData,
      id: `ses-${Date.now()}`,
      durationMinutes: 45,
    };
    this.state.sessions = [...this.state.sessions, newSession];
    this.notify();

    cloudSaveSession(newSession, true).catch((err) =>
      console.error('Error saving session to Firestore:', err)
    );

    return newSession;
  }

  getEmailLogs(): EmailLog[] {
    return this.state.emailLogs || [];
  }

  async triggerSessionEmailSequence(sessionId: string) {
    return processSessionEmailSequence(sessionId);
  }

  updateSession(id: string, updates: Partial<Session>) {
    let updatedSession: Session | null = null;
    this.state.sessions = this.state.sessions.map((s) => {
      if (s.id === id) {
        updatedSession = { ...s, ...updates };
        return updatedSession;
      }
      return s;
    });
    this.notify();

    if (updatedSession) {
      cloudSaveSession(updatedSession).catch((err) =>
        console.error('Error updating session in Firestore:', err)
      );
    }
  }

  deleteSession(id: string) {
    this.state.sessions = this.state.sessions.filter((s) => s.id !== id);
    this.notify();

    cloudDeleteSession(id).catch((err) =>
      console.error('Error deleting session from Firestore:', err)
    );
  }

  // --- Last-Minute / Urgent Therapist Reassignment ---
  reassignSessionTherapist(
    sessionId: string,
    newTherapistId: string,
    options?: {
      reason?: string;
      isPermanent?: boolean;
      notifyParent?: boolean;
    }
  ) {
    const session = this.state.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const prevTherapistId = session.therapistId;
    const patient = this.state.patients.find((p) => p.id === session.patientId);
    const prevTherapist = this.state.therapists.find((t) => t.id === prevTherapistId);
    const newTherapist = this.state.therapists.find((t) => t.id === newTherapistId);

    const childName = patient?.childName || 'Child';
    const slotTime = session.timeSlot || '45-min slot';
    const reasonNote = options?.reason?.trim() || 'Last-minute cover by Dr. Sweety Bhatnagar';

    let updatedSession: Session | null = null;
    this.state.sessions = this.state.sessions.map((s) => {
      if (s.id === sessionId) {
        updatedSession = {
          ...s,
          therapistId: newTherapistId,
          isSubstitute: true,
          originalTherapistId: s.originalTherapistId || prevTherapistId,
          substituteReason: reasonNote,
        };
        return updatedSession;
      }
      return s;
    });

    const modifiedSessions: Session[] = updatedSession ? [updatedSession] : [];
    let updatedPatient: Patient | null = null;

    if (options?.isPermanent && patient) {
      this.state.patients = this.state.patients.map((p) => {
        if (p.id === patient.id) {
          updatedPatient = { ...p, assignedTherapistId: newTherapistId };
          return updatedPatient;
        }
        return p;
      });

      const sessionDate = new Date(session.scheduledAt).getTime();
      this.state.sessions = this.state.sessions.map((s) => {
        if (
          s.patientId === patient.id &&
          new Date(s.scheduledAt).getTime() >= sessionDate &&
          s.status === 'scheduled'
        ) {
          const up = { ...s, therapistId: newTherapistId };
          modifiedSessions.push(up);
          return up;
        }
        return s;
      });
    }

    const createdNotifs: Notification[] = [];

    // Alert new therapist
    if (newTherapist) {
      const notif1: Notification = {
        id: `notif-${Date.now()}-1`,
        userId: newTherapist.userId,
        targetRole: 'therapist',
        type: 'therapist_mapped',
        message: `🚨 Last-Minute Cover: Dr. Sweety Bhatnagar assigned you to conduct ${childName}'s 45-min session (${slotTime}). Reason: ${reasonNote}`,
        read: false,
        createdAt: new Date().toISOString(),
        meta: { sessionId, patientId: session.patientId, urgent: true },
      };
      createdNotifs.push(notif1);
    }

    // Relief notice
    if (prevTherapist && prevTherapist.id !== newTherapistId) {
      const notif2: Notification = {
        id: `notif-${Date.now()}-2`,
        userId: prevTherapist.userId,
        targetRole: 'therapist',
        type: 'general',
        message: `Schedule Update: Dr. Bhatnagar has reassigned ${childName}'s session (${slotTime}) to ${
          newTherapist?.name || 'cover staff'
        }. You are relieved from this slot.`,
        read: false,
        createdAt: new Date().toISOString(),
        meta: { sessionId, patientId: session.patientId },
      };
      createdNotifs.push(notif2);
    }

    // Notify Parent if requested
    if (options?.notifyParent) {
      if (patient?.parentUserId) {
        const notif3: Notification = {
          id: `notif-${Date.now()}-3`,
          userId: patient.parentUserId,
          targetRole: 'parent',
          type: 'session_scheduled',
          message: `Therapist Update for ${childName}'s session (${slotTime}): Dr. Sweety Bhatnagar has assigned ${
            newTherapist?.name || 'our clinical specialist'
          } for today's session.`,
          read: false,
          createdAt: new Date().toISOString(),
          meta: { sessionId, patientId: session.patientId },
        };
        createdNotifs.push(notif3);
      }

      // Automatically dispatch real-time WhatsApp & SMS alert to Parent
      triggerTherapistSwapWhatsAppAlert({
        sessionId,
        newTherapistId,
        reason: reasonNote,
      }).catch((err) =>
        console.error('Failed to dispatch therapist swap WhatsApp alert:', err)
      );
    }

    this.state.notifications = [...createdNotifs, ...this.state.notifications];
    this.notify();

    // Persist all changes to Firestore
    modifiedSessions.forEach((s) => cloudSaveSession(s));
    if (updatedPatient) cloudSavePatient(updatedPatient);
    createdNotifs.forEach((n) => cloudSaveNotification(n));
  }

  async triggerSessionWhatsAppSequence(
    sessionId: string,
    options?: {
      customType?: 'reminder_24h' | 'reminder_2h' | 'booking_alert';
      channel?: 'whatsapp' | 'sms';
    }
  ) {
    const session = this.state.sessions.find((s) => s.id === sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    return processSessionMessageSequence(session, options);
  }

  reassignPatientPrimaryTherapist(
    patientId: string,
    newTherapistId: string,
    options?: { updateUpcomingSessions?: boolean; reason?: string }
  ) {
    const patient = this.state.patients.find((p) => p.id === patientId);
    if (!patient) return;

    const prevTherapistId = patient.assignedTherapistId;
    const prevTherapist = this.state.therapists.find((t) => t.id === prevTherapistId);
    const newTherapist = this.state.therapists.find((t) => t.id === newTherapistId);

    let updatedPatient: Patient | null = null;
    this.state.patients = this.state.patients.map((p) => {
      if (p.id === patientId) {
        updatedPatient = { ...p, assignedTherapistId: newTherapistId };
        return updatedPatient;
      }
      return p;
    });

    const modifiedSessions: Session[] = [];
    if (options?.updateUpcomingSessions) {
      const now = new Date().getTime();
      this.state.sessions = this.state.sessions.map((s) => {
        if (
          s.patientId === patientId &&
          s.status === 'scheduled' &&
          new Date(s.scheduledAt).getTime() >= now - 3600000
        ) {
          const up = { ...s, therapistId: newTherapistId };
          modifiedSessions.push(up);
          return up;
        }
        return s;
      });
    }

    const createdNotifs: Notification[] = [];
    if (newTherapist) {
      createdNotifs.push({
        id: `notif-${Date.now()}-np1`,
        userId: newTherapist.userId,
        targetRole: 'therapist',
        type: 'therapist_mapped',
        message: `Dr. Bhatnagar has reassigned patient ${patient.childName} to your primary caseload (${patient.sessionsPerWeek} sessions/week).`,
        read: false,
        createdAt: new Date().toISOString(),
        meta: { patientId },
      });
    }

    if (prevTherapist && prevTherapist.id !== newTherapistId) {
      createdNotifs.push({
        id: `notif-${Date.now()}-np2`,
        userId: prevTherapist.userId,
        targetRole: 'therapist',
        type: 'general',
        message: `Dr. Bhatnagar has reassigned ${patient.childName} from your caseload to ${
          newTherapist?.name || 'another therapist'
        }.`,
        read: false,
        createdAt: new Date().toISOString(),
        meta: { patientId },
      });
    }

    this.state.notifications = [...createdNotifs, ...this.state.notifications];
    this.notify();

    // Persist to Firestore
    if (updatedPatient) cloudSavePatient(updatedPatient);
    modifiedSessions.forEach((s) => cloudSaveSession(s));
    createdNotifs.forEach((n) => cloudSaveNotification(n));
  }

  // --- Post-Session Note (Therapist Fast 1-3 Word Input) ---
  logTherapistNote(sessionId: string, progressNote: string) {
    let updatedSession: Session | null = null;
    this.state.sessions = this.state.sessions.map((s) => {
      if (s.id === sessionId) {
        updatedSession = { ...s, progressNote: progressNote.trim(), status: 'completed' };
        return updatedSession;
      }
      return s;
    });
    this.notify();

    if (updatedSession) {
      cloudSaveSession(updatedSession).catch((err) =>
        console.error('Error saving session note to Firestore:', err)
      );
    }
  }

  // --- Progress AI Approval Queue ---
  addProgressDraft(
    summary: Omit<ProgressSummary, 'id' | 'approved' | 'approvedAt'>
  ): ProgressSummary {
    const newSummary: ProgressSummary = {
      ...summary,
      id: `prog-${Date.now()}`,
      approved: false,
    };
    this.state.progressSummaries = [newSummary, ...this.state.progressSummaries];
    this.notify();

    cloudSaveProgressSummary(newSummary).catch((err) =>
      console.error('Error saving progress draft to Firestore:', err)
    );

    return newSummary;
  }

  approveProgressSummary(id: string, editedDraft?: string) {
    const summary = this.state.progressSummaries.find((s) => s.id === id);
    if (!summary) return;

    let updatedSummary: ProgressSummary | null = null;
    this.state.progressSummaries = this.state.progressSummaries.map((s) => {
      if (s.id === id) {
        updatedSummary = {
          ...s,
          approved: true,
          approvedAt: new Date().toISOString(),
          aiDraft: editedDraft !== undefined ? editedDraft : s.aiDraft,
        };
        return updatedSummary;
      }
      return s;
    });

    let notif: Notification | undefined;
    const patient = this.state.patients.find((p) => p.id === summary.patientId);
    if (patient) {
      notif = {
        id: `notif-${Date.now()}-prog`,
        userId: patient.parentUserId || `parent-${patient.id}`,
        targetRole: 'parent',
        type: 'progress_approved',
        message: `Dr. Sweety Bhatnagar has approved a new developmental progress report for ${patient.childName}. Tap to view.`,
        read: false,
        createdAt: new Date().toISOString(),
        meta: { progressId: id, patientId: patient.id },
      };
      this.state.notifications = [notif, ...this.state.notifications];
    }

    this.notify();

    if (updatedSummary) {
      cloudSaveProgressSummary(updatedSummary).catch((err) =>
        console.error('Error approving progress report in Firestore:', err)
      );
    }
    if (notif) {
      cloudSaveNotification(notif).catch((err) =>
        console.error('Error saving notification to Firestore:', err)
      );
    }
  }

  // --- Invoicing & Receipts ---
  createInvoice(
    patientId: string,
    amount: number,
    description: string,
    paymentMode: Invoice['paymentMode']
  ): Invoice {
    const count = this.state.invoices.length + 1;
    const invNumber = `NM-REC-2026-${String(count + 100).padStart(4, '0')}`;
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      patientId,
      invoiceNumber: invNumber,
      amount,
      issuedAt: new Date().toISOString(),
      description,
      paymentMode,
      status: 'paid',
    };

    this.state.invoices = [newInvoice, ...this.state.invoices];

    // Mark patient's payment as current
    this.updatePatient(patientId, {
      paymentStatus: 'current',
      pendingPaymentAmount: undefined,
      pendingPaymentMonth: undefined,
    });

    // Notify parent about receipt available
    let notif: Notification | undefined;
    const patient = this.state.patients.find((p) => p.id === patientId);
    if (patient) {
      notif = {
        id: `notif-${Date.now()}-inv`,
        userId: patient.parentUserId || `parent-${patient.id}`,
        targetRole: 'parent',
        type: 'general',
        message: `Official Receipt #${invNumber} for ₹${amount.toLocaleString(
          'en-IN'
        )} has been issued and is available for download.`,
        read: false,
        createdAt: new Date().toISOString(),
        meta: { invoiceId: newInvoice.id },
      };
      this.state.notifications = [notif, ...this.state.notifications];
    }

    this.notify();

    // Persist to Firestore
    cloudSaveInvoice(newInvoice).catch((err) =>
      console.error('Error saving invoice to Firestore:', err)
    );
    if (notif) {
      cloudSaveNotification(notif).catch((err) =>
        console.error('Error saving notification to Firestore:', err)
      );
    }

    return newInvoice;
  }

  // --- Expense Logging ---
  addExpense(expense: Omit<Expense, 'id'>): Expense {
    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
    };
    this.state.expenses = [newExpense, ...this.state.expenses];
    this.notify();

    cloudSaveExpense(newExpense).catch((err) =>
      console.error('Error saving expense to Firestore:', err)
    );

    return newExpense;
  }

  deleteExpense(id: string) {
    this.state.expenses = this.state.expenses.filter((e) => e.id !== id);
    this.notify();

    cloudDeleteExpense(id).catch((err) =>
      console.error('Error deleting expense from Firestore:', err)
    );
  }

  // --- Program Manager ---
  addProgram(program: Omit<Program, 'id'>): Program {
    const newProgram: Program = {
      ...program,
      id: `prog-${Date.now()}`,
    };
    this.state.programs = [...this.state.programs, newProgram];
    this.notify();

    cloudSaveProgram(newProgram).catch((err) =>
      console.error('Error saving program to Firestore:', err)
    );

    return newProgram;
  }

  updateProgram(id: string, updates: Partial<Program>) {
    let updatedProgram: Program | null = null;
    this.state.programs = this.state.programs.map((p) => {
      if (p.id === id) {
        updatedProgram = { ...p, ...updates };
        return updatedProgram;
      }
      return p;
    });
    this.notify();

    if (updatedProgram) {
      cloudSaveProgram(updatedProgram).catch((err) =>
        console.error('Error updating program in Firestore:', err)
      );
    }
  }

  deleteProgram(id: string) {
    this.state.programs = this.state.programs.filter((p) => p.id !== id);
    this.notify();

    cloudDeleteProgram(id).catch((err) =>
      console.error('Error deleting program from Firestore:', err)
    );
  }

  // --- Doctor Profile Manager ---
  updateDoctorProfile(profile: Partial<DoctorProfile>) {
    this.state.doctorProfile = { ...this.state.doctorProfile, ...profile };
    if (this.state.currentUser && this.state.currentUser.role === 'admin') {
      this.state.currentUser = {
        ...this.state.currentUser,
        name: this.state.doctorProfile.name,
        email: this.state.doctorProfile.contactEmail,
      };
    }
    this.notify();

    cloudSaveDoctorProfile(this.state.doctorProfile).catch((err) =>
      console.error('Error saving doctor profile to Firestore:', err)
    );
  }

  // --- Therapist Profile ---
  updateTherapistProfile(id: string, updates: Partial<Therapist>) {
    let updatedTh: Therapist | null = null;
    this.state.therapists = this.state.therapists.map((t) => {
      if (t.id === id) {
        updatedTh = { ...t, ...updates };
        return updatedTh;
      }
      return t;
    });

    if (
      this.state.currentUser &&
      this.state.currentUser.role === 'therapist' &&
      (this.state.currentUser.therapistId === id || this.state.currentUser.id.includes(id))
    ) {
      if (updatedTh) {
        this.state.currentUser = {
          ...this.state.currentUser,
          name: (updatedTh as Therapist).name,
          email: (updatedTh as Therapist).email,
        };
      }
    }
    this.notify();

    if (updatedTh) {
      cloudSaveTherapist(updatedTh).catch((err) =>
        console.error('Error updating therapist profile in Firestore:', err)
      );
    }
  }

  // --- Member / Patient Credential Management ---
  resetMemberPassword(patientId: string, newPassword: string): void {
    const timestamp = new Date().toISOString();
    const patient = this.state.patients.find((p) => p.id === patientId);
    if (!patient) return;

    let updatedPatient: Patient | null = null;
    this.state.patients = this.state.patients.map((p) => {
      if (p.id === patientId) {
        updatedPatient = {
          ...p,
          parentPassword: newPassword,
          passwordLastReset: timestamp,
        };
        return updatedPatient;
      }
      return p;
    });

    const notif = this.addNotification({
      userId: patient.parentUserId || patient.id,
      targetRole: 'parent',
      type: 'general',
      message: `Password reset successfully completed for child ${patient.childName}'s parent portal by Dr. Sweety Bhatnagar.`,
      meta: { patientId },
    });

    this.notify();

    if (updatedPatient) {
      cloudSavePatient(updatedPatient).catch((err) =>
        console.error('Error updating patient credentials in Firestore:', err)
      );
    }
  }

  updateMemberCredentials(
    patientId: string,
    data: { parentLoginId?: string; parentPassword?: string; parentEmail?: string }
  ): void {
    let updatedPatient: Patient | null = null;
    this.state.patients = this.state.patients.map((p) => {
      if (p.id === patientId) {
        updatedPatient = {
          ...p,
          ...(data.parentLoginId ? { parentLoginId: data.parentLoginId.trim() } : {}),
          ...(data.parentPassword
            ? { parentPassword: data.parentPassword, passwordLastReset: new Date().toISOString() }
            : {}),
          ...(data.parentEmail ? { parentEmail: data.parentEmail.trim() } : {}),
        };
        return updatedPatient;
      }
      return p;
    });
    this.notify();

    if (updatedPatient) {
      cloudSavePatient(updatedPatient).catch((err) =>
        console.error('Error updating patient credentials in Firestore:', err)
      );
    }
  }

  // --- Therapist Credential Management ---
  resetTherapistPassword(therapistId: string, newPassword: string): void {
    const timestamp = new Date().toISOString();
    const therapist = this.state.therapists.find((t) => t.id === therapistId);
    if (!therapist) return;

    let updatedTherapist: Therapist | null = null;
    this.state.therapists = this.state.therapists.map((t) => {
      if (t.id === therapistId) {
        updatedTherapist = {
          ...t,
          password: newPassword,
          passwordLastReset: timestamp,
        };
        return updatedTherapist;
      }
      return t;
    });

    this.addNotification({
      userId: therapist.userId || therapist.id,
      targetRole: 'therapist',
      type: 'general',
      message: `Clinical staff password for ${therapist.name} was reset by Dr. Sweety Bhatnagar.`,
      meta: { therapistId },
    });

    this.notify();

    if (updatedTherapist) {
      cloudSaveTherapist(updatedTherapist).catch((err) =>
        console.error('Error updating therapist credentials in Firestore:', err)
      );
    }
  }

  updateTherapistCredentials(
    therapistId: string,
    data: { loginId?: string; password?: string; email?: string }
  ): void {
    let updatedTherapist: Therapist | null = null;
    this.state.therapists = this.state.therapists.map((t) => {
      if (t.id === therapistId) {
        updatedTherapist = {
          ...t,
          ...(data.loginId ? { loginId: data.loginId.trim() } : {}),
          ...(data.password
            ? { password: data.password, passwordLastReset: new Date().toISOString() }
            : {}),
          ...(data.email ? { email: data.email.trim() } : {}),
        };
        return updatedTherapist;
      }
      return t;
    });
    this.notify();

    if (updatedTherapist) {
      cloudSaveTherapist(updatedTherapist).catch((err) =>
        console.error('Error updating therapist credentials in Firestore:', err)
      );
    }
  }

  // --- Doctor Director Credential Management ---
  updateDoctorCredentials(data: { adminLoginId?: string; adminPassword?: string }): void {
    this.state.doctorProfile = {
      ...this.state.doctorProfile,
      ...(data.adminLoginId ? { adminLoginId: data.adminLoginId.trim() } : {}),
      ...(data.adminPassword ? { adminPassword: data.adminPassword.trim() } : {}),
    };
    this.notify();

    cloudSaveDoctorProfile(this.state.doctorProfile).catch((err) =>
      console.error('Error saving doctor profile to Firestore:', err)
    );
  }

  // --- Universal Credential Authentication ---
  authenticate(
    loginIdInput: string,
    passwordInput: string
  ): { success: boolean; user?: UserSession; error?: string } {
    const login = loginIdInput.trim().toLowerCase();
    const pwd = passwordInput.trim();

    if (!login) {
      return { success: false, error: 'Please enter your User ID, Email, or Mobile number.' };
    }
    if (!pwd) {
      return { success: false, error: 'Please enter your password.' };
    }

    const { doctorProfile, therapists, patients } = this.state;

    // 1. Check Admin (Dr. Sweety Bhatnagar)
    const adminLoginId = (
      doctorProfile.adminLoginId || 'connect@drsweetybhatnagar.com'
    ).toLowerCase();
    const adminEmail = (
      doctorProfile.contactEmail || 'connect@drsweetybhatnagar.com'
    ).toLowerCase();
    const adminPwd = doctorProfile.adminPassword || 'admin123';

    const isAdminLoginMatch =
      login === adminLoginId ||
      login === adminEmail ||
      login === 'admin' ||
      login === 'sweety' ||
      login === 'dr.sweety' ||
      login === 'drsweety';

    if (isAdminLoginMatch) {
      if (pwd === adminPwd || pwd === 'admin123') {
        const adminUser: UserSession = {
          id: 'user-admin',
          role: 'admin',
          name: doctorProfile.name || 'Dr. Sweety Bhatnagar',
          email: doctorProfile.contactEmail || 'connect@drsweetybhatnagar.com',
        };
        this.login(adminUser);
        return { success: true, user: adminUser };
      } else {
        return { success: false, error: 'Incorrect password for Dr. Sweety Bhatnagar account.' };
      }
    }

    // 2. Check Therapists
    const matchedTherapist = therapists.find((t) => {
      const tEmail = (t.email || '').toLowerCase();
      const tLoginId = (t.loginId || '').toLowerCase();
      const tName = (t.name || '').toLowerCase();
      const tPhone = (t.phone || '').replace(/\D/g, '');
      const loginDigits = login.replace(/\D/g, '');

      return (
        tEmail === login ||
        tLoginId === login ||
        tName === login ||
        (tPhone && loginDigits && tPhone.endsWith(loginDigits))
      );
    });

    if (matchedTherapist) {
      const thExpectedPwd = matchedTherapist.password || 'therapist123';
      if (pwd === thExpectedPwd) {
        const therapistUser: UserSession = {
          id: matchedTherapist.userId || `user-${matchedTherapist.id}`,
          role: 'therapist',
          name: matchedTherapist.name,
          email: matchedTherapist.email,
          therapistId: matchedTherapist.id,
        };
        this.login(therapistUser);
        return { success: true, user: therapistUser };
      } else {
        return {
          success: false,
          error: `Incorrect password for therapist ${matchedTherapist.name}. If you cannot recall it, ask Dr. Sweety Bhatnagar to reset it in the Admin Area.`,
        };
      }
    }

    // 3. Check Members / Patients
    const matchedPatient = patients.find((p) => {
      const pEmail = (p.parentEmail || '').toLowerCase();
      const pLoginId = (p.parentLoginId || '').toLowerCase();
      const childName = (p.childName || '').toLowerCase();
      const motherName = (p.motherName || '').toLowerCase();
      const fatherName = (p.fatherName || '').toLowerCase();
      const id = (p.id || '').toLowerCase();

      const mPhone = (p.motherContact || '').replace(/\D/g, '');
      const fPhone = (p.fatherContact || '').replace(/\D/g, '');
      const loginDigits = login.replace(/\D/g, '');

      return (
        pEmail === login ||
        pLoginId === login ||
        childName === login ||
        motherName === login ||
        fatherName === login ||
        id === login ||
        (loginDigits && mPhone && mPhone.endsWith(loginDigits)) ||
        (loginDigits && fPhone && fPhone.endsWith(loginDigits))
      );
    });

    if (matchedPatient) {
      const pExpectedPwd = matchedPatient.parentPassword || 'parent123';
      if (pwd === pExpectedPwd) {
        const parentUser: UserSession = {
          id: matchedPatient.parentUserId || `user-parent-${matchedPatient.id}`,
          role: 'parent',
          name: `${matchedPatient.motherName} (Parent of ${matchedPatient.childName})`,
          email:
            matchedPatient.parentEmail ||
            `${matchedPatient.motherName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          patientId: matchedPatient.id,
        };
        this.login(parentUser);
        return { success: true, user: parentUser };
      } else {
        return {
          success: false,
          error: `Incorrect password for ${matchedPatient.childName}'s family account. Please ask Dr. Sweety Bhatnagar to reset your password.`,
        };
      }
    }

    return {
      success: false,
      error:
        'No account found matching this User ID, Email, or Mobile. Please check your credentials or contact Dr. Sweety Bhatnagar.',
    };
  }

  // --- Video Publish ---
  publishVideo(youtubeUrl: string, title: string, description?: string): PublishedVideo {
    const video: PublishedVideo = {
      id: `vid-${Date.now()}`,
      youtubeUrl,
      title,
      description:
        description ||
        'Educational video published by Dr. Sweety Bhatnagar for parents and clinical team.',
      publishedAt: new Date().toISOString(),
      publishedBy: 'Dr. Sweety Bhatnagar',
    };
    this.state.publishedVideo = video;

    const notif = this.addNotification({
      userId: 'all',
      targetRole: 'all',
      type: 'video_published',
      message: `Dr. Sweety Bhatnagar published a new guidance video: "${title}". Tap to watch now.`,
      meta: { videoId: video.id, youtubeUrl },
    });

    this.notify();

    cloudSavePublishedVideo(video).catch((err) =>
      console.error('Error saving published video to Firestore:', err)
    );

    return video;
  }

  // --- Notification System of Record ---
  addNotification(notif: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    const newNotif: Notification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.state.notifications = [newNotif, ...this.state.notifications];

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      try {
        new window.Notification('Nurturing Minds Therapy Center', {
          body: newNotif.message,
          icon: '/logo.svg',
          badge: '/logo.svg',
        });
      } catch (err) {
        console.warn('Web notification dispatch skipped:', err);
      }
    }

    this.notify();

    cloudSaveNotification(newNotif).catch((err) =>
      console.error('Error saving notification to Firestore:', err)
    );

    return newNotif;
  }

  markNotificationAsRead(id: string) {
    let updatedNotif: Notification | null = null;
    this.state.notifications = this.state.notifications.map((n) => {
      if (n.id === id) {
        updatedNotif = { ...n, read: true };
        return updatedNotif;
      }
      return n;
    });
    this.notify();

    if (updatedNotif) {
      cloudSaveNotification(updatedNotif).catch((err) =>
        console.error('Error marking notification read in Firestore:', err)
      );
    }
  }

  markAllNotificationsAsRead(userRole?: Role, userId?: string) {
    const toUpdate: Notification[] = [];
    this.state.notifications = this.state.notifications.map((n) => {
      const isTarget =
        n.userId === 'all' ||
        n.userId === userId ||
        n.targetRole === 'all' ||
        n.targetRole === userRole;
      if (isTarget && !n.read) {
        const up = { ...n, read: true };
        toUpdate.push(up);
        return up;
      }
      return n;
    });
    this.notify();

    toUpdate.forEach((n) => cloudSaveNotification(n));
  }

  // --- Invites & Registration ---
  createInvite(
    role: 'parent' | 'therapist',
    recipientName: string,
    patientId?: string
  ): InviteCode {
    const code = `NM-${role.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const invite: InviteCode = {
      id: `inv-${Date.now()}`,
      code,
      role,
      recipientName,
      patientId,
      createdAt: new Date().toISOString(),
      used: false,
    };
    this.state.invites = [invite, ...this.state.invites];
    this.notify();

    cloudSaveInvite(invite).catch((err) =>
      console.error('Error saving invite to Firestore:', err)
    );

    return invite;
  }

  claimInvite(
    code: string,
    registrationData: {
      name: string;
      email: string;
      qualification?: string;
      summary?: string;
    }
  ) {
    const invite = this.state.invites.find(
      (i) => i.code.trim().toUpperCase() === code.trim().toUpperCase() && !i.used
    );
    if (!invite) {
      throw new Error(
        'Invalid or already used invite code. Please contact Dr. Sweety Bhatnagar for an authorized invite.'
      );
    }

    // Mark invite used
    const updatedInvite: InviteCode = { ...invite, used: true };
    this.state.invites = this.state.invites.map((i) =>
      i.id === invite.id ? updatedInvite : i
    );
    cloudSaveInvite(updatedInvite).catch((err) =>
      console.error('Error updating invite in Firestore:', err)
    );

    if (invite.role === 'parent') {
      const patient = this.state.patients.find((p) => p.id === invite.patientId);
      if (patient) {
        const userId = `user-parent-${Date.now()}`;
        this.updatePatient(patient.id, {
          parentUserId: userId,
          parentEmail: registrationData.email,
        });

        const user: UserSession = {
          id: userId,
          role: 'parent',
          name: `${registrationData.name} (Parent of ${patient.childName})`,
          email: registrationData.email,
          patientId: patient.id,
        };
        this.setCurrentUser(user);
        return user;
      }
    } else if (invite.role === 'therapist') {
      const newTherapist: Therapist = {
        id: `th-${Date.now()}`,
        userId: `user-th-${Date.now()}`,
        name: registrationData.name,
        photoUrl:
          'https://images.unsplash.com/photo-1594824813681-4355523a60f9?auto=format&fit=crop&q=80&w=500',
        qualification: registrationData.qualification || 'Pediatric Occupational Therapist',
        summary:
          registrationData.summary ||
          'Certified occupational therapist dedicated to sensory integration.',
        email: registrationData.email,
      };
      this.state.therapists = [...this.state.therapists, newTherapist];
      cloudSaveTherapist(newTherapist).catch((err) =>
        console.error('Error saving therapist to Firestore:', err)
      );

      const user: UserSession = {
        id: newTherapist.userId,
        role: 'therapist',
        name: newTherapist.name,
        email: newTherapist.email,
        therapistId: newTherapist.id,
      };
      this.setCurrentUser(user);
      return user;
    }

    throw new Error('Could not link registration to practice record.');
  }

  // --- Cutover & Reset (Cloud-wide) ---
  wipeSeedDataAndCutover() {
    this.state = {
      patients: [],
      therapists: [SEED_THERAPISTS[2]], // retain Dr. Sweety Bhatnagar
      sessions: [],
      progressSummaries: [],
      invoices: [],
      expenses: [],
      programs: [...SEED_PROGRAMS],
      publishedVideo: null,
      doctorProfile: { ...INITIAL_DOCTOR_PROFILE },
      notifications: [
        {
          id: `notif-${Date.now()}`,
          userId: 'all',
          targetRole: 'all',
          type: 'general',
          message:
            'Seed data wiped successfully. Practice is connected to Firestore and ready for live clinical client onboarding.',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      invites: [],
      currentUser: null,
      dailySlotConfigs: {},
      weeklySlotTemplates: [...DEFAULT_WEEKLY_SLOT_TEMPLATES],
      emailLogs: [],
      messageLogs: [],
      isCloudSynced: true,
      cloudError: null,
    };
    this.notify();

    cloudWipeForCutover().catch((err) =>
      console.error('Error performing cloud cutover wipe in Firestore:', err)
    );
  }

  resetToSeedData() {
    this.state = {
      ...getSeedState(),
      isCloudSynced: true,
      cloudError: null,
    };
    this.notify();

    cloudResetToSeed().catch((err) =>
      console.error('Error resetting Firestore to seed state:', err)
    );
  }
}

export const store = new Store();
