import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Send,
  Edit2,
  ShieldAlert,
  User,
  Sparkles,
  Video,
  Calendar,
  Users,
  KeyRound,
  Lock,
  Phone,
  Mail,
  Award,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  Heart,
  Save,
} from 'lucide-react';
import { DoctorProfile, Patient, PublishedVideo, Session, Therapist } from '../../types';
import { store } from '../../services/store';

interface TherapistViewProps {
  therapist: Therapist;
  sessions: Session[];
  patients: Patient[];
  publishedVideo: PublishedVideo | null;
  doctorProfile: DoctorProfile;
}

export const TherapistView: React.FC<TherapistViewProps> = ({
  therapist,
  sessions,
  patients,
  publishedVideo,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'caseload' | 'profile' | 'video'>('schedule');

  // Edit profile form state
  const [profileName, setProfileName] = useState(therapist.name);
  const [profilePhoto, setProfilePhoto] = useState(therapist.photoUrl);
  const [profileQual, setProfileQual] = useState(therapist.qualification);
  const [profileSummary, setProfileSummary] = useState(therapist.summary);
  const [profileSpecialization, setProfileSpecialization] = useState(
    therapist.specialization || 'Pediatric Sensory Integration & Motor Development'
  );
  const [profileExperience, setProfileExperience] = useState(
    therapist.experienceYears || 5
  );
  const [profilePhone, setProfilePhone] = useState(therapist.phone || '');
  const [profileEmail, setProfileEmail] = useState(therapist.email);
  const [profileWorkingHours, setProfileWorkingHours] = useState(
    therapist.workingHours || '09:00 AM - 05:00 PM'
  );
  const [profileAvailableDays, setProfileAvailableDays] = useState<string[]>(
    therapist.availableDays || ['Monday', 'Wednesday', 'Friday']
  );

  // Credentials form state
  const [therapistLoginId, setTherapistLoginId] = useState(therapist.loginId || therapist.email);
  const [therapistPassword, setTherapistPassword] = useState(therapist.password || 'therapist123');
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Fast 1-3 word note logging state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [fastNoteText, setFastNoteText] = useState('');

  // Therapist's assigned sessions (read-only schedule!)
  const mySessions = sessions
    .filter((s) => s.therapistId === therapist.id)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // Children assigned to this therapist
  const myPatients = patients.filter((p) => p.assignedTherapistId === therapist.id);

  const getPatient = (id: string) => patients.find((p) => p.id === id);

  const toggleDay = (day: string) => {
    if (profileAvailableDays.includes(day)) {
      setProfileAvailableDays(profileAvailableDays.filter((d) => d !== day));
    } else {
      setProfileAvailableDays([...profileAvailableDays, day]);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateTherapistProfile(therapist.id, {
      name: profileName.trim(),
      photoUrl: profilePhoto.trim(),
      qualification: profileQual.trim(),
      summary: profileSummary.trim(),
      specialization: profileSpecialization.trim(),
      experienceYears: Number(profileExperience),
      phone: profilePhone.trim(),
      email: profileEmail.trim(),
      workingHours: profileWorkingHours.trim(),
      availableDays: profileAvailableDays,
      loginId: therapistLoginId.trim(),
      password: therapistPassword.trim(),
    });

    setSaveSuccessMessage('Your profile & credentials have been updated successfully!');
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);
  };

  const handleLogFastNote = (sessionId: string) => {
    if (!fastNoteText.trim()) return;

    store.logTherapistNote(sessionId, fastNoteText.trim());
    setActiveSessionId(null);
    setFastNoteText('');
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : url;
  };

  // Avatar presets
  const avatarPresets = [
    'https://images.unsplash.com/photo-1594824813681-4355523a60f9?auto=format&fit=crop&q=80&w=500',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=500',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=500',
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-[#6D0281] to-[#510160] rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/40 shrink-0 bg-white/20 shadow-md">
              <img
                src={therapist.photoUrl}
                alt={therapist.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-purple-200">
                  Staff Therapist Portal
                </span>
                <span className="text-[10px] font-bold bg-emerald-400/30 text-emerald-200 px-2 py-0.5 rounded-full">
                  Active Clinical Staff
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1 text-white">{therapist.name}</h1>
              <p className="text-xs text-purple-200">{therapist.qualification}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-purple-200 font-bold uppercase block">My Patients</span>
              <span className="text-base font-black text-white">{myPatients.length} Enrolled</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-purple-200 font-bold uppercase block">Sessions</span>
              <span className="text-base font-black text-white">{mySessions.length} Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-[#6D0281] text-white shadow-xs'
              : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Daily Schedule & Notes ({mySessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('caseload')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'caseload'
              ? 'bg-[#6D0281] text-white shadow-xs'
              : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>My Assigned Caseload ({myPatients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-[#6D0281] text-white shadow-xs'
              : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Profile & Login Credentials</span>
        </button>

        {publishedVideo && (
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'video'
                ? 'bg-[#6D0281] text-white shadow-xs'
                : 'text-slate-600 hover:bg-purple-50'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Clinic Video</span>
          </button>
        )}
      </div>

      {/* TAB 1: SCHEDULE & FAST NOTES */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Read-only Schedule Policy Safeguard */}
          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-100 text-[#6D0281] shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="text-xs text-purple-900 leading-relaxed">
              <p className="font-bold">Schedule Protocol Notice (Read-Only Access):</p>
              <p className="mt-0.5">
                Per clinical operating regulations, Dr. Sweety Bhatnagar retains sole authority over scheduling.
                Therapist schedules are strictly view-only.
                Immediately after each session, record your <strong>fast 1-3 word note</strong> below to feed into the fortnightly progress pipeline.
              </p>
            </div>
          </div>

          {/* Therapist's Schedule with Quick-Fire 1-3 Word Note Logger */}
          <div className="bg-white rounded-3xl border border-purple-100/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                My Assigned Sessions ({mySessions.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Quick-Fire 1-3 Word Capture • Instant Sync
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {mySessions.length === 0 ? (
                <p className="p-8 text-center text-slate-400">No sessions assigned yet by Dr. Bhatnagar.</p>
              ) : (
                mySessions.map((session) => {
                  const patient = getPatient(session.patientId);
                  const isLogging = activeSessionId === session.id;

                  return (
                    <div key={session.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#6D0281] font-bold text-xs shrink-0 border border-purple-100">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {patient?.childName || 'Child'} ({patient?.age} yrs, {patient?.bloodGroup})
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {session.timeSlot || '04:00 PM - 05:00 PM'} • Parent: {patient?.motherName} ({patient?.primaryContact === 'mother' ? patient.motherContact : patient?.fatherContact})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                              session.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {session.status.toUpperCase()}
                          </span>

                          {!isLogging && (
                            <button
                              onClick={() => {
                                setActiveSessionId(session.id);
                                setFastNoteText(session.progressNote || '');
                              }}
                              className="px-3 py-1.5 rounded-xl border border-purple-200 text-[#6D0281] hover:bg-purple-50 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {session.progressNote ? 'Update Note' : 'Log 1-3 Word Note'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Current Logged Note Display */}
                      {session.progressNote && !isLogging && (
                        <div className="ml-0 sm:ml-13 pl-3 border-l-2 border-purple-300 text-[11px] text-slate-600">
                          Logged Note: <strong className="text-[#6D0281]">&quot;{session.progressNote}&quot;</strong>
                        </div>
                      )}

                      {/* Quick-Fire 1-3 Word Input Area */}
                      {isLogging && (
                        <div className="ml-0 sm:ml-13 p-3.5 bg-purple-50/80 rounded-2xl border border-purple-200 space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#6D0281] flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              Fast Post-Session Note (1-3 words only):
                            </label>
                            <span className="text-[10px] text-slate-400">
                              Feeds into Dr. Bhatnagar&apos;s AI queue
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={fastNoteText}
                              onChange={(e) => setFastNoteText(e.target.value)}
                              placeholder="e.g. Calm and focused"
                              className="flex-1 px-3 py-2 text-xs bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                            />
                            <button
                              onClick={() => handleLogFastNote(session.id)}
                              disabled={!fastNoteText.trim()}
                              className="px-4 py-2 bg-[#6D0281] hover:bg-[#570167] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Save
                            </button>
                            <button
                              onClick={() => setActiveSessionId(null)}
                              className="px-3 py-2 text-xs text-slate-500 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Quick click suggestions */}
                          <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                            <span className="text-slate-400 font-medium">Suggestions:</span>
                            {['Calm and focused', 'Better pencil grip', 'Clay grasp improved', 'Smooth gym transition', 'Sensory brush accepted'].map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => setFastNoteText(sug)}
                                className="px-2 py-0.5 rounded-full bg-white border border-purple-200 hover:border-[#6D0281] text-slate-700 transition"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY ASSIGNED CASELOAD */}
      {activeTab === 'caseload' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#6D0281]" />
              <span>Children In My Direct Clinical Caseload ({myPatients.length})</span>
            </h2>
            <span className="text-[11px] text-slate-500">
              Assigned by Clinical Director Dr. Sweety Bhatnagar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPatients.length === 0 ? (
              <div className="col-span-2 bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                No children currently assigned to your caseload.
              </div>
            ) : (
              myPatients.map((pat) => (
                <div
                  key={pat.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 hover:border-purple-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{pat.childName}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#6D0281]">
                          {pat.age} yrs • {pat.bloodGroup}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Timing: <strong>{pat.sessionTiming}</strong> ({pat.sessionsPerWeek}x/wk)
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs space-y-1">
                    <p className="font-bold text-purple-900">Clinical Focus & Symptoms:</p>
                    <p className="text-slate-600 text-[11px]">{pat.symptom}</p>
                    <p className="font-bold text-purple-900 pt-1">Chief Concern:</p>
                    <p className="text-slate-600 text-[11px]">{pat.chiefComplaint}</p>
                  </div>

                  <div className="text-[11px] space-y-0.5 text-slate-600 pt-1 border-t border-slate-100">
                    <p>
                      <strong>Mother:</strong> {pat.motherName} ({pat.motherContact})
                    </p>
                    <p>
                      <strong>Father:</strong> {pat.fatherName} ({pat.fatherContact})
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: THERAPIST PROFILE & LOGIN CREDENTIALS */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {saveSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 font-bold animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* Profile Overview Card (What Parents See) */}
          <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-[#6D0281]" />
                <span>Therapist Public Profile Preview (Visible to Parents)</span>
              </h3>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full font-bold">
                Live on Parent Portal
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-200 shadow-sm shrink-0 bg-purple-50">
                <img
                  src={profilePhoto || therapist.photoUrl}
                  alt={profileName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="text-base font-bold text-slate-900">{profileName}</h4>
                <p className="text-xs text-[#6D0281] font-semibold">{profileQual}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <strong>{profileExperience} Years</strong> Experience
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {profileEmail}
                  </span>
                  {profilePhone && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {profilePhone}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">{profileSummary}</p>
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#6D0281]" />
                <span>Edit Profile Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Qualifications / Degrees *</label>
                  <input
                    type="text"
                    required
                    value={profileQual}
                    onChange={(e) => setProfileQual(e.target.value)}
                    placeholder="e.g. BOT, MOT (Pediatrics), SI Certified"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Clinical Specialization *</label>
                  <input
                    type="text"
                    required
                    value={profileSpecialization}
                    onChange={(e) => setProfileSpecialization(e.target.value)}
                    placeholder="e.g. Fine Motor Coordination & Tactile Sensory Integration"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Years of Clinical Experience *</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    required
                    value={profileExperience}
                    onChange={(e) => setProfileExperience(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+91 98101 23456"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Photo URL & Presets */}
              <div className="text-xs space-y-2 pt-1">
                <label className="font-bold text-slate-700 block">Profile Photo URL</label>
                <input
                  type="url"
                  required
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Photo Presets:</span>
                  <div className="flex items-center gap-2">
                    {avatarPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProfilePhoto(preset)}
                        className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition ${
                          profilePhoto === preset ? 'border-[#6D0281] ring-2 ring-[#6D0281]' : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={preset} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Available Days */}
              <div className="text-xs space-y-1.5 pt-2">
                <label className="font-bold text-slate-700 block">Available Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                    const isSelected = profileAvailableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-[#6D0281] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Working Hours */}
              <div className="text-xs">
                <label className="font-bold text-slate-700 block mb-1">Shift / Working Hours</label>
                <input
                  type="text"
                  value={profileWorkingHours}
                  onChange={(e) => setProfileWorkingHours(e.target.value)}
                  placeholder="e.g. 09:00 AM - 05:00 PM"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                />
              </div>

              {/* Professional Summary */}
              <div className="text-xs">
                <label className="font-bold text-slate-700 block mb-1">Professional Summary & Bio *</label>
                <textarea
                  rows={3}
                  required
                  value={profileSummary}
                  onChange={(e) => setProfileSummary(e.target.value)}
                  placeholder="Brief description of your therapeutic approach and expertise..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Login Credentials & Password Section */}
            <div className="bg-white p-6 rounded-3xl border border-purple-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#6D0281]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Therapist Login ID & Password Function
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                You can view and update your personal clinical login credentials here.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Therapist Login ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={therapistLoginId}
                    onChange={(e) => setTherapistLoginId(e.target.value)}
                    placeholder="e.g. ritu.verma@nurturingminds.com"
                    className="w-full px-3.5 py-2.5 font-mono font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    You can use this Login ID or your email on the login page.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Portal Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={therapistPassword}
                      onChange={(e) => setTherapistPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 font-mono font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-slate-50/50 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    If you ever forget this password, Dr. Sweety Bhatnagar can reset it in the Admin Area.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-[#6D0281] hover:bg-[#570167] text-white font-bold text-xs transition shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile & Update Credentials</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: CLINIC VIDEO */}
      {activeTab === 'video' && publishedVideo && (
        <div className="bg-white p-6 rounded-3xl border border-purple-100/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-4 h-4 text-[#6D0281]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Clinical Director Guidance Video (Dr. Sweety Bhatnagar)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 aspect-video rounded-2xl overflow-hidden bg-slate-900">
              <iframe
                src={getEmbedUrl(publishedVideo.youtubeUrl)}
                title={publishedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{publishedVideo.title}</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {publishedVideo.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
