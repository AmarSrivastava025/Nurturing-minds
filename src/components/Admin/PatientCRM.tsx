import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  User,
  Phone,
  Calendar,
  Clock,
  Sparkles,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { Patient, Therapist } from '../../types';
import { store } from '../../services/store';
import { BatchPatientUploadModal } from './BatchPatientUploadModal';
import { LastMinuteTherapistSwapModal } from './LastMinuteTherapistSwapModal';
import { downloadPatientCsvTemplate } from '../../utils/csvPatientUtils';

interface PatientCRMProps {
  patients: Patient[];
  therapists: Therapist[];
}

export const PatientCRM: React.FC<PatientCRMProps> = ({ patients, therapists }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTherapist, setFilterTherapist] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchUploadModal, setShowBatchUploadModal] = useState(false);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [swapPatient, setSwapPatient] = useState<Patient | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);

  // Payment Flag Modal State
  const [showPaymentFlagModal, setShowPaymentFlagModal] = useState(false);
  const [flagPatient, setFlagPatient] = useState<Patient | null>(null);
  const [flagStatus, setFlagStatus] = useState<'late' | 'partial' | 'current'>('late');
  const [flagAmount, setFlagAmount] = useState<number>(8000);
  const [flagMonth, setFlagMonth] = useState<string>('October 2026');

  // Copy invite state
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // New Patient Form State
  const [formChildName, setFormChildName] = useState('');
  const [formAge, setFormAge] = useState<number>(5);
  const [formBloodGroup, setFormBloodGroup] = useState('B+');
  const [formSymptom, setFormSymptom] = useState('');
  const [formChiefComplaint, setFormChiefComplaint] = useState('');
  const [formFatherName, setFormFatherName] = useState('');
  const [formFatherContact, setFormFatherContact] = useState('');
  const [formMotherName, setFormMotherName] = useState('');
  const [formMotherContact, setFormMotherContact] = useState('');
  const [formPrimaryContact, setFormPrimaryContact] = useState<'father' | 'mother'>('mother');
  const [formEmergencyContact, setFormEmergencyContact] = useState<'father' | 'mother'>('father');
  const [formSessionsPerWeek, setFormSessionsPerWeek] = useState<number>(3);
  const [formAssignedTherapist, setFormAssignedTherapist] = useState<string>(therapists[0]?.id || 'th-1');
  const [formSessionTiming, setFormSessionTiming] = useState('Mon, Wed, Fri • 4:00 PM - 5:00 PM');
  const [paymentConfirmedNotice, setPaymentConfirmedNotice] = useState(true);

  // Filter logic
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.childName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.motherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.symptom.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTherapist = filterTherapist === 'all' || p.assignedTherapistId === filterTherapist;
    const matchesPayment = filterPayment === 'all' || p.paymentStatus === filterPayment;

    return matchesSearch && matchesTherapist && matchesPayment;
  });

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChildName.trim() || !formFatherName.trim() || !formMotherName.trim()) {
      alert('Please fill in required child and parent information.');
      return;
    }

    const newPatient = store.createPatient({
      childName: formChildName.trim(),
      age: Number(formAge),
      bloodGroup: formBloodGroup,
      symptom: formSymptom.trim() || 'Sensory processing sensitivity',
      chiefComplaint: formChiefComplaint.trim() || 'Tabletop fine motor and sensory regulation difficulties',
      fatherName: formFatherName.trim(),
      fatherContact: formFatherContact.trim() || '+91 98765 43210',
      motherName: formMotherName.trim(),
      motherContact: formMotherContact.trim() || '+91 98765 43211',
      primaryContact: formPrimaryContact,
      emergencyContact: formEmergencyContact,
      sessionsPerWeek: Number(formSessionsPerWeek),
      assignedTherapistId: formAssignedTherapist,
      sessionTiming: formSessionTiming.trim(),
      paymentStatus: 'current',
    });

    // Reset Form
    setFormChildName('');
    setFormSymptom('');
    setFormChiefComplaint('');
    setFormFatherName('');
    setFormMotherName('');
    setShowCreateModal(false);
    setSelectedPatient(newPatient);
  };

  const handleSavePaymentFlag = () => {
    if (!flagPatient) return;
    store.setPaymentFlag(flagPatient.id, flagStatus, flagStatus === 'current' ? undefined : flagAmount, flagStatus === 'current' ? undefined : flagMonth);
    setShowPaymentFlagModal(false);
  };

  const handleReassignTherapist = (patientId: string, newTherapistId: string) => {
    store.reassignPatientPrimaryTherapist(patientId, newTherapistId, {
      updateUpcomingSessions: true,
      reason: 'Primary therapist updated via Admin CRM',
    });
  };

  const handleCopyInvite = (patientId: string) => {
    const invites = store.getState().invites;
    const patInvite = invites.find((i) => i.patientId === patientId);
    if (patInvite) {
      navigator.clipboard.writeText(
        `Nurturing Minds Therapy Center: Register your parent account using invite code: ${patInvite.code}`
      );
      setCopiedInviteId(patientId);
      setTimeout(() => setCopiedInviteId(null), 2000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Patient CRM & Clinical Records</h2>
            <span className="text-[10px] bg-purple-100 text-[#6D0281] font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
              {patients.length} Children Enrolled
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Records created by Dr. Bhatnagar only after 90-min assessment & payment confirmation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={downloadPatientCsvTemplate}
            className="px-3 py-2 bg-white hover:bg-purple-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Download blank CSV template with sample data"
          >
            <Download className="w-3.5 h-3.5 text-[#6D0281]" />
            CSV Template
          </button>

          <button
            id="open-batch-upload-btn"
            onClick={() => setShowBatchUploadModal(true)}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-[#6D0281] border border-purple-200 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Upload multiple patients via Excel or CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Upload CSV / Excel
          </button>

          <button
            id="open-create-patient-btn"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#6D0281] hover:bg-[#570167] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Enroll a new child patient record"
          >
            <Plus className="w-4 h-4" />
            Enroll Child
          </button>
        </div>
      </div>

      {/* Batch Import Success Toast */}
      {batchSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{batchSuccessMsg}</span>
          </div>
          <button
            onClick={() => setBatchSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-purple-100/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by child, parent name, or symptom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6D0281] focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterTherapist}
            onChange={(e) => setFilterTherapist(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6D0281] text-slate-700 bg-white"
          >
            <option value="all">All Therapists</option>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6D0281] text-slate-700 bg-white"
          >
            <option value="all">All Payment Statuses</option>
            <option value="current">Current (Paid)</option>
            <option value="late">Late Payment</option>
            <option value="partial">Partial Payment</option>
          </select>
        </div>
      </div>

      {/* Patients Grid/Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => {
          const therapist = therapists.find((t) => t.id === patient.assignedTherapistId);

          return (
            <div
              key={patient.id}
              className="bg-white rounded-2xl border border-purple-100/80 p-5 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 truncate max-w-[200px]" title={patient.childName}>
                      {patient.childName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Age {patient.age} • Blood {patient.bloodGroup}
                    </p>
                  </div>

                  {/* Payment Status Badge */}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                      patient.paymentStatus === 'current'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : patient.paymentStatus === 'late'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1'
                        : 'bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1'
                    }`}
                  >
                    {patient.paymentStatus === 'late' && <AlertTriangle className="w-3 h-3" />}
                    {patient.paymentStatus.toUpperCase()}
                  </span>
                </div>

                {/* Symptom & Complaint */}
                <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-100/60 mb-3 text-xs text-slate-700 space-y-1">
                  <p className="line-clamp-2">
                    <strong className="text-slate-900 font-medium">Symptom:</strong> {patient.symptom}
                  </p>
                  <p className="line-clamp-2 text-slate-600">
                    <strong className="text-slate-900 font-medium">Complaint:</strong> {patient.chiefComplaint}
                  </p>
                </div>

                {/* Parent Contacts & Priority */}
                <div className="space-y-1 text-xs text-slate-600 mb-3">
                  <p className="flex items-center justify-between">
                    <span className="text-slate-500">Mother:</span>
                    <span className="font-medium text-slate-800">
                      {patient.motherName} ({patient.motherContact})
                      {patient.primaryContact === 'mother' && (
                        <span className="ml-1 text-[9px] px-1 bg-purple-100 text-[#6D0281] rounded font-bold">Primary</span>
                      )}
                      {patient.emergencyContact === 'mother' && (
                        <span className="ml-1 text-[9px] px-1 bg-red-100 text-red-700 rounded font-bold">Emergency</span>
                      )}
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-slate-500">Father:</span>
                    <span className="font-medium text-slate-800">
                      {patient.fatherName} ({patient.fatherContact})
                      {patient.primaryContact === 'father' && (
                        <span className="ml-1 text-[9px] px-1 bg-purple-100 text-[#6D0281] rounded font-bold">Primary</span>
                      )}
                      {patient.emergencyContact === 'father' && (
                        <span className="ml-1 text-[9px] px-1 bg-red-100 text-red-700 rounded font-bold">Emergency</span>
                      )}
                    </span>
                  </p>
                </div>

                {/* Therapist Mapping Control */}
                <div className="pt-2.5 border-t border-slate-100 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-500">
                      Assigned Therapist:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSwapPatient(patient);
                        setShowSwapModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg transition border border-amber-200"
                      title="Urgent cover or last-minute therapist reassignment"
                    >
                      <RefreshCw className="w-3 h-3 text-amber-700" />
                      Swap / Cover
                    </button>
                  </div>
                  <select
                    value={patient.assignedTherapistId}
                    onChange={(e) => handleReassignTherapist(patient.id, e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
                  >
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.qualification.split('(')[0].trim()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session Timing */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3">
                  <Clock className="w-3.5 h-3.5 text-[#6D0281]" />
                  <span>{patient.sessionsPerWeek} sess/wk • {patient.sessionTiming}</span>
                </div>
              </div>

              {/* Action Buttons: Set Payment Flag, Copy Invite */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setFlagPatient(patient);
                    setFlagStatus(patient.paymentStatus === 'late' ? 'late' : 'late');
                    setFlagAmount(patient.pendingPaymentAmount || 8000);
                    setFlagMonth(patient.pendingPaymentMonth || 'October 2026');
                    setShowPaymentFlagModal(true);
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-purple-50 hover:text-[#6D0281] text-slate-700 transition"
                >
                  Payment Flag
                </button>

                <button
                  onClick={() => handleCopyInvite(patient.id)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-purple-50 text-[#6D0281] hover:bg-purple-100 transition flex items-center gap-1"
                  title="Copy parent invite link"
                >
                  {copiedInviteId === patient.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Parent Invite
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Flag Configuration Modal */}
      {showPaymentFlagModal && flagPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Set Payment Flag</h3>
                <p className="text-xs text-slate-500">
                  For {flagPatient.childName} ({flagPatient.motherName})
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFlagStatus('current')}
                    className={`py-2 px-3 rounded-xl font-semibold border text-xs transition ${
                      flagStatus === 'current'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Current (Paid)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlagStatus('late')}
                    className={`py-2 px-3 rounded-xl font-semibold border text-xs transition ${
                      flagStatus === 'late'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Late Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlagStatus('partial')}
                    className={`py-2 px-3 rounded-xl font-semibold border text-xs transition ${
                      flagStatus === 'partial'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Partial Payment
                  </button>
                </div>
              </div>

              {flagStatus !== 'current' && (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Pending Amount (₹)</label>
                    <input
                      type="number"
                      value={flagAmount}
                      onChange={(e) => setFlagAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Month Context</label>
                    <input
                      type="text"
                      value={flagMonth}
                      onChange={(e) => setFlagMonth(e.target.value)}
                      placeholder="e.g. October 2026"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                    />
                  </div>

                  {/* Exact Dr. Bhatnagar Wording Preview */}
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-[11px] text-purple-900">
                    <p className="font-bold text-[#6D0281] mb-1">In-App Notification to Parent Preview:</p>
                    <p className="italic bg-white p-2 rounded-lg border border-purple-200">
                      &quot;Dear Parents, Gentle Reminder for the Late Payment of ₹{flagAmount.toLocaleString('en-IN')} for {flagMonth}.&quot;
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPaymentFlagModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePaymentFlag}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#6D0281] hover:bg-[#570167] rounded-xl transition shadow-xs"
              >
                Apply Flag & Notify Parent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Patient Enrollment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">New Child Patient Record</h3>
                <p className="text-xs text-slate-500">
                  90-min face-to-face assessment and payment must be confirmed prior to creation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4 text-xs">
              {/* Child Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Child&apos;s Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formChildName}
                    onChange={(e) => setFormChildName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Age (Years) *</label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    required
                    value={formAge}
                    onChange={(e) => setFormAge(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Blood Group</label>
                  <select
                    value={formBloodGroup}
                    onChange={(e) => setFormBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-white"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sessions Per Week *</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={formSessionsPerWeek}
                    onChange={(e) => setFormSessionsPerWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                  />
                </div>
              </div>

              {/* Symptoms & Chief Complaint */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Symptom Observation</label>
                <textarea
                  rows={2}
                  value={formSymptom}
                  onChange={(e) => setFormSymptom(e.target.value)}
                  placeholder="e.g. Tactile defensiveness, toe-walking, vestibular seeking..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Chief Complaint (from 90-min assessment)</label>
                <textarea
                  rows={2}
                  value={formChiefComplaint}
                  onChange={(e) => setFormChiefComplaint(e.target.value)}
                  placeholder="e.g. Difficulty writing in school lines, avoids haircuts and shoe wearing..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                />
              </div>

              {/* Parent Details */}
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 space-y-3">
                <p className="font-bold text-[#6D0281] text-xs">Parent & Contact Particulars</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Mother&apos;s Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formMotherName}
                      onChange={(e) => setFormMotherName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Mother&apos;s Phone Contact *</label>
                    <input
                      type="text"
                      required
                      value={formMotherContact}
                      onChange={(e) => setFormMotherContact(e.target.value)}
                      placeholder="+91 98711 54322"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Father&apos;s Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formFatherName}
                      onChange={(e) => setFormFatherName(e.target.value)}
                      placeholder="e.g. Rohit Sharma"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Father&apos;s Phone Contact *</label>
                    <input
                      type="text"
                      required
                      value={formFatherContact}
                      onChange={(e) => setFormFatherContact(e.target.value)}
                      placeholder="+91 98711 54321"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Which Contact is Primary?</label>
                    <select
                      value={formPrimaryContact}
                      onChange={(e) => setFormPrimaryContact(e.target.value as 'father' | 'mother')}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
                    >
                      <option value="mother">Mother</option>
                      <option value="father">Father</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Which Contact is Emergency?</label>
                    <select
                      value={formEmergencyContact}
                      onChange={(e) => setFormEmergencyContact(e.target.value as 'father' | 'mother')}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
                    >
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Therapist and Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assign Therapist *</label>
                  <select
                    value={formAssignedTherapist}
                    onChange={(e) => setFormAssignedTherapist(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none bg-white"
                  >
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    An in-app notification fires to this therapist upon enrollment.
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Session Timing *</label>
                  <input
                    type="text"
                    required
                    value={formSessionTiming}
                    onChange={(e) => setFormSessionTiming(e.target.value)}
                    placeholder="e.g. Mon, Wed, Fri • 4:00 PM - 5:00 PM"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                  />
                </div>
              </div>

              {/* Assessment & Payment Confirmation Safeguard */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="confirmPayment"
                  checked={paymentConfirmedNotice}
                  onChange={(e) => setPaymentConfirmedNotice(e.target.checked)}
                  className="rounded text-[#6D0281] focus:ring-[#6D0281]"
                />
                <label htmlFor="confirmPayment" className="text-xs text-slate-600 font-medium">
                  I confirm that Dr. Sweety Bhatnagar conducted the 90-min clinical assessment and enrollment payment is received.
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!paymentConfirmedNotice}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#6D0281] hover:bg-[#570167] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                >
                  Create Patient Record & Issue Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Patient Upload Modal */}
      <BatchPatientUploadModal
        isOpen={showBatchUploadModal}
        onClose={() => setShowBatchUploadModal(false)}
        therapists={therapists}
        onImportSuccess={(count) => {
          setBatchSuccessMsg(`Successfully imported ${count} child patients into the CRM roster!`);
          setTimeout(() => setBatchSuccessMsg(null), 6000);
        }}
      />

      {/* Last-Minute Therapist Swap Modal */}
      <LastMinuteTherapistSwapModal
        isOpen={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          setSwapPatient(null);
        }}
        patient={swapPatient}
        therapists={therapists}
        sessions={store.getState().sessions}
      />
    </div>
  );
};
