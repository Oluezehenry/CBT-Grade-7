/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CloudOff,
  Compass,
  FileText,
  Flame,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import {
  ExamAttempt,
  GenerationBatchJob,
  MainNavSection,
  QuestionBankItem,
  StudentBadgeProgress,
  StudentProfile,
  StudentQuestionResponse,
  StudyDocument,
  ValidatedQuestion,
} from './types/cbt';
import { DashboardView } from './components/DashboardView';
import { DocumentsView } from './components/DocumentsView';
import { SubjectsLessonsView } from './components/SubjectsLessonsView';
import { ExamConfigWizard } from './components/ExamConfigWizard';
import { ActiveExamView, AttemptSaveStatus } from './components/ActiveExamView';
import { ExamResultReviewView } from './components/ExamResultReviewView';
import { HistoryAnalyticsView } from './components/HistoryAnalyticsView';
import { SettingsView } from './components/SettingsView';
import { QuestionBankAdminView } from './components/QuestionBankAdminView';
import { AchievementsView } from './components/AchievementsView';
import { BadgeArtwork } from './components/BadgeArtwork';
import { AuthGateView } from './components/AuthGateView';
import { ScholarCBTLogo } from './components/ScholarCBTLogo';
import { PWAInstallButton } from './components/PWAInstallButton';
import { StudentWalkthroughModal } from './components/StudentWalkthrough';
import { DailyEngagementDrawer } from './components/DailyEngagementDrawer';
import {
  MilestoneCelebrationModal,
  MilestoneCelebrationPayload,
} from './components/MilestoneCelebrationModal';
import {
  PlatformNotificationItem,
  buildLoginQuoteNotificationPayload,
  dispatchSystemAndPlatformNotification,
  evaluateDailyCheckInStreak,
  getDailyMotivationalQuote,
  requestDeviceNotificationPermission,
  shouldTriggerDailyReminder,
  toLocalCalendarDateKey,
} from './lib/dailyEngagementLogic';
import { HeraldBellIcon } from './components/ClassicAcademicIcons';
import {
  WalkthroughProgressState,
  createInitialWalkthroughState,
  markAllWalkthroughStepsCompleted,
  markWalkthroughStepCompleted,
} from './lib/walkthroughLogic';
import {
  getAllOfflinePendingAttempts,
  gradeOfflineExamAttempt,
  reconcileRecoverableAttempts,
  saveOfflineAttemptProgress,
  syncPendingOfflineAttemptsWithServer,
} from './lib/offlineEngine';
import {
  BADGE_DEFINITIONS,
  evaluateStudentBadges,
  mergeUnlockedAchievements,
} from './lib/badgeSystem';

export type NavDestination =
  | 'dashboard'
  | 'start_exam'
  | 'subjects'
  | 'subjects_lessons'
  | 'documents'
  | 'question_bank'
  | 'history'
  | 'analytics'
  | 'achievements'
  | 'settings'
  | 'active_exam'
  | 'results'
  | 'result_review';

interface NavMenuItem {
  id: NavDestination;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  walkthroughAttr?: string;
}

const EXAM_PRIMARY_NAV_ITEMS: NavMenuItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'start_exam', label: 'Start Practice / Exam', icon: PlayCircle },
  { id: 'subjects_lessons', label: 'Subjects & Notes', icon: BookOpen },
  { id: 'history', label: 'Exam History', icon: History },
];

