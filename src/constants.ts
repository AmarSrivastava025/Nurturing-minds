import { DoctorProfile, Expense, Invoice, InviteCode, Notification, Patient, Program, ProgressSummary, PublishedVideo, Session, Therapist } from './types';

export const BRAND = {
  primary: '#6D0281', // deep plum-purple confirmed from client swatch
  primaryHover: '#570167',
  secondary: '#E8590C', // orange accent from circular logo
  bg: '#FAF7FB',
  fontFamily: "'Poppins', sans-serif",
};

/**
 * Late payment notification wording confirmed with Dr. Bhatnagar:
 * "Dear Parents, Gentle Reminder for the Late Payment of [amount/month]."
 */
export const formatLatePaymentMessage = (detail: string): string => {
  return `Dear Parents, Gentle Reminder for the Late Payment of ${detail}.`;
};

export const INITIAL_DOCTOR_PROFILE: DoctorProfile = {
  name: 'Dr. Sweety Bhatnagar',
  title: 'Lead Pediatric Occupational Therapist & Practice Director',
  photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
  qualifications: 'BOT, MOT (Pediatrics), Certified Sensory Integration Therapist (USC/WPS), 16+ Years Clinical Excellence',
  bio: 'Dr. Sweety Bhatnagar personally conducts every 90-minute clinical assessment for newly enrolled children to formulate a customized developmental roadmap. Nurturing Minds Therapy Center embraces an open, in-center parent partnership where parents observe sessions live, empowering families to reinforce developmental milestones with confidence.',
  clinicAddress: 'Nurturing Minds Therapy Center, Club Opal, Olympia Opaline, Club House, OMR Road, Navalur, Chennai - 600130',
  contactEmail: 'connect@drsweetybhatnagar.com',
  phone: '+91 97893 05029',
  adminLoginId: 'connect@drsweetybhatnagar.com',
  adminPassword: 'admin123',
};

export const LEGACY_CLINIC_PHONE = '+91 98110 23456';

export function migrateClinicPhone(profile: DoctorProfile): DoctorProfile {
  if (profile && typeof profile.phone === 'string' && profile.phone.trim() === LEGACY_CLINIC_PHONE) {
    return { ...profile, phone: INITIAL_DOCTOR_PROFILE.phone };
  }
  return profile;
}

export function migrateClinicPhoneInTherapists(therapists: Therapist[]): Therapist[] {
  let changed = false;
  const next = therapists.map((therapist) => {
    if (
      therapist &&
      typeof therapist.phone === 'string' &&
      therapist.phone.trim() === LEGACY_CLINIC_PHONE
    ) {
      changed = true;
      return { ...therapist, phone: INITIAL_DOCTOR_PROFILE.phone };
    }
    return therapist;
  });
  return changed ? next : therapists;
}

export const LEGACY_CLINIC_ADDRESS_MARKERS = [
  'Model Town',
  'Sunshine Complex',
  'New Delhi',
  '2nd Floor',
];

export function migrateClinicAddress<T extends { clinicAddress?: string }>(profile: T): T {
  if (!profile || typeof profile.clinicAddress !== 'string') return profile;
  const current = profile.clinicAddress;
  if (!LEGACY_CLINIC_ADDRESS_MARKERS.some((marker) => current.includes(marker))) return profile;
  const next = INITIAL_DOCTOR_PROFILE.clinicAddress;
  if (next === current) return profile;
  return { ...profile, clinicAddress: next };
}

