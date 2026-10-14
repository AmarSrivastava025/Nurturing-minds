import React from 'react';
import { ReviewPanel } from './ReviewPanel';

export const PublicReviewPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#FDFCFE] text-[#2D3748] font-sans">
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
        <header className="text-center mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Dr Sweety Bhatnagar, Occupational Therapist
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Thank you for trusting us. Share a few words about your visit.
          </p>
        </header>
        <ReviewPanel />
      </div>
    </div>
  );
};
