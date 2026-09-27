import React, { useState } from 'react';
import { Plus, Edit2, Trash2, BookOpen } from 'lucide-react';
import { Program } from '../../types';
import { store } from '../../services/store';

interface ProgramManagerProps {
  programs: Program[];
}

export const ProgramManager: React.FC<ProgramManagerProps> = ({ programs }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleOpenAdd = () => {
    setEditingProgram(null);
    setTitle('');
    setSummary('');
    setImageUrl('https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=600');
    setShowModal(true);
  };

  const handleOpenEdit = (p: Program) => {
    setEditingProgram(p);
    setTitle(p.title);
    setSummary(p.summary);
    setImageUrl(p.imageUrl);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;

    if (editingProgram) {
      store.updateProgram(editingProgram.id, {
        title: title.trim(),
        summary: summary.trim(),
        imageUrl: imageUrl.trim(),
      });
    } else {
      store.addProgram({
        title: title.trim(),
        summary: summary.trim(),
        imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=600',
      });
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this clinical program from the practice catalog?')) {
      store.deleteProgram(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#6D0281]" />
            Practice Services & Program Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Published to both Member (Parent) and Therapist portals for clinical orientation.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-[#6D0281] hover:bg-[#570167] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Program
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {programs.map((program) => (
          <div
            key={program.id}
            className="bg-white rounded-2xl border border-purple-100/80 overflow-hidden shadow-xs hover:shadow-sm transition flex flex-col justify-between"
          >
            <div>
              <div className="h-40 w-full overflow-hidden bg-slate-100">
                <img
                  src={program.imageUrl}
                  alt={program.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-2">{program.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
                  {program.summary}
                </p>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                onClick={() => handleOpenEdit(program)}
                className="p-1.5 text-slate-600 hover:text-[#6D0281] hover:bg-purple-50 rounded-lg transition"
                title="Edit Program"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(program.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete Program"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingProgram ? 'Edit Practice Program' : 'Add New Practice Program'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Published across parent and therapist application portals.
            </p>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Program Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sensory Integration Therapy"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">1-2 Paragraph Clinical Summary *</label>
                <textarea
                  rows={4}
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Describe the therapeutic goals, sensory modalities, and parent observation framework..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#6D0281] hover:bg-[#570167] rounded-xl transition shadow-xs"
                >
                  Save Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
