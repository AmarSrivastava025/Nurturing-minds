import React, { useRef, useState } from 'react';
import { Star, Copy, RefreshCw, X } from 'lucide-react';

interface ReviewPanelProps {
  onClose?: () => void;
}

type Step = 'form' | 'draft' | 'error';

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ onClose }) => {
  const [step, setStep] = useState<Step>('form');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState('');
  const [placeUrl, setPlaceUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [textError, setTextError] = useState('');
  const toastTimer = useRef<number | null>(null);

  const trimmed = text.trim();

  const validate = () => {
    let ok = true;
    if (rating < 1 || rating > 5) {
      setRatingError('Please tap a star rating of 1 to 5.');
      ok = false;
    } else {
      setRatingError('');
    }
    if (trimmed.length < 20) {
      setTextError('Please write at least 20 characters.');
      ok = false;
    } else if (trimmed.length > 500) {
      setTextError('Please keep your review under 500 characters.');
      ok = false;
    } else {
      setTextError('');
    }
    return ok;
  };

  const submit = async () => {
    if (isLoading) return;
    if (!validate()) return;

    setIsLoading(true);
    setStep('form');
    try {
      const res = await fetch('/api/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, text: trimmed }),
      });
      if (!res.ok) throw new Error('request_failed');
      const data = await res.json();
      if (!data || typeof data.review !== 'string' || !data.review.trim()) {
        throw new Error('empty_review');
      }
      setDraft(data.review.trim());
      setPlaceUrl(typeof data.placeUrl === 'string' ? data.placeUrl : '');
      setStep('draft');
    } catch {
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      document.body.removeChild(el);
    }
    setShowToast(true);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setShowToast(false), 1800);
  };

  const handleCopy = () => {
    void copyToClipboard(draft);
  };

  const handlePostOnGoogle = () => {
    void copyToClipboard(draft);
    if (placeUrl) {
      window.open(placeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleStartAgain = () => {
    setStep('form');
    setRating(0);
    setText('');
    setDraft('');
    setPlaceUrl('');
    setRatingError('');
    setTextError('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full">
      {(onClose || step === 'form') && (
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Leave a Google Review</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="min-h-[48px] min-w-[48px] -mr-2 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors duration-150"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      <div className="p-5">
        {(step === 'form' || isLoading) && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Your rating <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                      aria-pressed={rating === value}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors duration-150 ${
                          value <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <span className="text-sm font-semibold text-slate-700 ml-1">{rating} of 5</span>
                )}
              </div>
              {ratingError && <p className="text-[11px] text-rose-600 mt-1">{ratingError}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                What was your experience? <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tell us in your own words what it was like."
                className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D0281]/30 focus:border-[#6D0281] resize-none"
              />
              <div className="flex items-start justify-between gap-3 mt-1">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your words are sent to an AI service to help tidy your review. Do not include your child&apos;s name
                  or medical details.
                </p>
                <span className="text-[11px] text-slate-400 shrink-0">{text.length}/500</span>
              </div>
              {textError && <p className="text-[11px] text-rose-600 mt-1">{textError}</p>}
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={isLoading}
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#6D0281] hover:bg-[#570167] disabled:opacity-60 text-white font-bold text-sm transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Writing your review...
                </>
              ) : (
                'Write my review'
              )}
            </button>

            {isLoading && (
              <p className="text-[11px] text-slate-500 text-center">
                Please wait a moment while we tidy your words.
              </p>
            )}
          </div>
        )}

        {step === 'draft' && !isLoading && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-700">
              Please read and edit this so it sounds like you.
            </p>
            <textarea
              rows={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D0281]/30 focus:border-[#6D0281] resize-none"
            />

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Copy review
              </button>
              <button
                type="button"
                onClick={handlePostOnGoogle}
                className="w-full min-h-[48px] px-4 rounded-xl bg-[#6D0281] hover:bg-[#570167] text-white font-bold text-sm transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                Post on Google
              </button>
              <button
                type="button"
                onClick={handleStartAgain}
                className="w-full min-h-[48px] flex items-center justify-center text-xs font-semibold text-[#6D0281] underline underline-offset-2 transition-colors duration-150"
              >
                Start again
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your review is public on Google. Please post only what is true for you.
            </p>
          </div>
        )}

        {step === 'error' && !isLoading && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">We couldn&apos;t write this right now. Please try again.</p>
            <button
              type="button"
              onClick={() => void submit()}
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#6D0281] hover:bg-[#570167] text-white font-bold text-sm transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg">
          Copied!
        </div>
      )}
    </div>
  );
};
