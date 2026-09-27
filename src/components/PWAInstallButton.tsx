import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  label,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        App Installed
      </span>
    );
  }

  return (
    <>
      {isInstallable && (
        <button
          id="pwa-install-btn"
          onClick={install}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6D0281] hover:bg-[#570167] active:scale-95 transition rounded-lg shadow-sm ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          {label || 'Install App'}
        </button>
      )}

      {isIOS && (
        <button
          id="pwa-ios-install-btn"
          onClick={() => setShowIOSModal(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D0281] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Add to Home Screen
        </button>
      )}

      {/* Fallback button if browser doesn't expose beforeinstallprompt yet */}
      {!isInstallable && !isIOS && (
        <button
          id="pwa-info-install-btn"
          onClick={() => setShowIOSModal(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D0281] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          {label || 'Install App'}
        </button>
      )}

      {/* iOS Safari / Universal Mobile Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#6D0281]/10 flex items-center justify-center text-[#6D0281]">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Add to Phone Home Screen</h3>
                <p className="text-xs text-slate-500">Essential for receiving live push alerts on iOS & Android</p>
              </div>
            </div>

            <div className="space-y-3 bg-purple-50/70 p-4 rounded-xl text-xs text-slate-700 border border-purple-100">
              <p className="font-semibold text-[#6D0281]">
                Why this step is required:
              </p>
              <p>
                Apple Safari delivers real-time background notifications only to practices and apps added to your device Home Screen.
              </p>

              <div className="space-y-2 pt-2 border-t border-purple-200/60">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#6D0281] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    Tap the <strong>Share</strong> button <Share className="inline w-3.5 h-3.5 text-blue-600 mb-0.5" /> in your Safari bottom navigation bar.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#6D0281] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#6D0281] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Tap <strong>Add</strong> in the top right corner. The Nurturing Minds icon will appear on your phone screen!
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-5 py-2.5 px-4 rounded-xl bg-[#6D0281] hover:bg-[#570167] text-white text-xs font-semibold transition shadow-sm"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
