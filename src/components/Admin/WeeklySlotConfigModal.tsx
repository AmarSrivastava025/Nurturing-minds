import React, { useState } from 'react';
import { Settings, X, Check, Clock } from 'lucide-react';
import { DayOfWeekSlotTemplate } from '../../types';
import { store } from '../../services/store';

interface WeeklySlotConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklySlotConfigModal: React.FC<WeeklySlotConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [templates, setTemplates] = useState<DayOfWeekSlotTemplate[]>(() =>
    store.getWeeklyTemplates()
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSlotCountChange = (day: DayOfWeekSlotTemplate['day'], newCount: number) => {
    const valid = Math.max(0, Math.min(12, newCount));
    setTemplates((prev) =>
      prev.map((t) => (t.day === day ? { ...t, defaultSlots: valid } : t))
    );
  };

  const handleStartHourChange = (day: DayOfWeekSlotTemplate['day'], startHour: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.day === day ? { ...t, startHour } : t))
    );
  };

  const handleBufferChange = (day: DayOfWeekSlotTemplate['day'], bufferMinutes: number) => {
    setTemplates((prev) =>
      prev.map((t) => (t.day === day ? { ...t, bufferMinutes } : t))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    templates.forEach((tpl) => {
      store.updateWeeklyTemplate(tpl.day, tpl.defaultSlots, tpl.startHour, tpl.bufferMinutes);
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 my-8 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-[#6D0281] border border-purple-100">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Weekly Default 45-Minute Slot Capacity
              </h3>
              <p className="text-xs text-slate-500">
                Set how many 45-minute slots are fixed for each day of the week by default.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 text-purple-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#6D0281] shrink-0" />
            <p>
              Every clinical slot is locked to <strong>45 minutes</strong>. You can configure the
              clinic opening hour and the rest buffer (15 mins recommended) between consecutive
              slots.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            <div className="grid grid-cols-12 bg-slate-50 p-2.5 font-bold text-[11px] text-slate-600 uppercase tracking-wider">
              <div className="col-span-3">Day of Week</div>
              <div className="col-span-3 text-center">Fixed Slots</div>
              <div className="col-span-3">First Slot Start</div>
              <div className="col-span-3 text-right">Buffer Between</div>
            </div>

            {templates.map((tpl) => (
              <div
                key={tpl.day}
                className="grid grid-cols-12 items-center p-3 hover:bg-purple-50/30 transition gap-2"
              >
                <div className="col-span-3">
                  <p className="font-bold text-slate-900">{tpl.day}</p>
                  <p className="text-[10px] text-slate-400">
                    {tpl.defaultSlots === 0 ? 'Closed' : `${tpl.defaultSlots * 45} mins clinic OT`}
                  </p>
                </div>

                <div className="col-span-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSlotCountChange(tpl.day, tpl.defaultSlots - 1)}
                    className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-sm text-[#6D0281]">
                    {tpl.defaultSlots}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSlotCountChange(tpl.day, tpl.defaultSlots + 1)}
                    className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>

                <div className="col-span-3">
                  <input
                    type="time"
                    value={tpl.startHour}
                    onChange={(e) => handleStartHourChange(tpl.day, e.target.value)}
                    disabled={tpl.defaultSlots === 0}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div className="col-span-3 flex items-center justify-end gap-1.5">
                  <select
                    value={tpl.bufferMinutes}
                    onChange={(e) => handleBufferChange(tpl.day, Number(e.target.value))}
                    disabled={tpl.defaultSlots === 0}
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value={0}>0 min (Back-to-back)</option>
                    <option value={10}>10 min buffer</option>
                    <option value={15}>15 min buffer (Clean 1h cycle)</option>
                    <option value={20}>20 min buffer</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              * Any custom day modifications will continue to override these defaults.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savedSuccess}
                className="px-4 py-2 text-xs font-bold text-white bg-[#6D0281] hover:bg-[#570167] rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Defaults Saved!
                  </>
                ) : (
                  'Save Weekly Defaults'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