const SECONDARY_NAV_ITEMS: NavMenuItem[] = [
  { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: Award,
    walkthroughAttr: 'nav-achievements',
  },
  { id: 'documents', label: 'Curriculum Files', icon: FileText },
  { id: 'question_bank', label: 'Question Bank & Admin', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return true;
      const token = localStorage.getItem('scholarcbt_session_token');
      return Boolean(token);
    } catch {
      return false;
    }
  });

  const [nav, setNav] = useState<NavDestination>(() => {
    try {
      const saved = sessionStorage.getItem('scholarcbt_nav') as NavDestination | null;
      return saved || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const [selectedDocForMapping, setSelectedDocForMapping] = useState<string | null>(null);
  const [preselectedDocForExam, setPreselectedDocForExam] = useState<string | null>(null);
  const [preselectedWeeksForExam, setPreselectedWeeksForExam] = useState<number[] | null>(
    null
  );
  const [focusedAttemptId, setFocusedAttemptId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('scholarcbt_attempt_id');
    } catch {
      return null;
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);
  const [generationJobs, setGenerationJobs] = useState<GenerationBatchJob[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [offlineAnswerKeys, setOfflineAnswerKeys] = useState<
    Record<string, ValidatedQuestion[]>
  >({});

  // Real-time examination save state indicator
  const [attemptSaveStatus, setAttemptSaveStatus] = useState<AttemptSaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);

  // Queued achievement notifications (never displayed during active_exam)
  const [achievementQueue, setAchievementQueue] = useState<StudentBadgeProgress[]>([]);

  // Daily check-in, motivational quote & platform/device notifications state
  const [isEngagementDrawerOpen, setIsEngagementDrawerOpen] = useState<boolean>(false);
  const [quoteOffset, setQuoteOffset] = useState<number>(0);
  const [platformNotifications, setPlatformNotifications] = useState<PlatformNotificationItem[]>(
    () => {
      try {
        const raw = localStorage.getItem('scholarcbt_platform_notifications_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // Ignore storage read error
      }
      return [];
    }
  );
  const [deviceNotificationPermission, setDeviceNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return window.Notification.permission;
  });
  const [activeMilestoneCelebration, setActiveMilestoneCelebration] =
    useState<MilestoneCelebrationPayload | null>(null);
  const [loginQuoteToast, setLoginQuoteToast] = useState<{
    title: string;
    quote: string;
    author: string;
    role: string;
  } | null>(null);

  const enqueueUnlockedAchievements = useCallback((badges: StudentBadgeProgress[]) => {
    if (!badges || badges.length === 0) return;
    setAchievementQueue((prev) => {
      const existingIds = new Set(prev.map((b) => b.badge.id));
      const fresh = badges.filter((b) => !existingIds.has(b.badge.id));
      return [...prev, ...fresh];
    });
    const primaryBadge = badges[0];
    if (primaryBadge) {
      const quote = getDailyMotivationalQuote(toLocalCalendarDateKey(), 0);
      setActiveMilestoneCelebration({
        type: 'badge',
        title: primaryBadge.badge.title,
        subtitle: `${primaryBadge.badge.category} · ${primaryBadge.badge.rarity} Achievement`,
        description: primaryBadge.badge.description,
        rarity: primaryBadge.badge.rarity,
        badgeProgress: primaryBadge,
        quote,
      });
      setPlatformNotifications((prev) => {
        const item: PlatformNotificationItem = {
          id: `notif-badge-${primaryBadge.badge.id}-${Date.now()}`,
          type: 'achievement_unlocked',
          title: `Achievement Unlocked: ${primaryBadge.badge.title}`,
          message: primaryBadge.badge.description,
          quoteAuthor: quote.author,
          createdAt: new Date().toISOString(),
          read: false,
          deliveredToDevice: false,
        };
        const next = [item, ...prev].slice(0, 25);
        try {
          localStorage.setItem('scholarcbt_platform_notifications_v1', JSON.stringify(next));
        } catch {
          // Ignore storage error
        }
        return next;
      });
    }
  }, []);

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [walkthroughState, setWalkthroughState] = useState<WalkthroughProgressState>(() => {
    try {
      const raw = localStorage.getItem('scholarcbt_walkthrough_state_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as WalkthroughProgressState;
        if (Array.isArray(parsed.completedStepIds)) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial state
    }
    return createInitialWalkthroughState();
  });
  const [isWalkthroughModalOpen, setIsWalkthroughModalOpen] = useState<boolean>(false);
  const [activeWalkthroughStepIndex, setActiveWalkthroughStepIndex] = useState<number>(0);

  const updateWalkthroughState = useCallback(
    (updater: (prev: WalkthroughProgressState) => WalkthroughProgressState) => {
      setWalkthroughState((prev) => {
        const next = updater(prev);
        try {
          localStorage.setItem('scholarcbt_walkthrough_state_v1', JSON.stringify(next));
        } catch {
          // Ignore storage error
        }
        return next;
      });
    },
    []
  );

  const openWalkthroughAtStep = useCallback((stepIndex: number) => {
    setActiveWalkthroughStepIndex(stepIndex);
    setIsWalkthroughModalOpen(true);
    setMobileMenuOpen(false);
  }, []);

  const navigateTo = useCallback((dest: MainNavSection | NavDestination, attemptId?: string | null) => {
    const normalizedDest: NavDestination =
      dest === 'subjects'
        ? 'subjects_lessons'
        : dest === 'results'
        ? 'result_review'
        : (dest as NavDestination);

    setNav(normalizedDest);
    setMobileMenuOpen(false);
    try {
      sessionStorage.setItem('scholarcbt_nav', normalizedDest);
      if (attemptId !== undefined) {
        if (attemptId) {
          sessionStorage.setItem('scholarcbt_attempt_id', attemptId);
          setFocusedAttemptId(attemptId);
        } else {
          sessionStorage.removeItem('scholarcbt_attempt_id');
          setFocusedAttemptId(null);
        }
      }
    } catch {
      if (attemptId !== undefined) setFocusedAttemptId(attemptId);
    }
  }, []);

  const appendPlatformNotification = useCallback((item: PlatformNotificationItem) => {
    setPlatformNotifications((prev) => {
      const next = [item, ...prev.filter((n) => n.id !== item.id)].slice(0, 25);
      try {
        localStorage.setItem('scholarcbt_platform_notifications_v1', JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  }, []);

  const handleUpdateEngagementPreferences = useCallback(
    async (patch: Partial<StudentProfile>) => {
      if (!profile) return;
      const optimistic: StudentProfile = { ...profile, ...patch };
      setProfile(optimistic);
      try {
        const token = localStorage.getItem('scholarcbt_session_token') || '';
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.profile) setProfile(data.profile);
        }
      } catch {
        // Retain optimistic update
      }
    },
    [profile]
  );

  const handleDailyCheckIn = useCallback(async () => {
    if (!profile) return;
    const todayKey = toLocalCalendarDateKey();
    const existingDates = profile.dailyCheckInDates || [];
    const nextDates = Array.from(new Set([...existingDates, todayKey])).sort();
    await handleUpdateEngagementPreferences({ dailyCheckInDates: nextDates });

    const updatedStreak = evaluateDailyCheckInStreak(nextDates, attempts);
    const quote = getDailyMotivationalQuote(todayKey, quoteOffset);
    const streakDays = Math.max(1, updatedStreak.currentStreak);

    const delivered = await dispatchSystemAndPlatformNotification({
      title: `ScholarCBT · Day ${streakDays} Study Streak!`,
      body: `"${quote.quote}" — ${quote.author}`,
      tag: `scholarcbt-checkin-${todayKey}`,
    });

    appendPlatformNotification({
      id: `notif-checkin-${todayKey}-${Date.now()}`,
      type: 'streak_milestone',
      title: `Day ${streakDays} Daily Check-In Complete!`,
      message: `"${quote.quote}"`,
      quoteAuthor: quote.author,
      createdAt: new Date().toISOString(),
      read: false,
      deliveredToDevice: delivered,
    });

    setActiveMilestoneCelebration({
      type: 'streak',
      title: updatedStreak.isMilestoneReached
        ? `${streakDays}-Day Study Streak Milestone!`
        : `Day ${streakDays} Daily Check-In Complete!`,
      subtitle: 'Daily Consistency & Scholarship',
      description:
        'Consistent daily revision builds lasting conceptual mastery across all Grade 7 subjects.',
      rarity: streakDays >= 14 ? 'Legendary' : streakDays >= 7 ? 'Epic' : 'Rare',
      streakDays,
      quote,
    });
  }, [
    profile,
    attempts,
    quoteOffset,
    handleUpdateEngagementPreferences,
    appendPlatformNotification,
  ]);

  const handleRequestDevicePermission = useCallback(async () => {
    const perm = await requestDeviceNotificationPermission();
    setDeviceNotificationPermission(perm);
    if (perm === 'granted') {
      const quote = getDailyMotivationalQuote(toLocalCalendarDateKey(), quoteOffset);
      const delivered = await dispatchSystemAndPlatformNotification({
        title: 'ScholarCBT System Notifications Enabled',
        body: `Daily check-in reminders & quotes active: "${quote.quote}" — ${quote.author}`,
        tag: 'scholarcbt-permission-granted',
      });
      appendPlatformNotification({
        id: `notif-perm-${Date.now()}`,
        type: 'daily_checkin',
        title: 'Device System Notifications Enabled',
        message: `"${quote.quote}"`,
        quoteAuthor: quote.author,
        createdAt: new Date().toISOString(),
        read: false,
        deliveredToDevice: delivered,
      });
    }
  }, [quoteOffset, appendPlatformNotification]);

  const handleTestDailyNotification = useCallback(async () => {
    const quote = getDailyMotivationalQuote(toLocalCalendarDateKey(), quoteOffset);
    const streak = evaluateDailyCheckInStreak(profile?.dailyCheckInDates || [], attempts);
    const delivered = await dispatchSystemAndPlatformNotification({
      title: `ScholarCBT Daily Check-In · ${streak.currentStreak}d Streak`,
      body: `"${quote.quote}" — ${quote.author}. Ready for a 10-minute Grade 7 practice session?`,
      tag: `scholarcbt-test-${Date.now()}`,
    });
    appendPlatformNotification({
      id: `notif-test-${Date.now()}`,
      type: 'motivational_quote',
      title: `Daily Check-In Reminder · ${streak.currentStreak}d Streak`,
      message: `"${quote.quote}"`,
      quoteAuthor: quote.author,
      createdAt: new Date().toISOString(),
      read: false,
      deliveredToDevice: delivered,
    });
  }, [quoteOffset, profile?.dailyCheckInDates, attempts, appendPlatformNotification]);

  // Dispatch automatic Motivational Quote + Practice Reminder on every user login
  const triggerLoginQuoteAndPracticeNotification = useCallback(
    async (studentProfile: StudentProfile, currentAttempts: ExamAttempt[]) => {
      const todayKey = toLocalCalendarDateKey();
      let nextOffset = 0;
      try {
        const prevCount = Number(
          localStorage.getItem('scholarcbt_login_quote_counter') || '0'
        );
        nextOffset = Number.isNaN(prevCount) ? 0 : prevCount + 1;
        localStorage.setItem('scholarcbt_login_quote_counter', String(nextOffset));
      } catch {
        nextOffset = quoteOffset;
      }
      setQuoteOffset(nextOffset);

      const quote = getDailyMotivationalQuote(todayKey, nextOffset);
      const streak = evaluateDailyCheckInStreak(
        studentProfile.dailyCheckInDates || [],
        currentAttempts,
        todayKey
      );
      const msg = buildLoginQuoteNotificationPayload({
        studentName: studentProfile.studentName,
        streakDays: streak.currentStreak,
        checkedInToday: streak.checkedInToday,
        quote,
      });

      setLoginQuoteToast({
        title: msg.platformTitle,
        quote: quote.quote,
        author: quote.author,
        role: quote.role,
      });

      const perm = await requestDeviceNotificationPermission();
      setDeviceNotificationPermission(perm);

      const delivered = await dispatchSystemAndPlatformNotification({
        title: msg.title,
        body: msg.body,
        tag: `scholarcbt-login-quote-${Date.now()}`,
      });

      appendPlatformNotification({
        id: `notif-login-${Date.now()}`,
        type: 'motivational_quote',
        title: msg.platformTitle,
        message: msg.platformMessage,
        quoteAuthor: `${quote.author} (${quote.role})`,
        createdAt: new Date().toISOString(),
        read: false,
        deliveredToDevice: delivered,
      });
    },
    [quoteOffset, appendPlatformNotification]
  );

  // Automatic daily check-in & motivational quote reminder + constant periodic practice reminder (never during active_exam)
  useEffect(() => {
    if (!isAuthenticated || !profile || nav === 'active_exam') return;
    if (profile.dailyRemindersEnabled === false) return;

    const todayKey = toLocalCalendarDateKey();
    const storageKey = `scholarcbt_last_daily_reminder_${profile.id}`;
    let lastNotifiedDate: string | null = null;
    try {
      lastNotifiedDate = localStorage.getItem(storageKey);
    } catch {
      // Ignore storage read error
    }

    const streakState = evaluateDailyCheckInStreak(profile.dailyCheckInDates || [], attempts);
    if (
      shouldTriggerDailyReminder({
        enabled: profile.dailyRemindersEnabled ?? true,
        lastRemindedDate: lastNotifiedDate,
        checkedInToday: streakState.checkedInToday,
        todayKey,
      })
    ) {
      try {
        localStorage.setItem(storageKey, todayKey);
      } catch {
        // Ignore storage write error
      }
      const quote = getDailyMotivationalQuote(todayKey, 0);
      void dispatchSystemAndPlatformNotification({
        title: 'ScholarCBT · Daily Check-In & Quote of the Day',
        body: `"${quote.quote}" — ${quote.author}. Check in today to keep your study streak alive!`,
        tag: `scholarcbt-daily-${todayKey}`,
      }).then((delivered) => {
        appendPlatformNotification({
          id: `notif-daily-${todayKey}`,
          type: 'daily_checkin',
          title: 'Daily Check-In & Quote of the Day',
          message: `"${quote.quote}"`,
          quoteAuthor: quote.author,
          createdAt: new Date().toISOString(),
          read: false,
          deliveredToDevice: delivered,
        });
      });
    }

    // Constant periodic daily practice & quote reminder while app is open (every 25 minutes when not in active_exam)
    const reminderInterval = window.setInterval(() => {
      const nextQuote = getDailyMotivationalQuote(
        toLocalCalendarDateKey(),
        Math.floor(Date.now() / 60000)
      );
      void dispatchSystemAndPlatformNotification({
        title: 'ScholarCBT · Daily Practice Reminder & Wisdom',
        body: `"${nextQuote.quote}" — ${nextQuote.author}. Take 10 minutes to practise a Grade 7 subject!`,
        tag: `scholarcbt-periodic-practice-${toLocalCalendarDateKey()}`,
      }).then((delivered) => {
        appendPlatformNotification({
          id: `notif-periodic-${Date.now()}`,
          type: 'motivational_quote',
          title: 'Constant Daily Practice Reminder & Quote',
          message: `"${nextQuote.quote}"`,
          quoteAuthor: nextQuote.author,
          createdAt: new Date().toISOString(),
          read: false,
          deliveredToDevice: delivered,
        });
      });
    }, 25 * 60 * 1000);

    return () => window.clearInterval(reminderInterval);
  }, [isAuthenticated, profile, nav, attempts, appendPlatformNotification]);

  const refreshPendingOfflineState = useCallback(async () => {
    try {
      const allLocal = await getAllOfflinePendingAttempts();
      const unsynced = allLocal.filter(
        (item) => item.attempt.status !== 'in_progress' && item.syncStatus !== 'synced'
      );
      setPendingSyncCount(unsynced.length);
    } catch {
      // Ignore IndexedDB error
    }
  }, []);

  const handleManualOrAutoSync = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setIsSyncingOffline(true);
    try {
      const result = await syncPendingOfflineAttemptsWithServer();
      if (result.syncedCount > 0) {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          const reconciled = await reconcileRecoverableAttempts(
            data.attempts || [],
            data.profile?.id
          );
          setAttempts(reconciled);
          if (data.questionBank) setQuestionBank(data.questionBank);
          if (data.generationJobs) setGenerationJobs(data.generationJobs);
        }
      }
      await refreshPendingOfflineState();
    } catch {
      // Ignore transient sync error
    } finally {
      setIsSyncingOffline(false);
    }
  }, [refreshPendingOfflineState]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void handleManualOrAutoSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    void refreshPendingOfflineState();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleManualOrAutoSync, refreshPendingOfflineState]);

  const fetchAppState = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const token = localStorage.getItem('scholarcbt_session_token') || '';
      const params = new URLSearchParams(window.location.search);
      const isAutoStart = params.get('autostart') === '1';

      if (token && !isAutoStart) {
        const sessionRes = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (!sessionData.authenticated) {
            localStorage.removeItem('scholarcbt_session_token');
            setIsAuthenticated(false);
          }
        }
      }

      const res = await fetch('/api/state', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Failed to load application state from server.');
      const data = await res.json();
      setProfile(data.profile);
      setDocuments(data.documents || []);
      setQuestionBank(data.questionBank || []);
      setGenerationJobs(data.generationJobs || []);

      // Reconcile server attempts with locally persisted recovery state for this student
      const serverAttempts: ExamAttempt[] = data.attempts || [];
      const reconciled = await reconcileRecoverableAttempts(
        serverAttempts,
        data.profile?.id
      );
      setAttempts(reconciled);
      await refreshPendingOfflineState();

      // Deliver automatic login quote & practice reminder once per browser session on automatic login
      if (data.profile && !sessionStorage.getItem('scholarcbt_session_login_quote_sent')) {
        try {
          sessionStorage.setItem('scholarcbt_session_login_quote_sent', '1');
        } catch {
          // Ignore storage error
        }
        void triggerLoginQuoteAndPracticeNotification(data.profile, reconciled);
      }
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : 'Unable to connect to ScholarCBT server.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [refreshPendingOfflineState, triggerLoginQuoteAndPracticeNotification]);

  useEffect(() => {
    fetchAppState();
  }, [fetchAppState]);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network error on logout
    }
    try {
      localStorage.removeItem('scholarcbt_session_token');
      localStorage.removeItem('scholarcbt_auth_user');
      sessionStorage.removeItem('scholarcbt_attempt_id');
      sessionStorage.removeItem('scholarcbt_session_login_quote_sent');
    } catch {
      // Ignore storage error
    }
    setAttempts([]);
    setFocusedAttemptId(null);
    setAchievementQueue([]);
    setActiveMilestoneCelebration(null);
    setLoginQuoteToast(null);
    setIsEngagementDrawerOpen(false);
    setMobileMenuOpen(false);
    setNav('dashboard');
    setIsAuthenticated(false);
  }, []);

  const handleUpdateAttemptInList = useCallback(
    (updated: ExamAttempt) => {
      setAttempts((prev) => {
        const exists = prev.some((a) => a.id === updated.id);
        if (!exists) return [updated, ...prev];
        return prev.map((a) => (a.id === updated.id ? updated : a));
      });
      void refreshPendingOfflineState();
    },
    [refreshPendingOfflineState]
  );

  const activeAttempt =
    attempts.find((a) => a.id === focusedAttemptId) ||
    attempts.find((a) => a.status === 'in_progress') ||
    attempts[0] ||
    null;

  // Continuous progress saving for active examination (both local IndexedDB/localStorage and server)
  const handleSaveActiveExamProgress = useCallback(
    async (
      currentQuestionIndex: number,
      responses: Record<string, StudentQuestionResponse>
    ): Promise<boolean> => {
      if (!activeAttempt || activeAttempt.status !== 'in_progress') return false;
      setAttemptSaveStatus('saving');
      const nowIso = new Date().toISOString();
      const nextRev = (activeAttempt.revision || 0) + 1;

      const updatedLocalAttempt: ExamAttempt = {
        ...activeAttempt,
        studentId: activeAttempt.studentId || profile?.id,
        currentQuestionIndex,
        responses,
        lastSavedAt: nowIso,
        revision: nextRev,
      };

      handleUpdateAttemptInList(updatedLocalAttempt);
      const localOk = await saveOfflineAttemptProgress(updatedLocalAttempt);

      // If offline or offline-generated attempt, report honest local save state
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        activeAttempt.id.startsWith('offline-att-')
      ) {
        setAttemptSaveStatus(localOk ? 'saved_local' : 'save_failed');
        if (localOk) setLastSavedAt(nowIso);
        return localOk;
      }

      try {
        const res = await fetch(`/api/attempts/${activeAttempt.id}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: profile?.id,
            currentQuestionIndex,
            responses,
            revision: nextRev,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.attempt) {
            handleUpdateAttemptInList(data.attempt);
            await saveOfflineAttemptProgress(data.attempt);
            if (data.attempt.status === 'submitted' || data.attempt.status === 'expired') {
              navigateTo('result_review', data.attempt.id);
            }
          }
          setAttemptSaveStatus('saved');
          setLastSavedAt(data.serverTime || nowIso);
          return true;
        }
        setAttemptSaveStatus(localOk ? 'saved_local' : 'save_failed');
        return localOk;
      } catch {
        setAttemptSaveStatus(localOk ? 'saved_local' : 'save_failed');
        return localOk;
      }
    },
    [activeAttempt, profile?.id, handleUpdateAttemptInList, navigateTo]
  );

  // Submit active examination attempt (online or offline fallback) and queue unlocked badges
  const handleSubmitActiveExam = useCallback(
    async (trigger: 'manual' | 'timer_expired') => {
      if (!activeAttempt) return;

      // Offline attempt submission path
      if (
        activeAttempt.id.startsWith('offline-att-') ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        try {
          const graded = await gradeOfflineExamAttempt(activeAttempt.id, trigger);
          handleUpdateAttemptInList(graded);
          navigateTo('result_review', graded.id);
          return;
        } catch {
          // Continue to server attempt if local grading key unavailable
        }
      }

      try {
        const res = await fetch(`/api/attempts/${activeAttempt.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trigger,
            responses: activeAttempt.responses,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.attempt) {
            handleUpdateAttemptInList(data.attempt);
            await saveOfflineAttemptProgress(data.attempt);
          }
          if (data.profile) {
            setProfile(data.profile);
          }
          if (Array.isArray(data.questionBank)) {
            setQuestionBank(data.questionBank);
          }
          if (Array.isArray(data.generationJobs)) {
            setGenerationJobs(data.generationJobs);
          }
          if (Array.isArray(data.newlyUnlockedBadges) && data.newlyUnlockedBadges.length > 0) {
            enqueueUnlockedAchievements(data.newlyUnlockedBadges);
          }
          navigateTo('result_review', data.attempt?.id || activeAttempt.id);
        }
      } catch {
        // Fallback: evaluate locally if server unreachable
        try {
          const graded = await gradeOfflineExamAttempt(activeAttempt.id, trigger);
          handleUpdateAttemptInList(graded);
          navigateTo('result_review', graded.id);
        } catch {
          navigateTo('dashboard');
        }
      }
    },
    [activeAttempt, handleUpdateAttemptInList, navigateTo, enqueueUnlockedAchievements]
  );

  // Resume unfinished attempt with server reconciliation & expiry check
  const handleResumeAttempt = useCallback(
    async (targetAttempt?: ExamAttempt) => {
      const candidate =
        targetAttempt || attempts.find((a) => a.status === 'in_progress') || activeAttempt;
      if (!candidate) return;

      // Prevent completed attempts from reopening as active exams
      if (candidate.status !== 'in_progress') {
        navigateTo('result_review', candidate.id);
        return;
      }

      // Check server for authoritative state and deadline expiry when online
      if (!candidate.id.startsWith('offline-att-') && isOnline) {
        try {
          const res = await fetch(
            `/api/attempts/${candidate.id}?studentId=${encodeURIComponent(profile?.id || '')}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.attempt) {
              const reconciledList = await reconcileRecoverableAttempts(
                [data.attempt],
                profile?.id
              );
              const best = reconciledList[0] || data.attempt;
              handleUpdateAttemptInList(best);
              if (best.status !== 'in_progress') {
                navigateTo('result_review', best.id);
                return;
              }
              setAttemptSaveStatus('saved');
              setLastSavedAt(best.lastSavedAt || data.serverTime);
              navigateTo('active_exam', best.id);
              return;
            }
          }
        } catch {
          // Proceed with local recoverable state
        }
      }

      // Check local deadline expiry
      if (Date.now() >= new Date(candidate.deadlineAt).getTime()) {
        setFocusedAttemptId(candidate.id);
        await handleSubmitActiveExam('timer_expired');
        return;
      }

      setAttemptSaveStatus(
        candidate.id.startsWith('offline-att-') || !isOnline ? 'saved_local' : 'saved'
      );
      setLastSavedAt(candidate.lastSavedAt || candidate.startedAt);
      navigateTo('active_exam', candidate.id);
    },
    [
      attempts,
      activeAttempt,
      isOnline,
      profile?.id,
      handleUpdateAttemptInList,
      navigateTo,
      handleSubmitActiveExam,
    ]
  );

  if (!isAuthenticated) {
    return (
      <AuthGateView
        onAuthenticated={(_token, updatedProfile) => {
          if (updatedProfile) {
            setProfile(updatedProfile);
          }
          try {
            sessionStorage.setItem('scholarcbt_session_login_quote_sent', '1');
          } catch {
            // Ignore storage error
          }
          setAttempts([]);
          setFocusedAttemptId(null);
          setAchievementQueue([]);
          setActiveMilestoneCelebration(null);
          setNav('dashboard');
          setIsAuthenticated(true);
          void fetchAppState();
          if (updatedProfile) {
            void triggerLoginQuoteAndPracticeNotification(updatedProfile, []);
          }
          // Trigger optional walkthrough on first login if not yet seen
          if (!walkthroughState.hasSeenIntro) {
            setActiveWalkthroughStepIndex(0);
            setIsWalkthroughModalOpen(true);
          }
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-sm w-full text-center space-y-4">
          <div className="flex justify-center">
            <ScholarCBTLogo size="md" theme="light" showWordmark={false} />
          </div>
          <div className="w-7 h-7 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-900">
            Loading ScholarCBT Examination Portal…
          </div>
          <p className="text-xs text-slate-500">
            Synchronizing curriculum subjects, session state, and examination records.
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-base font-bold text-red-900">Connection Error</div>
          <p className="text-xs text-slate-600">
            {loadError || 'Unable to load student profile.'}
          </p>
          <button
            type="button"
            onClick={fetchAppState}
            className="px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Current queued achievement to show (only when NOT in an active examination)
  const visibleAchievementToast =
    nav !== 'active_exam' && achievementQueue.length > 0 ? achievementQueue[0] : null;

  // Unlocked achievement count for secondary nav badge
  const unlockedBadgeCount = evaluateStudentBadges(attempts, {
    hasLoggedIn: true,
    firstLoginAt: profile.firstLoginAt,
    persistedUnlocks: profile.unlockedAchievements,
  }).filter((b) => b.unlocked).length;

  // Daily check-in streak and daily motivational quote
  const streakState = evaluateDailyCheckInStreak(profile.dailyCheckInDates || [], attempts);
  const dailyQuote = getDailyMotivationalQuote(toLocalCalendarDateKey(), quoteOffset);
  const unreadNotificationCount = platformNotifications.filter((n) => !n.read).length;

  return (
    <div
      className={`min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col lg:flex-row overflow-x-hidden ${
        profile.highContrastMode ? 'high-contrast-mode' : ''
      }`}
    >
      {/* Desktop Collapsible Sidebar (Hidden during active_exam for distraction-free focus) */}
      {nav !== 'active_exam' && (
        <aside
          aria-label="Primary Sidebar Navigation"
          className={`hidden lg:flex flex-col bg-[#0F172A] text-slate-200 border-r border-slate-800 shrink-0 transition-all duration-150 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Brand Header */}
          <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between gap-2">
            {!sidebarCollapsed ? (
              <button
                type="button"
                onClick={() => navigateTo('dashboard')}
                className="text-left cursor-pointer"
              >
                <ScholarCBTLogo size="sm" theme="dark" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateTo('dashboard')}
                className="mx-auto cursor-pointer"
                aria-label="ScholarCBT Home"
              >
                <ScholarCBTLogo size="sm" theme="dark" showWordmark={false} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Links: Separated into Primary Examination & Secondary Progress/Admin */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Examinations
                </div>
              )}
              {EXAM_PRIMARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  nav === item.id ||
                  (item.id === 'history' && nav === 'result_review');
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-walkthrough={item.walkthroughAttr}
                    onClick={() => {
                      setPreselectedDocForExam(null);
                      setPreselectedWeeksForExam(null);
                      navigateTo(item.id);
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-3 cursor-pointer ${
                      isActive
                        ? 'bg-[#1D4ED8] text-white'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="whitespace-nowrap truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800/80 space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Progress & Administration
                </div>
              )}
              {SECONDARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = nav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-walkthrough={item.walkthroughAttr}
                    onClick={() => {
                      setPreselectedDocForExam(null);
                      setPreselectedWeeksForExam(null);
                      navigateTo(item.id);
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-[#1D4ED8] text-white'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="whitespace-nowrap truncate">{item.label}</span>
                      )}
                    </span>
                    {!sidebarCollapsed && item.id === 'achievements' && (
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {unlockedBadgeCount}/{BADGE_DEFINITIONS.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => openWalkthroughAtStep(0)}
                title={sidebarCollapsed ? 'Platform Walkthrough' : undefined}
                className="w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Compass className="w-4 h-4 shrink-0 text-[#38BDF8]" />
                {!sidebarCollapsed && (
                  <span className="whitespace-nowrap truncate">Guided Tour / Help</span>
                )}
              </button>
            </div>
          </nav>

          {/* Student Profile & Sign Out Footer */}
          <div className="p-3.5 border-t border-slate-800 text-xs text-slate-400 space-y-2.5">
            {!sidebarCollapsed && (
              <div className="space-y-0.5">
                <div className="font-semibold text-white truncate">
                  {profile.studentName}
                </div>
                {profile.email && (
                  <div className="text-[11px] text-slate-400 truncate">{profile.email}</div>
                )}
                <div className="text-[11px] text-slate-300 font-medium truncate">
                  {profile.gradeLevel}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out of ScholarCBT"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Mobile Compact Header (< lg, hidden during active_exam) */}
      {nav !== 'active_exam' && (
        <header className="lg:hidden h-14 px-3.5 bg-[#0F172A] text-white border-b border-slate-800 flex items-center justify-between gap-2 sticky top-0 z-40">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="text-left shrink-0 cursor-pointer"
          >
            <ScholarCBTLogo size="sm" theme="dark" />
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsEngagementDrawerOpen(true)}
              aria-label="Open Daily Check-In, Streak and Notifications"
              className="relative inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{streakState.currentStreak}d</span>
              {(!streakState.checkedInToday || unreadNotificationCount > 0) && (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => {
                setPreselectedDocForExam(null);
                setPreselectedWeeksForExam(null);
                navigateTo('start_exam');
              }}
              className="px-2.5 py-1.5 bg-[#1D4ED8] hover:bg-blue-600 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
            >
              Start Exam
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={
                mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
              }
              className="p-2 text-slate-300 hover:text-white rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>
      )}

      {/* Mobile Slide-Down Drawer */}
      {mobileMenuOpen && nav !== 'active_exam' && (
        <nav
          aria-label="Mobile Navigation Drawer"
          className="lg:hidden bg-[#0F172A] text-white border-b border-slate-800 px-4 py-3 space-y-3 z-30"
        >
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Examinations
            </div>
            {EXAM_PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = nav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPreselectedDocForExam(null);
                    setPreselectedWeeksForExam(null);
                    navigateTo(item.id);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 ${
                    isActive
                      ? 'bg-[#1D4ED8] text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Progress & Administration
            </div>
            {SECONDARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = nav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPreselectedDocForExam(null);
                    setPreselectedWeeksForExam(null);
                    navigateTo(item.id);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-[#1D4ED8] text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'achievements' && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-200">
                      {unlockedBadgeCount}/{BADGE_DEFINITIONS.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => openWalkthroughAtStep(0)}
            className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-3"
          >
            <Compass className="w-4 h-4 shrink-0 text-[#38BDF8]" />
            <span>Guided Tour / Help</span>
          </button>
          <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="text-xs text-slate-300 truncate">
              {profile.studentName} ({profile.gradeLevel})
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Context Bar (Hidden during active_exam) */}
        {nav !== 'active_exam' && (
          <header className="hidden lg:flex h-16 px-4 xl:px-6 bg-white border-b border-slate-200 items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 shrink-0 min-w-0">
              <span className="text-xs xl:text-sm font-bold text-slate-900 truncate">
                ScholarCBT · Grade 7 Examination System
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border shrink-0 ${
                  isOnline
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-[#15803D]" />
                    <span>Online</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3 h-3 text-[#B45309]" />
                    <span>Offline Mode</span>
                  </>
                )}
              </span>
              {pendingSyncCount > 0 && (
                <button
                  type="button"
                  onClick={handleManualOrAutoSync}
                  disabled={isSyncingOffline || !isOnline}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold hover:bg-amber-100 cursor-pointer shrink-0"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isSyncingOffline ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {isSyncingOffline ? 'Syncing…' : `Sync (${pendingSyncCount})`}
                  </span>
                </button>
              )}
            </div>

            <nav
              aria-label="Quick Top Navigation"
              className="flex items-center gap-3 xl:gap-4 text-xs font-medium text-slate-600 shrink-0"
            >
              <button
                type="button"
                onClick={() => navigateTo('dashboard')}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => navigateTo('subjects_lessons')}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Subjects ({documents.length})
              </button>
              <button
                type="button"
                onClick={() => navigateTo('history')}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                History ({attempts.length})
              </button>
              <span className="h-3.5 w-px bg-slate-200" aria-hidden="true" />
              <button
                type="button"
                onClick={() => navigateTo('achievements')}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Award className="h-3.5 w-3.5 text-[#1E3A8A]" />
                <span>Achievements</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                  {unlockedBadgeCount}/{BADGE_DEFINITIONS.length}
                </span>
              </button>
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEngagementDrawerOpen(true)}
                title="Daily Check-In, Study Streak, Motivational Quotes & Device Notifications"
                className="relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>{streakState.currentStreak}d Streak</span>
                <Bell className="w-3.5 h-3.5 text-slate-600 ml-0.5" />
                {(!streakState.checkedInToday || unreadNotificationCount > 0) && (
                  <span
                    aria-label="Unread daily check-in or notification"
                    className="w-2 h-2 rounded-full bg-amber-500"
                  />
                )}
              </button>
              <PWAInstallButton />
              <button
                type="button"
                onClick={() => openWalkthroughAtStep(0)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Help Tour
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreselectedDocForExam(null);
                  setPreselectedWeeksForExam(null);
                  navigateTo('start_exam');
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E3A8A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start Practice Session
              </button>
            </div>
          </header>
        )}

        {/* Non-Intrusive Achievement Unlocked Toast (Never shown during active_exam) */}
        {visibleAchievementToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-40 flex max-w-sm items-center gap-3.5 rounded-xl border border-slate-300 bg-white p-4 shadow-xl"
          >
            <BadgeArtwork
              badgeId={visibleAchievementToast.badge.id}
              rarity={visibleAchievementToast.badge.rarity}
              unlocked={true}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1E3A8A]">
                <Sparkles className="h-3 w-3" />
                <span>Achievement Unlocked · {visibleAchievementToast.badge.rarity}</span>
              </div>
              <div className="truncate text-sm font-bold text-slate-900">
                {visibleAchievementToast.badge.title}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAchievementQueue((q) => q.slice(1));
                  navigateTo('achievements');
                }}
                className="mt-0.5 text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
              >
                View in Achievements →
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAchievementQueue((q) => q.slice(1))}
              aria-label="Dismiss achievement notification"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Automatic Login Motivational Quote & Practice Reminder Toast (Never shown during active_exam) */}
        {nav !== 'active_exam' && loginQuoteToast && !visibleAchievementToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-40 flex max-w-md items-start gap-3.5 rounded-xl border border-amber-300 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] p-4 text-white shadow-2xl"
          >
            <HeraldBellIcon size={36} className="shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                {loginQuoteToast.title}
              </div>
              <p className="text-xs italic text-slate-100 leading-relaxed">
                &ldquo;{loginQuoteToast.quote}&rdquo;
              </p>
              <div className="text-[11px] text-amber-200/90 font-semibold">
                — {loginQuoteToast.author}, {loginQuoteToast.role}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLoginQuoteToast(null)}
              aria-label="Dismiss login quote notification"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {nav === 'dashboard' && (
            <DashboardView
              profile={profile}
              documents={documents}
              questionBank={questionBank as any}
              attempts={attempts}
              activeAttempt={
                attempts.find((a) => a.status === 'in_progress') || null
              }
              onNavigate={navigateTo}
              onResumeAttempt={(att) => void handleResumeAttempt(att)}
              onInspectAttempt={(att) => navigateTo('result_review', att.id)}
              onStartSubjectPractice={(docId, selectedWeeks) => {
                setPreselectedDocForExam(docId);
                setPreselectedWeeksForExam(selectedWeeks || null);
                navigateTo('start_exam');
              }}
              onOpenWalkthrough={() => openWalkthroughAtStep(0)}
              onOpenDailyEngagement={() => setIsEngagementDrawerOpen(true)}
            />
          )}

          {nav === 'achievements' && (
            <AchievementsView
              profile={profile}
              attempts={attempts}
              onNavigate={navigateTo}
              onOpenDailyCheckIn={() => setIsEngagementDrawerOpen(true)}
              onCelebrateBadge={(badgeItem: StudentBadgeProgress) => {
                setActiveMilestoneCelebration({
                  type: 'badge',
                  title: badgeItem.badge.title,
                  subtitle: `${badgeItem.badge.category} · ${badgeItem.badge.rarity} Achievement`,
                  description: badgeItem.badge.description,
                  rarity: badgeItem.badge.rarity,
                  badgeProgress: badgeItem,
                  quote: dailyQuote,
                });
              }}
            />
          )}

          {nav === 'documents' && (
            <DocumentsView
              documents={documents}
              onDocumentsUpdated={(docs) => setDocuments(docs)}
              onQuestionBankUpdated={(bank) => setQuestionBank(bank)}
              onStartExamWithDoc={(docId) => {
                setPreselectedDocForExam(docId);
                setPreselectedWeeksForExam(null);
                navigateTo('start_exam');
              }}
              onOpenWeekMapping={(docId) => {
                setSelectedDocForMapping(docId);
                navigateTo('subjects_lessons');
              }}
            />
          )}

          {nav === 'question_bank' && (
            <QuestionBankAdminView
              documents={documents}
              questionBank={questionBank}
              attempts={attempts}
              generationJobs={generationJobs}
              onQuestionBankUpdated={(nextBank, nextJobs) => {
                setQuestionBank(nextBank);
                if (nextJobs) setGenerationJobs(nextJobs);
              }}
              onStartExamWithDoc={(docId) => {
                setPreselectedDocForExam(docId);
                setPreselectedWeeksForExam(null);
                navigateTo('start_exam');
              }}
              onNavigateToUpload={() => navigateTo('documents')}
            />
          )}

          {nav === 'subjects_lessons' && (
            <SubjectsLessonsView
              documents={documents}
              attempts={attempts}
              profile={profile}
              initialDocumentId={selectedDocForMapping}
              onDocumentsUpdated={(docs) => setDocuments(docs)}
              onStartExamWithDocument={(docId, selectedWeeks) => {
                setPreselectedDocForExam(docId);
                setPreselectedWeeksForExam(selectedWeeks || null);
                navigateTo('start_exam');
              }}
              onToggleMasteredQuestion={async (questionId) => {
                const currentList = profile.masteredQuestionIds || [];
                const nextList = currentList.includes(questionId)
                  ? currentList.filter((id) => id !== questionId)
                  : [...currentList, questionId];
                const optimisticProfile: StudentProfile = {
                  ...profile,
                  masteredQuestionIds: nextList,
                };
                setProfile(optimisticProfile);
                try {
                  const res = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ masteredQuestionIds: nextList }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.profile) setProfile(data.profile);
                  }
                } catch {
                  // Optimistic state retained
                }
              }}
            />
          )}

          {nav === 'start_exam' && (
            <ExamConfigWizard
              documents={documents}
              profile={profile}
              preselectedDocId={preselectedDocForExam}
              preselectedWeeks={preselectedWeeksForExam}
              onExamStarted={(newAttempt, offlineKey) => {
                if (offlineKey && offlineKey.length > 0) {
                  setOfflineAnswerKeys((prev) => ({
                    ...prev,
                    [newAttempt.id]: offlineKey,
                  }));
                }
                const stamped = {
                  ...newAttempt,
                  studentId: newAttempt.studentId || profile.id,
                  lastSavedAt: newAttempt.lastSavedAt || new Date().toISOString(),
                  revision: newAttempt.revision || 1,
                };
                handleUpdateAttemptInList(stamped);
                void saveOfflineAttemptProgress(stamped);
                setAttemptSaveStatus(
                  stamped.id.startsWith('offline-att-') || !isOnline
                    ? 'saved_local'
                    : 'saved'
                );
                setLastSavedAt(stamped.lastSavedAt);
                navigateTo('active_exam', stamped.id);
              }}
              onCancel={() => navigateTo('dashboard')}
            />
          )}

          {nav === 'active_exam' && activeAttempt && (
            <ActiveExamView
              attempt={activeAttempt}
              profile={profile}
              saveStatus={attemptSaveStatus}
              lastSavedAt={lastSavedAt || activeAttempt.lastSavedAt}
              onSaveProgress={handleSaveActiveExamProgress}
              onSubmitAttempt={handleSubmitActiveExam}
              onPauseAndReturnHome={() => navigateTo('dashboard')}
            />
          )}

          {nav === 'result_review' && activeAttempt && (
            <ExamResultReviewView
              attempt={activeAttempt}
              documents={documents}
              profile={profile}
              onRetryStarted={(retryAttempt) => {
                handleUpdateAttemptInList(retryAttempt);
                void saveOfflineAttemptProgress(retryAttempt);
                navigateTo('active_exam', retryAttempt.id);
              }}
              onStartNewExam={() => {
                setPreselectedDocForExam(null);
                setPreselectedWeeksForExam(null);
                navigateTo('start_exam');
              }}
              onStartSubjectPractice={(docId, selectedWeeks) => {
                setPreselectedDocForExam(docId);
                setPreselectedWeeksForExam(selectedWeeks || null);
                navigateTo('start_exam');
              }}
              onReturnDashboard={() => navigateTo('dashboard')}
            />
          )}

          {(nav === 'history' || nav === 'analytics') && (
            <HistoryAnalyticsView
              mode={nav}
              attempts={attempts}
              documents={documents}
              profile={profile}
              onInspectAttempt={(attemptId) => navigateTo('result_review', attemptId)}
              onResumeAttempt={(attemptId) => {
                const target = attempts.find((a) => a.id === attemptId);
                void handleResumeAttempt(target);
              }}
              onRetryAttempt={(retryAttempt) => {
                handleUpdateAttemptInList(retryAttempt);
                void saveOfflineAttemptProgress(retryAttempt);
                navigateTo('active_exam', retryAttempt.id);
              }}
              onStartNewExam={() => {
                setPreselectedDocForExam(null);
                setPreselectedWeeksForExam(null);
                navigateTo('start_exam');
              }}
              onStartSubjectPractice={(docId, selectedWeeks) => {
                setPreselectedDocForExam(docId);
                setPreselectedWeeksForExam(selectedWeeks || null);
                navigateTo('start_exam');
              }}
            />
          )}

          {nav === 'settings' && (
            <SettingsView
              profile={profile}
              documentCount={documents.length}
              attemptCount={attempts.length}
              onProfileUpdated={(updatedProfile) => setProfile(updatedProfile)}
              onDatabaseReset={fetchAppState}
            />
          )}
        </main>
      </div>

      {/* Interactive 7-Step Student Walkthrough Modal (Never opens during active_exam) */}
      <StudentWalkthroughModal
        isOpen={isWalkthroughModalOpen && nav !== 'active_exam'}
        activeStepIndex={activeWalkthroughStepIndex}
        walkthroughState={walkthroughState}
        onSelectStep={(idx) => setActiveWalkthroughStepIndex(idx)}
        onCompleteStep={(stepId) =>
          updateWalkthroughState((prev) => markWalkthroughStepCompleted(prev, stepId))
        }
        onCompleteAll={() =>
          updateWalkthroughState((prev) => markAllWalkthroughStepsCompleted(prev))
        }
        onClose={() => setIsWalkthroughModalOpen(false)}
        onNavigate={(dest) => {
          setPreselectedDocForExam(null);
          navigateTo(dest);
        }}
        onNavigateToFeature={(dest) => {
          setPreselectedDocForExam(null);
          navigateTo(dest);
        }}
      />

      {/* Daily Check-In, Streak, Motivational Quotes & Device Notification Drawer */}
      <DailyEngagementDrawer
        isOpen={isEngagementDrawerOpen && nav !== 'active_exam'}
        onClose={() => setIsEngagementDrawerOpen(false)}
        streakSummary={streakState}
        currentQuote={dailyQuote}
        onNextQuote={() => setQuoteOffset((c) => c + 1)}
        notifications={platformNotifications}
        onMarkAllRead={() => {
          setPlatformNotifications((prev) => {
            const next = prev.map((n) => ({ ...n, read: true }));
            try {
              localStorage.setItem('scholarcbt_platform_notifications_v1', JSON.stringify(next));
            } catch {
              // Ignore storage error
            }
            return next;
          });
        }}
        onPerformDailyCheckIn={() => void handleDailyCheckIn()}
        onCelebrateMilestonePreview={() => {
          setIsEngagementDrawerOpen(false);
          const streakDays = Math.max(1, streakState.currentStreak);
          setActiveMilestoneCelebration({
            type: 'streak',
            title: `${streakDays}-Day Study Streak Milestone!`,
            subtitle: 'Daily Consistency & Scholarship',
            description:
              'Daily discipline and curiosity are the building blocks of academic excellence.',
            rarity: streakDays >= 14 ? 'Legendary' : streakDays >= 7 ? 'Epic' : 'Rare',
            streakDays,
            quote: dailyQuote,
          });
        }}
        devicePermission={deviceNotificationPermission}
        onRequestDevicePermission={() => void handleRequestDevicePermission()}
        onSendTestDeviceNotification={() => void handleTestDailyNotification()}
        remindersEnabled={profile.dailyRemindersEnabled ?? true}
        reminderTime={profile.dailyReminderTime || '17:00'}
        soundEnabled={profile.soundEffectsEnabled ?? true}
        onUpdateReminderSettings={(patch) => void handleUpdateEngagementPreferences(patch)}
      />

      {/* Artistic Milestone Celebration Modal with Web Audio API Fanfare (Never opens during active_exam) */}
      <MilestoneCelebrationModal
        milestone={nav !== 'active_exam' ? activeMilestoneCelebration : null}
        soundEnabled={profile.soundEffectsEnabled ?? true}
        onToggleSound={() =>
          void handleUpdateEngagementPreferences({
            soundEffectsEnabled: !(profile.soundEffectsEnabled ?? true),
          })
        }
        onClose={() => setActiveMilestoneCelebration(null)}
        onViewAllAchievements={() => {
          setActiveMilestoneCelebration(null);
          navigateTo('achievements');
        }}
      />
    </div>
  );
}