export const SEED_THERAPISTS: Therapist[] = [
  {
    id: 'th-1',
    userId: 'user-therapist-1',
    name: 'Ritu Verma',
    photoUrl: 'https://images.unsplash.com/photo-1594824813681-4355523a60f9?auto=format&fit=crop&q=80&w=500',
    qualification: 'Senior Pediatric Occupational Therapist (BOT, Sensory Integration)',
    summary: 'Specializes in fine-motor dexterity, bilateral coordination, and tactile sensory modulation for young children.',
    email: 'ritu.verma@nurturingminds.com',
    phone: '+91 98101 23456',
    loginId: 'ritu.verma@nurturingminds.com',
    password: 'therapist123',
    specialization: 'Fine Motor Coordination & Tactile Sensory Integration',
    experienceYears: 7,
    status: 'active',
    availableDays: ['Monday', 'Wednesday', 'Friday'],
    workingHours: '09:00 AM - 05:00 PM',
  },
  {
    id: 'th-2',
    userId: 'user-therapist-2',
    name: 'Sneha Kapoor',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=500',
    qualification: 'Occupational & Soundsory Specialist (MOT)',
    summary: 'Focused on vestibular regulation, auditory processing integration, and behavioral regulation strategies in early childhood.',
    email: 'sneha.kapoor@nurturingminds.com',
    phone: '+91 98102 34567',
    loginId: 'sneha.kapoor@nurturingminds.com',
    password: 'therapist123',
    specialization: 'Vestibular Regulation & Auditory Sensory Integration',
    experienceYears: 5,
    status: 'active',
    availableDays: ['Tuesday', 'Thursday', 'Saturday'],
    workingHours: '10:00 AM - 06:00 PM',
  },
  {
    id: 'th-3',
    userId: 'user-admin',
    name: 'Dr. Sweety Bhatnagar',
    photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500',
    qualification: 'Director & Lead Consultant (BOT, MOT, SI Certified)',
    summary: 'Directly handles complex neurodevelopmental assessments, proprietary intensive therapy plans, and sound-based therapies.',
    email: 'connect@drsweetybhatnagar.com',
    phone: '+91 97893 05029',
    loginId: 'connect@drsweetybhatnagar.com',
    password: 'admin123',
    specialization: 'Comprehensive Clinical Assessments & Advanced Sensory Processing',
    experienceYears: 16,
    status: 'active',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHours: '09:00 AM - 07:00 PM',
  },
];

