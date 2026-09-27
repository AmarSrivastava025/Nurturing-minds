import {
  INITIAL_DOCTOR_PROFILE,
  SEED_EXPENSES,
  SEED_INVITES,
  SEED_INVOICES,
  SEED_NOTIFICATIONS,
  SEED_PATIENTS,
  SEED_PROGRAMS,
  SEED_PUBLISHED_VIDEO,
  SEED_SESSIONS,
  SEED_THERAPISTS,
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
  Session,
  Therapist,
} from '../types';
import { DEFAULT_WEEKLY_SLOT_TEMPLATES } from '../utils/slotUtils';
import {
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  sanitizeForFirestore,
  setDoc,
  writeBatch,
} from './firebase';

export interface FirestoreCollectionsData {
  patients?: Patient[];
  therapists?: Therapist[];
  sessions?: Session[];
  progressSummaries?: ProgressSummary[];
  invoices?: Invoice[];
  expenses?: Expense[];
  programs?: Program[];
  invites?: InviteCode[];
  notifications?: Notification[];
  dailySlotConfigs?: Record<string, DailySlotConfig>;
  doctorProfile?: DoctorProfile;
  publishedVideo?: PublishedVideo | null;
  weeklySlotTemplates?: DayOfWeekSlotTemplate[];
}

/**
 * Check if the Firestore database is already populated.
 * If empty, automatically seeds it with the clinic's initial records.
 */
export async function seedFirestoreIfEmpty(): Promise<boolean> {
  try {
    const patientsCol = collection(db, 'patients');
    const snapshot = await getDocs(patientsCol);

    if (!snapshot.empty) {
      // Already has data in Firestore
      return false;
    }

    console.log('Seeding initial clinic data into Firestore (asia-south1)...');
    const batch = writeBatch(db);

    // 1. Patients
    for (const patient of SEED_PATIENTS) {
      const ref = doc(db, 'patients', patient.id);
      batch.set(ref, sanitizeForFirestore(patient));
    }

    // 2. Therapists
    for (const therapist of SEED_THERAPISTS) {
      const ref = doc(db, 'therapists', therapist.id);
      batch.set(ref, sanitizeForFirestore(therapist));
    }

    // 3. Sessions
    for (const session of SEED_SESSIONS) {
      const ref = doc(db, 'sessions', session.id);
      batch.set(ref, sanitizeForFirestore(session));
    }

    // 4. Invoices
    for (const invoice of SEED_INVOICES) {
      const ref = doc(db, 'invoices', invoice.id);
      batch.set(ref, sanitizeForFirestore(invoice));
    }

    // 5. Expenses
    for (const expense of SEED_EXPENSES) {
      const ref = doc(db, 'expenses', expense.id);
      batch.set(ref, sanitizeForFirestore(expense));
    }

    // 6. Programs
    for (const program of SEED_PROGRAMS) {
      const ref = doc(db, 'programs', program.id);
      batch.set(ref, sanitizeForFirestore(program));
    }

    // 7. Invites
    for (const invite of SEED_INVITES) {
      const ref = doc(db, 'invites', invite.id);
      batch.set(ref, sanitizeForFirestore(invite));
    }

    // 8. Notifications
    for (const notif of SEED_NOTIFICATIONS) {
      const ref = doc(db, 'notifications', notif.id);
      batch.set(ref, sanitizeForFirestore(notif));
    }

    // 9. Initial Progress Summaries
    const initialSummaries: ProgressSummary[] = [
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
        approved: false,
        providerStamp: 'openrouter/meta-llama/llama-3.3-70b-instruct:free',
        notesIncluded: ['Improved clay grasping', 'Good seated attention'],
      },
    ];
    for (const prog of initialSummaries) {
      const ref = doc(db, 'progressSummaries', prog.id);
      batch.set(ref, sanitizeForFirestore(prog));
    }

    // 10. Clinic Settings: Doctor Profile, Published Video, Weekly Slot Templates
    const docProfileRef = doc(db, 'clinicSettings', 'doctorProfile');
    batch.set(docProfileRef, sanitizeForFirestore(INITIAL_DOCTOR_PROFILE));

    const videoRef = doc(db, 'clinicSettings', 'publishedVideo');
    batch.set(videoRef, sanitizeForFirestore(SEED_PUBLISHED_VIDEO));

    const templatesRef = doc(db, 'clinicSettings', 'weeklySlotTemplates');
    batch.set(templatesRef, { templates: sanitizeForFirestore(DEFAULT_WEEKLY_SLOT_TEMPLATES) });

    await batch.commit();
    console.log('Successfully seeded initial clinic records into Firestore.');
    return true;
  } catch (err) {
    console.error('Failed to seed Firestore:', err);
    return false;
  }
}

/**
 * Subscribe to all Firestore collections with onSnapshot.
 * Triggers callback whenever data updates in the cloud.
 */
