import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Flame,
  Quote,
  RefreshCw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  CrestOfExcellenceIcon,
  EternalFlameMedallionIcon,
  HeraldBellIcon,
} from './ClassicAcademicIcons';
import {
  DailyStreakSummary,
  MotivationalQuote,
  PlatformNotificationItem,
  STREAK_MILESTONES,
} from '../lib/dailyEngagementLogic';

interface DailyEngagementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  streakSummary: DailyStreakSummary;
  currentQuote: MotivationalQuote;
  onNextQuote: () => void;
  notifications: PlatformNotificationItem[];
  onMarkAllRead: () => void;
  onPerformDailyCheckIn: () => void;
  onCelebrateMilestonePreview: () => void;
  devicePermission: 'granted' | 'denied' | 'default' | 'unsupported';
  onRequestDevicePermission: () => void;
  onSendTestDeviceNotification: () => void;
  remindersEnabled: boolean;
  reminderTime: string;
  soundEnabled: boolean;
  onUpdateReminderSettings: (updates: {
    dailyRemindersEnabled?: boolean;
    dailyReminderTime?: string;
    soundEffectsEnabled?: boolean;
  }) => void;
}

export const DailyEngagementDrawer: React.FC<DailyEngagementDrawerProps> = ({
  isOpen,
  onClose,
  streakSummary,
  currentQuote,
  onNextQuote,
  notifications,
  onMarkAllRead,
  onPerformDailyCheckIn,
  onCelebrateMilestonePreview,
  devicePermission,
  onRequestDevicePermission,
  onSendTestDeviceNotification,
  remindersEnabled,
  reminderTime,
  soundEnabled,
  onUpdateReminderSettings,
}) => {
  const [activeSection, setActiveSection] = useState<'checkin' | 'notifications'>('checkin');

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Study Check-In, Motivational Quotes & Notification Center"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs"
    >
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Classic Gilded Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <EternalFlameMedallionIcon size={38} className="shrink-0" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Daily Check-In, Streak & Alerts
              </h2>
              <p className="text-[11px] text-amber-200/90 font-medium">
                Auto Login Quotes · Constant OS Practice Reminders
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Check-In Drawer"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section Switcher */}
        <div className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => setActiveSection('checkin')}
            className={`rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeSection === 'checkin'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-600" />
            <span>Streak & Daily Quote</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection('notifications');
              onMarkAllRead();
            }}
            className={`rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeSection === 'notifications'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="h-3.5 w-3.5 text-indigo-600" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 font-mono text-[10px] text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeSection === 'checkin' ? (
            <>
              {/* Daily Streak & Check-In Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                      Daily Study Streak
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-bold text-slate-900">
                        {streakSummary.currentStreak}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {streakSummary.currentStreak === 1 ? 'Consecutive Day' : 'Consecutive Days'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Best Streak: {streakSummary.longestStreak}d · Active Days: {streakSummary.totalActiveDays}
                    </div>
                  </div>

                  {streakSummary.checkedInToday ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 text-xs font-bold text-emerald-900">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Checked In Today</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={onPerformDailyCheckIn}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-xs cursor-pointer"
                    >
                      <Flame className="h-4 w-4" />
                      <span>Check In Now</span>
                    </button>
                  )}
                </div>

                {/* Progress to Next Streak Milestone */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Next Milestone: {streakSummary.nextMilestone}-Day Streak
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {streakSummary.currentStreak}/{streakSummary.nextMilestone} days
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all"
                      style={{ width: `${streakSummary.progressToNextMilestonePct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {STREAK_MILESTONES.slice(0, 5).map((m) => {
                      const reached = streakSummary.currentStreak >= m;
                      return (
                        <span
                          key={m}
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                            reached
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-white text-slate-400 border border-slate-200'
                          }`}
                        >
                          {m}d
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">
                    Test the milestone celebration artwork & fanfare:
                  </span>
                  <button
                    type="button"
                    onClick={onCelebrateMilestonePreview}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Celebrate Milestone</span>
                  </button>
                </div>
              </div>

              {/* Motivational Quote of the Day */}
              <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-amber-50/40 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
                    <CrestOfExcellenceIcon size={24} />
                    <span>Motivational Quote · {currentQuote.theme}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onNextQuote}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-indigo-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Next Quote</span>
                  </button>
                </div>

                <blockquote className="text-sm font-medium italic text-slate-900 leading-relaxed">
                  &ldquo;{currentQuote.quote}&rdquo;
                </blockquote>

                <div className="text-xs text-slate-600">
                  — <strong className="text-slate-900">{currentQuote.author}</strong>,{' '}
                  {currentQuote.role}
                </div>
              </div>

              {/* Platform & Device System Notification Settings */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeraldBellIcon size={28} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Platform & Device System Reminders
                    </h3>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                      devicePermission === 'granted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : devicePermission === 'denied'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {devicePermission === 'granted'
                      ? 'OS Alerts Active'
                      : devicePermission === 'denied'
                      ? 'OS Blocked'
                      : devicePermission === 'unsupported'
                      ? 'In-App Only'
                      : 'Ready to Activate'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Every login automatically dispatches a fresh motivational quote, and constant daily system reminders help you stay consistent with Grade 7 practice.
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1.5 font-semibold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Auto Login Quotes: Active</span>
                  </div>
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1.5 font-semibold text-indigo-900 flex items-center gap-1.5">
                    <BellRing className="h-3.5 w-3.5 text-indigo-700 shrink-0" />
                    <span>Daily Practice Alerts: On</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {devicePermission !== 'granted' && devicePermission !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={onRequestDevicePermission}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E3A8A] px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      <span>Enable Device System Notifications</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onSendTestDeviceNotification}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Send Daily Reminder & Quote Now</span>
                  </button>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="font-semibold text-slate-800">
                      Constant Daily Practice & Quote Reminders
                    </span>
                    <input
                      type="checkbox"
                      checked={remindersEnabled}
                      onChange={(e) =>
                        onUpdateReminderSettings({
                          dailyRemindersEnabled: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600"
                    />
                  </label>

                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>Preferred Daily Reminder Time</span>
                    </span>
                    <input
                      type="time"
                      aria-label="Preferred Daily Reminder Time"
                      value={reminderTime}
                      onChange={(e) =>
                        onUpdateReminderSettings({
                          dailyReminderTime: e.target.value,
                        })
                      }
                      className="rounded-lg border border-slate-300 px-2.5 py-1 font-mono text-xs"
                    />
                  </div>

                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                      {soundEnabled ? (
                        <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span>Milestone Celebration Sound Fanfare</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) =>
                        onUpdateReminderSettings({
                          soundEffectsEnabled: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600"
                    />
                  </label>
                </div>
              </div>
            </>
          ) : (
            /* Platform Notification Feed */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recent Platform & Device Notifications ({notifications.length})
                </h3>
                <button
                  type="button"
                  onClick={onSendTestDeviceNotification}
                  className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
                >
                  + Send New Quote Alert
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center space-y-2">
                  <Bell className="mx-auto h-7 w-7 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-700">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-indigo-700">{item.title}</span>
                      <span className="font-mono text-slate-400">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{item.message}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>
                        {item.deliveredToDevice
                          ? 'Delivered to Platform & Device OS'
                          : 'Delivered in Platform'}
                      </span>
                      {item.quoteAuthor && <span>— {item.quoteAuthor}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
