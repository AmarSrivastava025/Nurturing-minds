import React from 'react';
import { X, Bell, CheckCheck, Video, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { Notification, Role } from '../types';
import { store } from '../services/store';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  currentUserRole: Role;
  currentUserId: string;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUserRole,
  currentUserId,
}) => {
  if (!isOpen) return null;

  // Filter notifications relevant to current role / user
  const relevantNotifs = notifications.filter((n) => {
    if (n.userId === 'all' || n.targetRole === 'all') return true;
    if (n.userId === currentUserId) return true;
    if (n.targetRole === currentUserRole) return true;
    return false;
  });

  const unreadCount = relevantNotifs.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    store.markAllNotificationsAsRead(currentUserRole, currentUserId);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'video_published':
        return <Video className="w-4 h-4 text-purple-600" />;
      case 'late_payment':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'therapist_mapped':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'progress_approved':
        return <Sparkles className="w-4 h-4 text-pink-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#6D0281]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#6D0281] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Practice Notifications</h2>
              <p className="text-[11px] text-purple-200">
                System of record inbox • {unreadCount} unread
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition text-white flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/15 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of alerts */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
          {relevantNotifs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No notifications yet.</p>
              <p className="text-[11px] text-slate-400">All practice updates and session notes appear here.</p>
            </div>
          ) : (
            relevantNotifs.map((item) => (
              <div
                key={item.id}
                onClick={() => store.markNotificationAsRead(item.id)}
                className={`pt-2.5 first:pt-0 pb-1 flex items-start gap-3 transition cursor-pointer rounded-xl p-2.5 ${
                  !item.read ? 'bg-purple-50/70 border border-purple-100/80' : 'hover:bg-slate-50'
                }`}
              >
                <div className="p-2 rounded-xl bg-white shadow-xs border border-slate-100 mt-0.5 shrink-0">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 mt-1 font-medium leading-relaxed">
                    {item.message}
                  </p>

                  {!item.read && (
                    <span className="inline-block mt-1.5 text-[10px] font-medium text-[#6D0281] bg-purple-100/60 px-2 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>In-app notification records are saved persistently.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