export const SEED_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    childName: 'Aarav Sharma',
    age: 5,
    bloodGroup: 'B+',
    symptom: 'Sensory sensitivity, toe walking, tactile defensiveness',
    chiefComplaint: 'Difficulties with shoe-wearing, haircuts, and transitions between activities',
    fatherName: 'Rohit Sharma',
    fatherContact: '+91 98711 54321',
    motherName: 'Priya Sharma',
    motherContact: '+91 98711 54322',
    primaryContact: 'mother',
    emergencyContact: 'father',
    sessionsPerWeek: 3,
    assignedTherapistId: 'th-1',
    paymentStatus: 'current',
    sessionTiming: 'Mon, Wed, Fri • 4:00 PM - 4:45 PM',
    createdAt: '2026-08-10T10:00:00.000Z',
    parentUserId: 'user-parent-1',
    parentEmail: 'priya.sharma@example.com',
    parentLoginId: 'priya.sharma@example.com',
    parentPassword: 'parent123',
  },
  {
    id: 'pat-2',
    childName: 'Ananya Mehra',
    age: 4,
    bloodGroup: 'O+',
    symptom: 'Delayed fine-motor grasp, poor sitting tolerance',
    chiefComplaint: 'Cannot hold crayons comfortably, struggles with preschool pencil tasks',
    fatherName: 'Vikram Mehra',
    fatherContact: '+91 98102 11223',
    motherName: 'Kavita Mehra',
    motherContact: '+91 98102 11224',
    primaryContact: 'mother',
    emergencyContact: 'mother',
    sessionsPerWeek: 2,
    assignedTherapistId: 'th-2',
    paymentStatus: 'late',
    pendingPaymentAmount: 8000,
    pendingPaymentMonth: 'August 2026',
    sessionTiming: 'Tue, Thu • 3:30 PM - 4:15 PM',
    createdAt: '2026-08-12T11:30:00.000Z',
    parentUserId: 'user-parent-2',
    parentEmail: 'kavita.mehra@example.com',
    parentLoginId: 'kavita.mehra@example.com',
    parentPassword: 'parent123',
  },
  {
    id: 'pat-3',
    childName: 'Kabir Singhania',
    age: 6,
    bloodGroup: 'A+',
    symptom: 'Postural instability, dyspraxia, low motor planning',
    chiefComplaint: 'Frequent tripping, low stamina during playground play and staircase climbing',
    fatherName: 'Manish Singhania',
    fatherContact: '+91 98200 44556',
    motherName: 'Neha Singhania',
    motherContact: '+91 98200 44557',
    primaryContact: 'father',
    emergencyContact: 'father',
    sessionsPerWeek: 3,
    assignedTherapistId: 'th-1',
    paymentStatus: 'current',
    sessionTiming: 'Mon, Wed, Fri • 5:15 PM - 6:00 PM',
    createdAt: '2026-08-15T09:00:00.000Z',
    parentEmail: 'manish.singhania@example.com',
    parentLoginId: 'manish.singhania@example.com',
    parentPassword: 'parent123',
  },
  {
    id: 'pat-4',
    childName: 'Meera Iyer',
    age: 3,
    bloodGroup: 'AB+',
    symptom: 'Auditory hyper-reactivity, language delays',
    chiefComplaint: 'Covers ears during blender or vacuum noise, avoids peer play',
    fatherName: 'Arjun Iyer',
    fatherContact: '+91 99105 88990',
    motherName: 'Deepa Iyer',
    motherContact: '+91 99105 88991',
    primaryContact: 'mother',
    emergencyContact: 'mother',
    sessionsPerWeek: 3,
    assignedTherapistId: 'th-2',
    paymentStatus: 'partial',
    pendingPaymentAmount: 4500,
    pendingPaymentMonth: 'September 2026',
    sessionTiming: 'Mon, Wed, Fri • 11:00 AM - 11:45 AM',
    createdAt: '2026-08-20T14:00:00.000Z',
    parentEmail: 'deepa.iyer@example.com',
    parentLoginId: 'deepa.iyer@example.com',
    parentPassword: 'parent123',
  },
  {
    id: 'pat-5',
    childName: 'Reyansh Gupta',
    age: 7,
    bloodGroup: 'B-',
    symptom: 'Attention deficit, vestibular seeking, impulsive movements',
    chiefComplaint: 'Constantly rocking chair, spinning around, difficulty writing in school lines',
    fatherName: 'Alok Gupta',
    fatherContact: '+91 98114 77881',
    motherName: 'Shalini Gupta',
    motherContact: '+91 98114 77882',
    primaryContact: 'father',
    emergencyContact: 'father',
    sessionsPerWeek: 2,
    assignedTherapistId: 'th-3',
    paymentStatus: 'current',
    sessionTiming: 'Tue, Thu • 4:45 PM - 5:30 PM',
    createdAt: '2026-08-22T16:00:00.000Z',
    parentEmail: 'alok.gupta@example.com',
    parentLoginId: 'alok.gupta@example.com',
    parentPassword: 'parent123',
  },
  {
    id: 'pat-6',
    childName: 'Tara Deshmukh',
    age: 5,
    bloodGroup: 'O-',
    symptom: 'Hypotonia, oral motor difficulties, weak core',
    chiefComplaint: 'Slumping while seated, messy eating, struggles with balance beam',
    fatherName: 'Sameer Deshmukh',
    fatherContact: '+91 98223 33441',
    motherName: 'Pooja Deshmukh',
    motherContact: '+91 98223 33442',
    primaryContact: 'mother',
    emergencyContact: 'father',
    sessionsPerWeek: 2,
    assignedTherapistId: 'th-1',
    paymentStatus: 'current',
    sessionTiming: 'Tue, Thu • 6:00 PM - 6:45 PM',
    createdAt: '2026-08-25T11:00:00.000Z',
    parentEmail: 'pooja.deshmukh@example.com',
    parentLoginId: 'pooja.deshmukh@example.com',
    parentPassword: 'parent123',
  },
  {
    id: 'pat-7',
    childName: 'Vivaan Kapoor',
    age: 4,
    bloodGroup: 'A-',
    symptom: 'Sensory under-responsiveness, high pain threshold',
    chiefComplaint: 'Bumping into furniture, unaware of food around mouth, needs firm deep pressure',
    fatherName: 'Kunal Kapoor',
    fatherContact: '+91 98331 99001',
    motherName: 'Simran Kapoor',
    motherContact: '+91 98331 99002',
    primaryContact: 'mother',
    emergencyContact: 'mother',
    sessionsPerWeek: 3,
    assignedTherapistId: 'th-2',
    paymentStatus: 'current',
    sessionTiming: 'Mon, Wed, Fri • 2:30 PM - 3:30 PM',
    createdAt: '2026-08-28T12:00:00.000Z',
    parentEmail: 'simran.kapoor@example.com',
  },
];