export function subscribeToFirestore(
  onUpdate: (data: FirestoreCollectionsData) => void,
  onError?: (error: Error) => void
): () => void {
  const unsubs: Array<() => void> = [];

  try {
    // 1. Patients collection
    const unsubsPatients = onSnapshot(
      collection(db, 'patients'),
      (snap) => {
        const patients: Patient[] = [];
        snap.forEach((d) => patients.push(d.data() as Patient));
        onUpdate({ patients });
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsPatients);

    // 2. Therapists collection
    const unsubsTherapists = onSnapshot(
      collection(db, 'therapists'),
      (snap) => {
        const therapists: Therapist[] = [];
        snap.forEach((d) => therapists.push(d.data() as Therapist));
        onUpdate({ therapists });
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsTherapists);

    // 3. Sessions collection
    const unsubsSessions = onSnapshot(
      collection(db, 'sessions'),
      (snap) => {
        const sessions: Session[] = [];
        snap.forEach((d) => sessions.push(d.data() as Session));
        onUpdate({ sessions });
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsSessions);

    // 4. Progress Summaries
    const unsubsProgress = onSnapshot(
      collection(db, 'progressSummaries'),
      (snap) => {
        const summaries: ProgressSummary[] = [];
        snap.forEach((d) => summaries.push(d.data() as ProgressSummary));
        onUpdate({ progressSummaries: summaries });
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsProgress);

    // 5. Invoices
    const unsubsInvoices = onSnapshot(
      collection(db, 'invoices'),
      (snap) => {
        const invoices: Invoice[] = [];
        snap.forEach((d) => invoices.push(d.data() as Invoice));
        onUpdate({ invoices });
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsInvoices);

    // 6. Expenses
    const unsubsExpenses = onSnapshot(
      collection(db, 'expenses'),
      (snap) => {
        const expenses: Expense[] = [];
        snap.forEach((d) => expenses.push(d.data() as Expense));
        onUpdate({ expenses });
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsExpenses);

    // 7. Programs
    const unsubsPrograms = onSnapshot(
      collection(db, 'programs'),
      (snap) => {
        const programs: Program[] = [];
        snap.forEach((d) => programs.push(d.data() as Program));
        onUpdate({ programs });
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsPrograms);

    // 8. Invites
    const unsubsInvites = onSnapshot(
      collection(db, 'invites'),
      (snap) => {
        const invites: InviteCode[] = [];
        snap.forEach((d) => invites.push(d.data() as InviteCode));
        onUpdate({ invites });
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsInvites);

    // 9. Notifications
    const unsubsNotifs = onSnapshot(
      collection(db, 'notifications'),
      (snap) => {
        const notifications: Notification[] = [];
        snap.forEach((d) => notifications.push(d.data() as Notification));
        // Sort newest first
        notifications.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        onUpdate({ notifications });
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsNotifs);

    // 10. Daily Slot Configurations
    const unsubsSlots = onSnapshot(
      collection(db, 'dailySlotConfigs'),
      (snap) => {
        const configs: Record<string, DailySlotConfig> = {};
        snap.forEach((d) => {
          configs[d.id] = d.data() as DailySlotConfig;
        });
        onUpdate({ dailySlotConfigs: configs });
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsSlots);

    // 11. Clinic Settings: doctorProfile
    const unsubsDoctor = onSnapshot(
      doc(db, 'clinicSettings', 'doctorProfile'),
      (snap) => {
        if (snap.exists()) {
          onUpdate({ doctorProfile: snap.data() as DoctorProfile });
        }
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsDoctor);

    // 12. Clinic Settings: publishedVideo
    const unsubsVideo = onSnapshot(
      doc(db, 'clinicSettings', 'publishedVideo'),
      (snap) => {
        if (snap.exists()) {
          onUpdate({ publishedVideo: snap.data() as PublishedVideo });
        } else {
          onUpdate({ publishedVideo: null });
        }
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsVideo);

    // 13. Clinic Settings: weeklySlotTemplates
    const unsubsTemplates = onSnapshot(
      doc(db, 'clinicSettings', 'weeklySlotTemplates'),
      (snap) => {
        if (snap.exists() && snap.data().templates) {
          onUpdate({ weeklySlotTemplates: snap.data().templates as DayOfWeekSlotTemplate[] });
        }
      },
      (err) => onError?.(err)
    );
    unsubs.push(unsubsTemplates);
  } catch (err: any) {
    onError?.(err);
  }

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

// -------------------------------------------------------------
// Cloud Write / Mutation Methods
// -------------------------------------------------------------

export async function cloudSavePatient(patient: Patient): Promise<void> {
  const ref = doc(db, 'patients', patient.id);
  await setDoc(ref, sanitizeForFirestore(patient), { merge: true });
}

export async function cloudSavePatientsBatch(
  patients: Patient[],
  invites: InviteCode[],
  notifications: Notification[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const p of patients) {
    batch.set(doc(db, 'patients', p.id), sanitizeForFirestore(p), { merge: true });
  }
  for (const inv of invites) {
    batch.set(doc(db, 'invites', inv.id), sanitizeForFirestore(inv), { merge: true });
  }
  for (const n of notifications) {
    batch.set(doc(db, 'notifications', n.id), sanitizeForFirestore(n), { merge: true });
  }
  await batch.commit();
}

export async function cloudDeletePatient(id: string): Promise<void> {
  await deleteDoc(doc(db, 'patients', id));
}

export async function cloudSaveTherapist(therapist: Therapist): Promise<void> {
  const ref = doc(db, 'therapists', therapist.id);
  await setDoc(ref, sanitizeForFirestore(therapist), { merge: true });
}

export async function cloudDeleteTherapist(id: string): Promise<void> {
  await deleteDoc(doc(db, 'therapists', id));
}

export async function cloudSaveSession(session: Session): Promise<void> {
  const ref = doc(db, 'sessions', session.id);
  await setDoc(ref, sanitizeForFirestore(session), { merge: true });
}

export async function cloudDeleteSession(id: string): Promise<void> {
  await deleteDoc(doc(db, 'sessions', id));
}

export async function cloudSaveProgressSummary(summary: ProgressSummary): Promise<void> {
  const ref = doc(db, 'progressSummaries', summary.id);
  await setDoc(ref, sanitizeForFirestore(summary), { merge: true });
}

export async function cloudSaveInvoice(invoice: Invoice): Promise<void> {
  const ref = doc(db, 'invoices', invoice.id);
  await setDoc(ref, sanitizeForFirestore(invoice), { merge: true });
}

export async function cloudSaveExpense(expense: Expense): Promise<void> {
  const ref = doc(db, 'expenses', expense.id);
  await setDoc(ref, sanitizeForFirestore(expense), { merge: true });
}

export async function cloudDeleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', id));
}

export async function cloudSaveProgram(program: Program): Promise<void> {
  const ref = doc(db, 'programs', program.id);
  await setDoc(ref, sanitizeForFirestore(program), { merge: true });
}

export async function cloudDeleteProgram(id: string): Promise<void> {
  await deleteDoc(doc(db, 'programs', id));
}

export async function cloudSaveDoctorProfile(profile: DoctorProfile): Promise<void> {
  const ref = doc(db, 'clinicSettings', 'doctorProfile');
  await setDoc(ref, sanitizeForFirestore(profile), { merge: true });
}

export async function cloudSavePublishedVideo(video: PublishedVideo | null): Promise<void> {
  const ref = doc(db, 'clinicSettings', 'publishedVideo');
  if (video) {
    await setDoc(ref, sanitizeForFirestore(video));
  } else {
    await deleteDoc(ref);
  }
}

export async function cloudSaveWeeklySlotTemplates(templates: DayOfWeekSlotTemplate[]): Promise<void> {
  const ref = doc(db, 'clinicSettings', 'weeklySlotTemplates');
  await setDoc(ref, { templates: sanitizeForFirestore(templates) });
}

export async function cloudSaveDailySlotConfig(config: DailySlotConfig): Promise<void> {
  const ref = doc(db, 'dailySlotConfigs', config.date);
  await setDoc(ref, sanitizeForFirestore(config), { merge: true });
}

export async function cloudSaveNotification(notif: Notification): Promise<void> {
  const ref = doc(db, 'notifications', notif.id);
  await setDoc(ref, sanitizeForFirestore(notif), { merge: true });
}

export async function cloudSaveInvite(invite: InviteCode): Promise<void> {
  const ref = doc(db, 'invites', invite.id);
  await setDoc(ref, sanitizeForFirestore(invite), { merge: true });
}

/**
 * Wipe all collections in Firestore and prepare for live clinical cutover
 */
export async function cloudWipeForCutover(): Promise<void> {
  const collectionsToWipe = [
    'patients',
    'sessions',
    'progressSummaries',
    'invoices',
    'expenses',
    'invites',
    'notifications',
    'dailySlotConfigs',
  ];

  for (const colName of collectionsToWipe) {
    const snap = await getDocs(collection(db, colName));
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Retain Dr. Sweety Bhatnagar as Practice Director
  const thSnap = await getDocs(collection(db, 'therapists'));
  const batchTh = writeBatch(db);
  thSnap.forEach((d) => {
    if (d.id !== 'th-3') {
      batchTh.delete(d.ref);
    }
  });
  await batchTh.commit();

  // Reset clinicSettings
  await setDoc(doc(db, 'clinicSettings', 'doctorProfile'), sanitizeForFirestore(INITIAL_DOCTOR_PROFILE));
  await deleteDoc(doc(db, 'clinicSettings', 'publishedVideo'));

  // Add system cutover notification
  const cutoverNotif: Notification = {
    id: `notif-${Date.now()}`,
    userId: 'all',
    targetRole: 'all',
    type: 'general',
    message: 'Seed data wiped successfully. Practice is connected to Firestore and ready for live clinical client onboarding.',
    read: false,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'notifications', cutoverNotif.id), sanitizeForFirestore(cutoverNotif));
}

/**
 * Reset Firestore to complete seed state
 */
export async function cloudResetToSeed(): Promise<void> {
  const collectionsToWipe = [
    'patients',
    'therapists',
    'sessions',
    'progressSummaries',
    'invoices',
    'expenses',
    'programs',
    'invites',
    'notifications',
    'dailySlotConfigs',
  ];

  for (const colName of collectionsToWipe) {
    const snap = await getDocs(collection(db, colName));
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await seedFirestoreIfEmpty();
}
