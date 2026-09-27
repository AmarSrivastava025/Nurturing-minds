import React, { useState } from 'react';
import { Video, Send, CheckCircle2, Play, AlertCircle } from 'lucide-react';
import { PublishedVideo } from '../../types';
import { store } from '../../services/store';

interface VideoPublisherProps {
  publishedVideo: PublishedVideo | null;
}

export const VideoPublisher: React.FC<VideoPublisherProps> = ({ publishedVideo }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [publishedJustNow, setPublishedJustNow] = useState(false);

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : url;
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim() || !videoTitle.trim()) return;

    store.publishVideo(youtubeUrl.trim(), videoTitle.trim(), videoDesc.trim());
    setPublishedJustNow(true);
    setTimeout(() => setPublishedJustNow(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Video className="w-5 h-5 text-[#6D0281]" />
          Video Guidance Broadcast & Notification
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Publish educational video to all parents & therapists. Automatically triggers in-app notification to all registered users.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Publish Form */}
        <div className="bg-white p-5 rounded-2xl border border-purple-100/80 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Publish New Educational Video
          </h3>

          <form onSubmit={handlePublish} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                YouTube Video URL *
              </label>
              <input
                type="url"
                required
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Video Title *
              </label>
              <input
                type="text"
                required
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. Supporting Sensory Calming & Tactile Tolerance at Home"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Description & Guidance Notes
              </label>
              <textarea
                rows={3}
                value={videoDesc}
                onChange={(e) => setVideoDesc(e.target.value)}
                placeholder="Clinical context for parents to observe during evening routines..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6D0281] focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-purple-50 text-[11px] text-purple-900 border border-purple-100">
              <span className="font-bold">Broadcast Effect:</span> Clicking &quot;Publish Video&quot; embeds this media in Member and Therapist portals and dispatches an immediate notification to all parent and therapist inboxes.
            </div>

            {publishedJustNow && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Video published and push alerts broadcast to all accounts!
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#6D0281] hover:bg-[#570167] text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Publish Video & Alert All Users
            </button>
          </form>
        </div>

        {/* Live Preview of Currently Published Video */}
        <div className="bg-white p-5 rounded-2xl border border-purple-100/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Currently Broadcasted Video
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              What parents and therapists currently see in their dashboard.
            </p>

            {publishedVideo ? (
              <div className="space-y-3">
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 shadow-sm border border-slate-200">
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
                  <p className="text-[10px] text-slate-400 mt-2">
                    Published on {new Date(publishedVideo.publishedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })} by {publishedVideo.publishedBy}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                No video currently broadcast.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