export const SEED_SESSIONS: Session[] = [
  // Today's sessions (using dynamic current date offset, 45-minute slots)
  {
    id: 'ses-1',
    patientId: 'pat-1',
    therapistId: 'th-1',
    scheduledAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    status: 'scheduled',
    timeSlot: '04:00 PM - 04:45 PM',
    durationMinutes: 45,
  },
  {
    id: 'ses-2',
    patientId: 'pat-3',
    therapistId: 'th-1',
    scheduledAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    status: 'scheduled',
    timeSlot: '05:00 PM - 05:45 PM',
    durationMinutes: 45,
  },
  {
    id: 'ses-3',
    patientId: 'pat-2',
    therapistId: 'th-2',
    scheduledAt: new Date(Date.now() + 1 * 3600 * 1000).toISOString(),
    status: 'scheduled',
    timeSlot: '03:00 PM - 03:45 PM',
    durationMinutes: 45,
  },
  {
    id: 'ses-4',
    patientId: 'pat-5',
    therapistId: 'th-3',
    scheduledAt: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    status: 'scheduled',
    timeSlot: '04:45 PM - 05:30 PM',
    durationMinutes: 45,
  },
  // Completed sessions with fast 1-3 word notes (45-min duration)
  {
    id: 'ses-prev-1',
    patientId: 'pat-1',
    therapistId: 'th-1',
    scheduledAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    status: 'completed',
    progressNote: 'Calm and focused',
    timeSlot: '04:00 PM - 04:45 PM',
    durationMinutes: 45,
  },
  {
    id: 'ses-prev-2',
    patientId: 'pat-1',
    therapistId: 'th-1',
    scheduledAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    status: 'completed',
    progressNote: 'Better pencil grip',
    timeSlot: '04:00 PM - 04:45 PM',
    durationMinutes: 45,
  },
  {
    id: 'ses-prev-3',
    patientId: 'pat-1',
    therapistId: 'th-1',
    scheduledAt: new Date(Date.now() - 144 * 3600 * 1000).toISOString(),
    status: 'completed',
    progressNote: 'Tolerated textured brush',
    timeSlot: '04:00 PM - 04:45 PM',
    durationMinutes: 45,
  },
  {
    id: 'ses-prev-4',
    patientId: 'pat-2',
    therapistId: 'th-2',
    scheduledAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    status: 'completed',
    progressNote: 'Improved clay grasping',
    timeSlot: '03:00 PM - 03:45 PM',
    durationMinutes: 45,
  },
  {
    id: 'ses-prev-5',
    patientId: 'pat-3',
    therapistId: 'th-1',
    scheduledAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    status: 'completed',
    progressNote: 'Steady balance beam',
    timeSlot: '05:00 PM - 05:45 PM',
    durationMinutes: 45,
  },
];

export const SEED_PROGRESS_SUMMARIES: ProgressSummary[] = [
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
];

export const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    patientId: 'pat-1',
    invoiceNumber: 'NM-REC-2026-0101',
    amount: 18000,
    issuedAt: '2026-09-01T10:00:00.000Z',
    paymentMode: 'UPI',
    description: '12-Session Monthly Pediatric Occupational Therapy Package (September 2026)',
    status: 'paid',
  },
  {
    id: 'inv-2',
    patientId: 'pat-3',
    invoiceNumber: 'NM-REC-2026-0102',
    amount: 18000,
    issuedAt: '2026-09-02T11:15:00.000Z',
    paymentMode: 'Bank Transfer',
    description: '12-Session Monthly Occupational Therapy & Bilateral Coordination (September 2026)',
    status: 'paid',
  },
  {
    id: 'inv-3',
    patientId: 'pat-5',
    invoiceNumber: 'NM-REC-2026-0103',
    amount: 14000,
    issuedAt: '2026-09-03T16:20:00.000Z',
    paymentMode: 'Card',
    description: '8-Session Monthly Sensory Integration Program (September 2026)',
    status: 'paid',
  },
  {
    id: 'inv-4',
    patientId: 'pat-6',
    invoiceNumber: 'NM-REC-2026-0098',
    amount: 14000,
    issuedAt: '2026-08-25T14:00:00.000Z',
    paymentMode: 'UPI',
    description: '8-Session Monthly Hypotonia & Postural Control Program (August 2026)',
    status: 'paid',
  },
];

