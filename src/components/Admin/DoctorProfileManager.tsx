import React, { useState } from 'react';
import { User, MapPin, Mail, Phone, Award, CheckCircle2 } from 'lucide-react';
import { DoctorProfile } from '../../types';
import { store } from '../../services/store';

interface DoctorProfileManagerProps {
  profile: DoctorProfile;
}

export const DoctorProfileManager: React.FC<DoctorProfileManagerProps> = ({ profile }) => {
  const [formData, setFormData] = useState<DoctorProfile>({ ...profile });
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateDoctorProfile(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-[#6D0281]" />
          Clinical Director Profile (Dr. Sweety Bhatnagar)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Public clinical identity, displayed prominently to parents and therapy staff.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-purple-100/80 shadow-xs max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#6D0281] shrink-0 bg-slate-100">
              <img
                src={formData.photoUrl}
                alt={formData.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="font-semibold text-slate-700 block mb-1">Photo URL</label>
              <input
                type="url"
                required
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Director Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Qualifications *</label>
              <input
                type="text"
                required
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Practice Email *</label>
              <input
                type="email"
                required
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Practice Phone *</label>
              <input
                type="text"
                required
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Physical Clinic Center Address *</label>
            <input
              type="text"
              required
              value={formData.clinicAddress}
              onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Clinical Bio & Philosophy *</label>
            <textarea
              rows={4}
              required
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none leading-relaxed"
            />
          </div>

          {isSaved && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Practice Director profile updated and synced across all parent and staff portals!
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#6D0281] hover:bg-[#570167] text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
