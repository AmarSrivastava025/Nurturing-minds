import React, { useState } from 'react';
import {
  KeyRound,
  UserCheck,
  Search,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Shield,
  Heart,
  Stethoscope,
  Sparkles,
  ExternalLink,
  Lock,
  Edit2,
  X,
  AlertCircle,
  MessageSquare,
  Users,
} from 'lucide-react';
import { DoctorProfile, Patient, Therapist } from '../../types';
import { store } from '../../services/store';

interface MemberAccountManagerProps {
  patients: Patient[];
  therapists: Therapist[];
  doctorProfile: DoctorProfile;
}

export const MemberAccountManager: React.FC<MemberAccountManagerProps> = ({
  patients,
  therapists,
  doctorProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'parent' | 'therapist' | 'admin'>('all');

  // Password visibility map (id -> boolean)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<{
    id: string;
    type: 'patient' | 'therapist' | 'admin';
    name: string;
    loginId: string;
    currentPassword?: string;
    phone?: string;
  } | null>(null);

  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [customLoginIdInput, setCustomLoginIdInput] = useState('');
  const [isEditingLoginId, setIsEditingLoginId] = useState(false);

  // Toggle password visibility
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Generate clean, secure readable password
  const generateRandomPassword = () => {
    const prefixes = ['Nurture', 'Care', 'Milestone', 'Focus', 'Bright', 'Bloom', 'Sensory'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const symbols = ['!', '@', '#', '$'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    return `${prefix}${num}${symbol}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Copy single field
  const copyToClipboard = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied ${label} to clipboard!`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Copy full executive WhatsApp / SMS Slip for parent
  const copyParentSlip = (p: Patient) => {
    const loginId = p.parentLoginId || p.parentEmail || p.motherContact;
    const password = p.parentPassword || 'parent123';
    const parentName = p.primaryContact === 'mother' ? p.motherName : p.fatherName;
    const phone = p.primaryContact === 'mother' ? p.motherContact : p.fatherContact;

    const slip = `*Nurturing Minds Therapy Center*\nDear ${parentName} (Parent of ${p.childName}),\n\nHere are your login credentials to access your child's clinical records, approved milestone summaries, and invoices:\n\n👤 *Login ID:* ${loginId}\n🔒 *Password:* ${password}\n🌐 *Portal Link:* ${window.location.origin}\n\nIf you ever forget your password, you can contact Dr. Sweety Bhatnagar at ${doctorProfile.phone}.\n\nWarm regards,\nDr. Sweety Bhatnagar (Clinical Director)\nNurturing Minds Therapy Center`;

    navigator.clipboard.writeText(slip);
    setCopiedId(`slip-${p.id}`);
    showToast(`WhatsApp message slip copied for ${parentName}!`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  // Copy full executive WhatsApp / SMS Slip for therapist
  const copyTherapistSlip = (t: Therapist) => {
    const loginId = t.loginId || t.email;
    const password = t.password || 'therapist123';

    const slip = `*Nurturing Minds Clinical Staff Portal*\nDear ${t.name},\n\nHere are your clinical portal login credentials:\n\n👤 *Staff Login ID:* ${loginId}\n🔒 *Staff Password:* ${password}\n🌐 *Portal Link:* ${window.location.origin}\n\nAccess daily 45-minute clinical appointments, log fast session notes, and manage your caseload.\n\nWarm regards,\nDr. Sweety Bhatnagar (Clinical Director)`;

    navigator.clipboard.writeText(slip);
    setCopiedId(`slip-${t.id}`);
    showToast(`WhatsApp message slip copied for ${t.name}!`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  // Open Reset Password Modal
  const openResetModal = (
    id: string,
    type: 'patient' | 'therapist' | 'admin',
    name: string,
    loginId: string,
    currentPassword?: string,
    phone?: string
  ) => {
    setResetModalUser({
      id,
      type,
      name,
      loginId,
      currentPassword,
      phone,
    });
    setNewPasswordInput(generateRandomPassword());
    setCustomLoginIdInput(loginId);
    setIsEditingLoginId(false);
  };

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;

    const pwd = newPasswordInput.trim();
    if (!pwd) {
      alert('Please provide a password.');
      return;
    }

    if (resetModalUser.type === 'patient') {
      store.resetMemberPassword(resetModalUser.id, pwd);
      if (isEditingLoginId && customLoginIdInput.trim()) {
        store.updateMemberCredentials(resetModalUser.id, {
          parentLoginId: customLoginIdInput.trim(),
        });
      }
      showToast(`Password successfully reset for ${resetModalUser.name}!`);
    } else if (resetModalUser.type === 'therapist') {
      store.resetTherapistPassword(resetModalUser.id, pwd);
      if (isEditingLoginId && customLoginIdInput.trim()) {
        store.updateTherapistCredentials(resetModalUser.id, {
          loginId: customLoginIdInput.trim(),
        });
      }
      showToast(`Password successfully reset for ${resetModalUser.name}!`);
    } else if (resetModalUser.type === 'admin') {
      store.updateDoctorCredentials({
        adminPassword: pwd,
        ...(isEditingLoginId && customLoginIdInput.trim() ? { adminLoginId: customLoginIdInput.trim() } : {}),
      });
      showToast('Director admin credentials updated successfully!');
    }

    setResetModalUser(null);
  };

  // Filtered lists
  const query = searchQuery.toLowerCase().trim();

  const filteredPatients = patients.filter((p) => {
    if (roleFilter === 'therapist' || roleFilter === 'admin') return false;
    if (!query) return true;
    return (
      p.childName.toLowerCase().includes(query) ||
      p.motherName.toLowerCase().includes(query) ||
      p.fatherName.toLowerCase().includes(query) ||
      (p.parentEmail && p.parentEmail.toLowerCase().includes(query)) ||
      (p.parentLoginId && p.parentLoginId.toLowerCase().includes(query)) ||
      (p.motherContact && p.motherContact.includes(query)) ||
      (p.fatherContact && p.fatherContact.includes(query)) ||
      p.id.toLowerCase().includes(query)
    );
  });

  const filteredTherapists = therapists.filter((t) => {
    if (roleFilter === 'parent' || roleFilter === 'admin') return false;
    if (!query) return true;
    return (
      t.name.toLowerCase().includes(query) ||
      (t.email && t.email.toLowerCase().includes(query)) ||
      (t.loginId && t.loginId.toLowerCase().includes(query)) ||
      (t.phone && t.phone.includes(query))
    );
  });

  const showAdminRow =
    roleFilter === 'all' || roleFilter === 'admin'
      ? !query ||
        doctorProfile.name.toLowerCase().includes(query) ||
        (doctorProfile.contactEmail && doctorProfile.contactEmail.toLowerCase().includes(query)) ||
        (doctorProfile.adminLoginId && doctorProfile.adminLoginId.toLowerCase().includes(query))
      : false;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-purple-400/40 flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-linear-to-r from-[#6D0281] to-[#4A0158] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold text-purple-200 uppercase tracking-wider border border-white/10">
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              Administrative Security & Access Control
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Member & Staff Credential Management
            </h1>
            <p className="text-xs sm:text-sm text-purple-100 max-w-2xl leading-relaxed">
              Complete directory of all registered member families, clinical therapists, and practice logins. Reset passwords instantly when anyone has login trouble, and generate 1-click WhatsApp credentials slips.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-purple-200 uppercase font-bold block">Total Members</span>
              <span className="text-lg font-black text-white">{patients.length} Families</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-purple-200 uppercase font-bold block">Clinical Team</span>
              <span className="text-lg font-black text-white">{therapists.length} Staff</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by child, parent, therapist, email, or mobile..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D0281] bg-slate-50/50 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              roleFilter === 'all'
                ? 'bg-[#6D0281] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Accounts ({patients.length + therapists.length + 1})
          </button>
          <button
            onClick={() => setRoleFilter('parent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
              roleFilter === 'parent'
                ? 'bg-[#6D0281] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Heart className="w-3 h-3 text-rose-500" />
            <span>Members / Parents ({patients.length})</span>
          </button>
          <button
            onClick={() => setRoleFilter('therapist')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
              roleFilter === 'therapist'
                ? 'bg-[#6D0281] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Stethoscope className="w-3 h-3 text-purple-600" />
            <span>Therapists ({therapists.length})</span>
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
              roleFilter === 'admin'
                ? 'bg-[#6D0281] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-3 h-3 text-amber-500" />
            <span>Director</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Practice Director Credentials (Dr. Sweety Bhatnagar) */}
      {showAdminRow && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-3xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-300 shrink-0 shadow-xs bg-purple-900">
                <img
                  src={doctorProfile.photoUrl}
                  alt={doctorProfile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{doctorProfile.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6D0281] text-white">
                    Director & Sole Admin
                  </span>
                </div>
                <p className="text-[11px] text-purple-800 font-medium">{doctorProfile.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Phone: <strong>{doctorProfile.phone}</strong> • Email: {doctorProfile.contactEmail}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-purple-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Admin Login ID</span>
                <span className="text-xs font-mono font-bold text-[#6D0281]">
                  {doctorProfile.adminLoginId || 'connect@drsweetybhatnagar.com'}
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Password</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {visiblePasswords['admin-dir'] ? doctorProfile.adminPassword || 'admin123' : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('admin-dir')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {visiblePasswords['admin-dir'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  openResetModal(
                    'admin-dir',
                    'admin',
                    doctorProfile.name,
                    doctorProfile.adminLoginId || 'connect@drsweetybhatnagar.com',
                    doctorProfile.adminPassword || 'admin123'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-[#6D0281] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Update Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Members / Parents Account Directory */}
      {(roleFilter === 'all' || roleFilter === 'parent') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Registered Members & Parents ({filteredPatients.length})</span>
            </h2>
            <span className="text-[11px] text-slate-500">
              Parents log in with their Login ID / Email & Password to view milestones & schedules
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Child & Family Member</th>
                    <th className="px-4 py-3.5">Login ID / Username</th>
                    <th className="px-4 py-3.5">Contact Phone</th>
                    <th className="px-4 py-3.5">Portal Password</th>
                    <th className="px-4 py-3.5">Assigned Therapist</th>
                    <th className="px-5 py-3.5 text-right">Account Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                        No member accounts found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((p) => {
                      const loginId = p.parentLoginId || p.parentEmail || p.motherContact;
                      const pwd = p.parentPassword || 'parent123';
                      const isPwdVisible = !!visiblePasswords[p.id];
                      const therapist = therapists.find((t) => t.id === p.assignedTherapistId);
                      const primaryPhone =
                        p.primaryContact === 'mother' ? p.motherContact : p.fatherContact;
                      const primaryParentName =
                        p.primaryContact === 'mother' ? p.motherName : p.fatherName;

                      return (
                        <tr key={p.id} className="hover:bg-purple-50/30 transition">
                          {/* Child & Family */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#6D0281] font-bold flex items-center justify-center shrink-0 border border-purple-200">
                                {p.childName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <span>{p.childName}</span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    ({p.age}y, {p.bloodGroup})
                                  </span>
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Parents: <strong>{p.motherName}</strong> & {p.fatherName}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Login ID */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-[#6D0281] bg-purple-50 px-2 py-0.5 rounded border border-purple-100 max-w-[190px] truncate block">
                                {loginId}
                              </span>
                              <button
                                type="button"
                                title="Copy Login ID"
                                onClick={() => copyToClipboard(loginId, `login-${p.id}`, 'Login ID')}
                                className="text-slate-400 hover:text-[#6D0281] p-1 rounded"
                              >
                                {copiedId === `login-${p.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Contact Phone */}
                          <td className="px-4 py-3.5">
                            <div className="text-[11px]">
                              <span className="font-semibold text-slate-800">{primaryPhone}</span>
                              <span className="text-slate-400 text-[10px] block">
                                ({p.primaryContact})
                              </span>
                            </div>
                          </td>

                          {/* Password */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 min-w-[70px]">
                                {isPwdVisible ? pwd : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(p.id)}
                                title={isPwdVisible ? 'Hide Password' : 'Show Password'}
                                className="text-slate-400 hover:text-slate-600 p-1"
                              >
                                {isPwdVisible ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                title="Copy Password"
                                onClick={() => copyToClipboard(pwd, `pwd-${p.id}`, 'Password')}
                                className="text-slate-400 hover:text-[#6D0281] p-1 rounded"
                              >
                                {copiedId === `pwd-${p.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {p.passwordLastReset && (
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                Reset: {new Date(p.passwordLastReset).toLocaleDateString()}
                              </span>
                            )}
                          </td>

                          {/* Assigned Therapist */}
                          <td className="px-4 py-3.5">
                            <span className="text-[11px] font-semibold text-slate-700 block">
                              {therapist ? therapist.name : 'Dr. Sweety Bhatnagar'}
                            </span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-bold">
                              {p.sessionsPerWeek}x / week
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  openResetModal(
                                    p.id,
                                    'patient',
                                    `${p.childName} (${primaryParentName})`,
                                    loginId,
                                    pwd,
                                    primaryPhone
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6D0281] text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-purple-200"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reset Password</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => copyParentSlip(p)}
                                title="Copy WhatsApp Credentials Message"
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-emerald-200"
                              >
                                {copiedId === `slip-${p.id}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-700" />
                                    <span>Slip Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="w-3 h-3 text-emerald-700" />
                                    <span>Copy WhatsApp Slip</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Clinical Therapists Account Directory */}
      {(roleFilter === 'all' || roleFilter === 'therapist') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-purple-600" />
              <span>Clinical Therapists & Staff ({filteredTherapists.length})</span>
            </h2>
            <span className="text-[11px] text-slate-500">
              Therapists log in with Staff Login ID & Password to access appointments & log notes
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Therapist Profile</th>
                    <th className="px-4 py-3.5">Staff Login ID</th>
                    <th className="px-4 py-3.5">Phone & Email</th>
                    <th className="px-4 py-3.5">Staff Password</th>
                    <th className="px-4 py-3.5">Working Days / Hours</th>
                    <th className="px-5 py-3.5 text-right">Account Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTherapists.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                        No therapist accounts found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredTherapists.map((th) => {
                      const loginId = th.loginId || th.email;
                      const pwd = th.password || 'therapist123';
                      const isPwdVisible = !!visiblePasswords[th.id];

                      return (
                        <tr key={th.id} className="hover:bg-purple-50/30 transition">
                          {/* Therapist */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl overflow-hidden bg-purple-100 border border-purple-200 shrink-0">
                                <img
                                  src={th.photoUrl}
                                  alt={th.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{th.name}</p>
                                <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                  {th.qualification}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Login ID */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-[#6D0281] bg-purple-50 px-2 py-0.5 rounded border border-purple-100 max-w-[190px] truncate block">
                                {loginId}
                              </span>
                              <button
                                type="button"
                                title="Copy Login ID"
                                onClick={() => copyToClipboard(loginId, `login-${th.id}`, 'Login ID')}
                                className="text-slate-400 hover:text-[#6D0281] p-1 rounded"
                              >
                                {copiedId === `login-${th.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Phone & Email */}
                          <td className="px-4 py-3.5">
                            <div className="text-[11px]">
                              <span className="font-semibold text-slate-800 block">
                                {th.phone || '—'}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[180px] block">
                                {th.email}
                              </span>
                            </div>
                          </td>

                          {/* Password */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 min-w-[70px]">
                                {isPwdVisible ? pwd : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(th.id)}
                                title={isPwdVisible ? 'Hide Password' : 'Show Password'}
                                className="text-slate-400 hover:text-slate-600 p-1"
                              >
                                {isPwdVisible ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                title="Copy Password"
                                onClick={() => copyToClipboard(pwd, `pwd-${th.id}`, 'Password')}
                                className="text-slate-400 hover:text-[#6D0281] p-1 rounded"
                              >
                                {copiedId === `pwd-${th.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {th.passwordLastReset && (
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                Reset: {new Date(th.passwordLastReset).toLocaleDateString()}
                              </span>
                            )}
                          </td>

                          {/* Days & Hours */}
                          <td className="px-4 py-3.5">
                            <span className="text-[10px] text-slate-600 block">
                              {th.availableDays ? th.availableDays.join(', ') : 'Mon, Wed, Fri'}
                            </span>
                            <span className="text-[10px] font-bold text-purple-700">
                              {th.workingHours || '09:00 AM - 05:00 PM'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  openResetModal(
                                    th.id,
                                    'therapist',
                                    th.name,
                                    loginId,
                                    pwd,
                                    th.phone
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6D0281] text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-purple-200"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reset Password</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => copyTherapistSlip(th)}
                                title="Copy WhatsApp Credentials Slip"
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-emerald-200"
                              >
                                {copiedId === `slip-${th.id}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-700" />
                                    <span>Slip Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="w-3 h-3 text-emerald-700" />
                                    <span>Copy Slip</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reset Password & Edit Login ID */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-purple-100 relative">
            <button
              type="button"
              onClick={() => setResetModalUser(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#6D0281] flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Reset Password for {resetModalUser.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {resetModalUser.type === 'patient'
                    ? 'Parent / Member Account'
                    : resetModalUser.type === 'therapist'
                    ? 'Clinical Staff Account'
                    : 'Director Admin Account'}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmReset} className="space-y-4 text-xs">
              {/* Login ID Section */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Login ID</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingLoginId(!isEditingLoginId)}
                    className="text-[10px] font-bold text-[#6D0281] hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isEditingLoginId ? 'Cancel Edit' : 'Edit Login ID'}</span>
                  </button>
                </div>
                {isEditingLoginId ? (
                  <input
                    type="text"
                    required
                    value={customLoginIdInput}
                    onChange={(e) => setCustomLoginIdInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-[#6D0281] rounded-xl focus:outline-none bg-white"
                  />
                ) : (
                  <p className="font-mono text-xs font-bold text-slate-800">
                    {customLoginIdInput}
                  </p>
                )}
              </div>

              {/* Password Generator / Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">New Password *</label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput(generateRandomPassword())}
                    className="text-[11px] font-bold text-[#6D0281] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate New</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D0281]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  You can type any custom password or click &quot;Generate New&quot; for a clean, secure one.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#6D0281] hover:bg-[#570167] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Password & Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