export const SEED_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    amount: 5000,
    payee: 'Ramesh (Center Sanitation & Upkeep)',
    date: '2026-09-02',
    rawInput: 'Paid ₹5,000 to Ramesh for September center cleaning',
    providerStamp: 'openrouter/meta-llama/llama-3.3-70b-instruct:free',
    category: 'Facility Maintenance',
  },
  {
    id: 'exp-2',
    amount: 8500,
    payee: 'Sensory Gym Supplies Co.',
    date: '2026-09-03',
    rawInput: 'Paid ₹8,500 to Sensory Gym Supplies for therapy putty, lycra swings and sensory brushes',
    providerStamp: 'openrouter/meta-llama/llama-3.3-70b-instruct:free',
    category: 'Therapy Materials',
  },
  {
    id: 'exp-3',
    amount: 12000,
    payee: 'Electricity & High-Speed Wi-Fi',
    date: '2026-09-04',
    rawInput: 'Paid ₹12,000 for electricity and air conditioning for the clinic floor',
    providerStamp: 'openrouter/meta-llama/llama-3.3-70b-instruct:free',
    category: 'Utilities',
  },
];

export const SEED_PROGRAMS: Program[] = [
  {
    id: 'prog-ot',
    title: 'Occupational Therapy',
    imageUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=800',
    summary:
      'Our pediatric occupational therapy program helps children master foundational physical, sensory, and cognitive skills needed for daily life, school readiness, and self-confidence. Led personally by Dr. Sweety Bhatnagar, each child engages in individualized activities that develop fine motor control, bilateral coordination, visual perception, and self-regulation within a warm, playful clinic setting where parents actively observe.',
  },
  {
    id: 'prog-st',
    title: 'Soundsory Therapy',
    imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=800',
    summary:
      'Soundsory is a multisensory, brain-based program combining rhythmically processed music with specialized somatic movement exercises. This protocol stimulates the vestibular and auditory systems simultaneously, improving neuro-developmental integration, rhythm awareness, postural stability, and language processing in children with sensory processing sensitivities and developmental delays.',
  },
  {
    id: 'prog-pc',
    title: 'Parental Counseling for Special Needs Kids',
    imageUrl: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&q=80&w=800',
    summary:
      'Parental guidance is at the heart of our practice philosophy. Dr. Bhatnagar holds dedicated one-on-one counseling sessions to equip parents with practical home co-regulation strategies, empathetic behavioral management tools, and emotional support. Because parents watch sessions live, these counseling discussions provide deep clarity on their child’s unique sensory profile.',
  },
];

export const SEED_PUBLISHED_VIDEO: PublishedVideo = {
  id: 'vid-1',
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'Sensory Regulation at Home: Guidance from Dr. Sweety Bhatnagar',
  description:
    'A practical walkthrough for parents on how to set up calming sensory nooks and handle tactile sensitivity meltdowns at home.',
  publishedAt: '2026-09-01T14:00:00.000Z',
  publishedBy: 'Dr. Sweety Bhatnagar',
};

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    userId: 'all',
    targetRole: 'all',
    type: 'video_published',
    message: 'Dr. Sweety Bhatnagar published a new guidance video: "Sensory Regulation at Home". Tap to watch now.',
    read: false,
    createdAt: '2026-09-01T14:05:00.000Z',
  },
  {
    id: 'notif-2',
    userId: 'user-therapist-1',
    targetRole: 'therapist',
    type: 'therapist_mapped',
    message: 'Dr. Bhatnagar has assigned a new patient to you: Aarav Sharma (3 sessions/week).',
    read: true,
    createdAt: '2026-08-10T10:15:00.000Z',
  },
  {
    id: 'notif-3',
    userId: 'user-parent-2',
    targetRole: 'parent',
    type: 'late_payment',
    message: 'Dear Parents, Gentle Reminder for the Late Payment of ₹8,000 for August 2026.',
    read: false,
    createdAt: '2026-09-03T10:00:00.000Z',
  },
];

export const SEED_INVITES: InviteCode[] = [
  {
    id: 'inv-c-1',
    code: 'NM-PARENT-KABIR',
    role: 'parent',
    patientId: 'pat-3',
    recipientName: 'Manish Singhania (Kabir)',
    createdAt: '2026-08-15T09:05:00.000Z',
    used: false,
  },
  {
    id: 'inv-c-2',
    code: 'NM-THERAPIST-ANITA',
    role: 'therapist',
    recipientName: 'Anita Roy (New Staff)',
    createdAt: '2026-09-01T10:00:00.000Z',
    used: false,
  },
];
