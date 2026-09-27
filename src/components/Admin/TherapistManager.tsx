import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Stethoscope,
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  Award,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { Patient, ProgressSummary, Session, Therapist } from '../../types';
import { store } from '../../services/store';

interface TherapistManagerProps {
  therapists: Therapist[];
  patients: Patient[];
  sessions: Session[];
  progressSummaries: ProgressSummary[];
  onSwitchToTherapist?: (therapistId: string) => void;
  onNavigateToPatientCRM?: () => void;
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1594824813681-4355523a60f9?auto=format&fit=crop&q=80&w=500',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=500',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=500',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=500',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500',
];

export const TherapistManager: React.FC<TherapistManagerProps> = ({
  therapists,
  patients,
  sessions,
  progressSummaries,
  onSwitchToTherapist,
  onNavigateToPatientCRM,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTherapistForDetail, setSelectedTherapistForDetail] = useState<Therapist | null>(null);
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    qualification: '',
    specialization: '',
    experienceYears: 5,
    summary: '',
    photoUrl: DEFAULT_AVATARS[0],
    availableDays: ['Monday', 'Wednesday', 'Friday'],
  });

  const allAvailableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Filtered therapists
  const filteredTherapists = therapists.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.qualification.toLowerCase().includes(q) ||
      (t.specialization && t.specialization.toLowerCase().includes(q)) ||
      t.email.toLowerCase().includes(q)
    );
  });

  // Calculate stats
  const totalTherapists = therapists.length;
  const directorCount = therapists.filter((t) => t.id === 'th-3' || t.name.includes('Sweety')).length;
  const clinicalStaffCount = totalTherapists - directorCount;
  const totalAssignedChildren = patients.filter((p) => p.assignedTherapistId).length;

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      qualification: 'Senior Pediatric Occupational Therapist (BOT, Sensory Integration)',
      specialization: 'Fine Motor Development & Sensory Modulation',
      experienceYears: 4,
      summary: 'Passionate about guiding young children through structured sensory integration and motor milestones.',
      photoUrl: DEFAULT_AVATARS[0],
      availableDays: ['Monday', 'Wednesday', 'Friday'],
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (t: Therapist) => {
    setEditingTherapist(t);
    setFormData({
      name: t.name,
      email: t.email,
      phone: t.phone || '',
      qualification: t.qualification,
      specialization: t.specialization || '',
      experienceYears: t.experienceYears || 5,
      summary: t.summary,
      photoUrl: t.photoUrl,
      availableDays: t.availableDays || ['Monday', 'Wednesday', 'Friday'],
    });
  };

  const handleToggleDay = (day: string) => {
    setFormData((prev) => {
      const exists = prev.availableDays.includes(day);
      if (exists) {
        return { ...prev, availableDays: prev.availableDays.filter((d) => d !== day) };
      } else {
        return { ...prev, availableDays: [...prev.availableDays, day] };
      }
    });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setErrorMessage('Name and Email are required.');
      return;
    }

    try {
      store.createTherapist({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        qualification: formData.qualification.trim(),
        specialization: formData.specialization.trim(),
        experienceYears: Number(formData.experienceYears) || 3,
        summary: formData.summary.trim(),
        photoUrl: formData.photoUrl || DEFAULT_AVATARS[0],
        availableDays: formData.availableDays,
        status: 'active',
      });

      setShowAddModal(false);
      setSuccessMessage(`Therapist "${formData.name}" added successfully! An invite code has been generated.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add therapist.';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTherapist) return;

    try {
      store.updateTherapist(editingTherapist.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        qualification: formData.qualification.trim(),
        specialization: formData.specialization.trim(),
        experienceYears: Number(formData.experienceYears) || 5,
        summary: formData.summary.trim(),
        photoUrl: formData.photoUrl,
        availableDays: formData.availableDays,
      });

      setEditingTherapist(null);
      setSuccessMessage(`Profile for "${formData.name}" updated successfully.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update therapist.';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  const handleDeleteTherapist = (t: Therapist) => {
    if (t.id === 'th-3') {
      alert('Cannot delete Practice Director Dr. Sweety Bhatnagar.');
      return;
    }

    const assignedCount = patients.filter((p) => p.assignedTherapistId === t.id).length;
    const confirmText = assignedCount > 0
      ? `Therapist "${t.name}" has ${assignedCount} assigned child patient(s). Deleting will automatically safely reassign all patients and sessions to Practice Director Dr. Sweety Bhatnagar. Proceed?`
      : `Are you sure you want to remove therapist "${t.name}" from the practice?`;

    if (window.confirm(confirmText)) {
      try {
        store.deleteTherapist(t.id);
        setSuccessMessage(`Therapist "${t.name}" removed. Any patients were safely reassigned to Dr. Sweety Bhatnagar.`);
        setTimeout(() => setSuccessMessage(''), 4000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete therapist.';
        setErrorMessage(msg);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-red-700 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Therapist Directory & Staff Profiles
            </h2>
            <span className="bg-purple-100 text-[#6D0281] text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
              {totalTherapists} Therapists On Staff
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Clinical team overseen by Practice Director Dr. Sweety Bhatnagar. View caseloads, qualifications, and schedules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-[#6D0281] hover:bg-[#570167] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add New Therapist
          </button>
        </div>
      </div>

      {/* Top Metric Cards: Clearly answers "How many therapists I have" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Therapists */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Total Therapists
            </span>
            <div className="p-2 bg-purple-50 text-[#6D0281] rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#6D0281]">{totalTherapists}</span>
            <p className="text-xs text-slate-500 mt-0.5">
              1 Practice Director • {clinicalStaffCount} Staff Therapists
            </p>
          </div>
        </div>

        {/* Card 2: Active Caseload Coverage */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Caseload Mapped
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{totalAssignedChildren}</span>
            <p className="text-xs text-emerald-600 mt-0.5 font-medium">
              100% of enrolled children assigned
            </p>
          </div>
        </div>

        {/* Card 3: In-Center Sessions */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Scheduled Sessions
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{sessions.length}</span>
            <p className="text-xs text-slate-500 mt-0.5">
              Across clinical team this period
            </p>
          </div>
        </div>

        {/* Card 4: Clinical Supervision */}
        <div className="bg-white p-5 rounded-xl border border-purple-100/80 shadow-xs flex flex-col justify-between bg-gradient-to-br from-purple-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Supervisory Model
            </span>
            <div className="p-2 bg-[#F27D26]/10 text-[#F27D26] rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-bold text-[#6D0281]">Open In-Center Partnership</span>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Therapists log quick notes; Dr. Bhatnagar personally verifies parent progress summaries.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search therapists by name, qualification, specialization, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#6D0281] transition-colors"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium px-2 shrink-0">
          Showing {filteredTherapists.length} of {therapists.length} therapists
        </div>
      </div>

      {/* Therapist Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTherapists.map((therapist) => {
          const isDirector = therapist.id === 'th-3' || therapist.name.includes('Sweety');
          const assignedPatients = patients.filter((p) => p.assignedTherapistId === therapist.id);
          const therapistSessions = sessions.filter((s) => s.therapistId === therapist.id);

          return (
            <div
              key={therapist.id}
              className="bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition shadow-xs flex flex-col overflow-hidden group"
            >
              {/* Card Header & Avatar */}
              <div className="p-5 border-b border-gray-50 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={therapist.photoUrl}
                      alt={therapist.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-purple-100 shadow-xs"
                    />
                    {isDirector ? (
                      <div
                        className="absolute -bottom-1 -right-1 bg-[#F27D26] text-white p-1 rounded-full shadow-xs"
                        title="Practice Director"
                      >
                        <Award className="w-3 h-3" />
                      </div>
                    ) : (
                      <div
                        className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-xs"
                        title="Active Clinical Staff"
                      >
                        <Stethoscope className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {therapist.name}
                      </h3>
                      {isDirector && (
                        <span className="text-[10px] font-bold bg-[#6D0281] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Director
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6D0281] font-medium truncate mt-0.5">
                      {therapist.qualification}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {therapist.experienceYears || (isDirector ? 16 : 5)}+ Years Experience
                    </p>
                  </div>
                </div>

                {/* Edit & Delete Action icons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(therapist)}
                    className="p-1.5 text-gray-400 hover:text-[#6D0281] hover:bg-purple-50 rounded-lg transition"
                    title="Edit Therapist Profile"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {!isDirector && (
                    <button
                      onClick={() => handleDeleteTherapist(therapist)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remove Therapist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body: Profile Details */}
              <div className="p-5 flex-1 space-y-3.5 text-xs text-slate-600">
                {/* Specialization */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Clinical Specialization
                  </span>
                  <p className="text-slate-800 font-medium text-xs">
                    {therapist.specialization || 'Pediatric Occupational Therapy & Sensory Integration'}
                  </p>
                </div>

                {/* Clinical Bio / Summary */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Profile Summary
                  </span>
                  <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                    {therapist.summary}
                  </p>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-[#6D0281] shrink-0" />
                    <span className="truncate">{therapist.email}</span>
                  </div>
                  {therapist.phone && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-[#6D0281] shrink-0" />
                      <span>{therapist.phone}</span>
                    </div>
                  )}
                </div>

                {/* Available Days */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Available Days
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(therapist.availableDays || ['Mon', 'Wed', 'Fri']).map((day) => (
                      <span
                        key={day}
                        className="px-2 py-0.5 bg-gray-100 text-slate-700 text-[10px] font-medium rounded-md"
                      >
                        {day.substring(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Caseload Stat Pill */}
                <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#6D0281] font-bold uppercase tracking-wider block">
                      Active Caseload
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      {assignedPatients.length} Children
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                      Sessions
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {therapistSessions.length} Scheduled
                    </span>
                  </div>
                </div>

                {/* Assigned Children previews */}
                {assignedPatients.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Assigned Patients:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedPatients.map((p) => (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 bg-purple-100 text-[#6D0281] text-[11px] font-medium rounded-full"
                        >
                          {p.childName} ({p.age}y)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedTherapistForDetail(therapist)}
                  className="text-xs font-bold text-[#6D0281] hover:text-[#570167] flex items-center gap-1 transition"
                >
                  View Full Profile & Caseload <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {onSwitchToTherapist && !isDirector && (
                  <button
                    onClick={() => onSwitchToTherapist(therapist.id)}
                    className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-purple-200 text-[#6D0281] rounded-lg text-[11px] font-semibold transition"
                    title="Switch test session view to this therapist"
                  >
                    Test View
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Therapist Detail Modal */}
      {selectedTherapistForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-[#6D0281] text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={selectedTherapistForDetail.photoUrl}
                  alt={selectedTherapistForDetail.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/40 shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{selectedTherapistForDetail.name}</h3>
                    {selectedTherapistForDetail.id === 'th-3' && (
                      <span className="text-[10px] bg-[#F27D26] text-white font-bold px-2 py-0.5 rounded-full uppercase">
                        Director
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-200 mt-0.5">
                    {selectedTherapistForDetail.qualification}
                  </p>
                  <p className="text-xs text-purple-300 mt-0.5">
                    {selectedTherapistForDetail.email} • {selectedTherapistForDetail.phone || 'Phone on file'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTherapistForDetail(null)}
                className="text-purple-200 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* Clinical Focus */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Clinical Specialization & Bio
                </h4>
                <p className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100 leading-relaxed">
                  <span className="font-bold text-[#6D0281] block mb-1">
                    {selectedTherapistForDetail.specialization || 'Pediatric Occupational Therapy'}
                  </span>
                  {selectedTherapistForDetail.summary}
                </p>
              </div>

              {/* Assigned Children Caseload Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Assigned Active Children (
                    {patients.filter((p) => p.assignedTherapistId === selectedTherapistForDetail.id).length}
                    )
                  </h4>
                  {onNavigateToPatientCRM && (
                    <button
                      onClick={() => {
                        setSelectedTherapistForDetail(null);
                        onNavigateToPatientCRM();
                      }}
                      className="text-[11px] text-[#6D0281] font-bold hover:underline"
                    >
                      Manage in Patient CRM &rarr;
                    </button>
                  )}
                </div>

                {patients.filter((p) => p.assignedTherapistId === selectedTherapistForDetail.id).length === 0 ? (
                  <p className="p-4 bg-gray-50 rounded-xl text-slate-400 text-center">
                    No children assigned currently.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                        <tr>
                          <th className="px-4 py-2.5">Child</th>
                          <th className="px-4 py-2.5">Age</th>
                          <th className="px-4 py-2.5">Symptoms / Chief Complaint</th>
                          <th className="px-4 py-2.5">Session Timing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {patients
                          .filter((p) => p.assignedTherapistId === selectedTherapistForDetail.id)
                          .map((child) => (
                            <tr key={child.id} className="hover:bg-purple-50/30">
                              <td className="px-4 py-2.5 font-bold text-slate-900">
                                {child.childName}
                              </td>
                              <td className="px-4 py-2.5">{child.age} yrs</td>
                              <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">
                                {child.symptom}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-[#6D0281]">
                                {child.sessionTiming}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Progress Summaries History */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Fortnightly Progress Reports Under Supervision
                </h4>
                <div className="space-y-2">
                  {progressSummaries
                    .filter((prog) => {
                      const pat = patients.find((p) => p.id === prog.patientId);
                      return pat?.assignedTherapistId === selectedTherapistForDetail.id;
                    })
                    .slice(0, 3)
                    .map((prog) => {
                      const pat = patients.find((p) => p.id === prog.patientId);
                      return (
                        <div
                          key={prog.id}
                          className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              {pat?.childName} ({prog.periodStart} to {prog.periodEnd})
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                prog.approved
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {prog.approved ? 'Approved by Dr. Bhatnagar' : 'In Approval Queue'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {prog.approved ? prog.finalReport : prog.aiDraft}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  const t = selectedTherapistForDetail;
                  setSelectedTherapistForDetail(null);
                  handleOpenEditModal(t);
                }}
                className="px-4 py-2 bg-white border border-purple-200 text-[#6D0281] font-semibold text-xs rounded-xl hover:bg-purple-50 transition"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setSelectedTherapistForDetail(null)}
                className="px-4 py-2 bg-[#6D0281] text-white font-semibold text-xs rounded-xl hover:bg-[#570167] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Therapist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-[#6D0281] rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Add New Clinical Therapist</h3>
                  <p className="text-[11px] text-slate-400">
                    Add profile to Nurturing Minds staff directory and generate registration invite
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Pooja Mehra"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email (for staff invite) *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="pooja.mehra@nurturingminds.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98100 12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Years of Clinical Experience</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Clinical Qualification *</label>
                <input
                  type="text"
                  required
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  placeholder="e.g. Senior Pediatric Occupational Therapist (BOT, MOT)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Specialization Focus</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g. Tactile Sensory Integration, Oral Motor Stimulation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Profile Summary / Bio</label>
                <textarea
                  rows={3}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Clinical strengths, approach to child neurodevelopment and parent guidance..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                />
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Profile Photo</label>
                <div className="flex items-center gap-3 mb-2">
                  {DEFAULT_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({ ...formData, photoUrl: url })}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition ${
                        formData.photoUrl === url ? 'border-[#6D0281] scale-105' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={url} alt="Preset avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="Or paste custom image URL..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#6D0281]"
                />
              </div>

              {/* Available Days */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Available Days at Center</label>
                <div className="flex flex-wrap gap-2">
                  {allAvailableDays.map((day) => {
                    const isSelected = formData.availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-[#6D0281] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6D0281] hover:bg-[#570167] text-white font-semibold rounded-lg transition shadow-xs"
                >
                  Save Therapist Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Therapist Modal */}
      {editingTherapist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-[#6D0281] rounded-lg">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Edit Profile: {editingTherapist.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Update clinical credentials, bio, and contact information
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingTherapist(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Years Experience</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Clinical Qualification</label>
                <input
                  type="text"
                  required
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Specialization Focus</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Profile Summary / Bio</label>
                <textarea
                  rows={3}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Photo URL</label>
                <input
                  type="url"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6D0281]"
                />
              </div>

              {/* Available Days */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Available Days at Center</label>
                <div className="flex flex-wrap gap-2">
                  {allAvailableDays.map((day) => {
                    const isSelected = formData.availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-[#6D0281] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingTherapist(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6D0281] hover:bg-[#570167] text-white font-semibold rounded-lg transition shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
