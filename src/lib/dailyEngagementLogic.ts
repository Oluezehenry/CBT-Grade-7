import { BadgeRarity, ExamAttempt } from '../types/cbt';

export interface MotivationalQuote {
  id: string;
  quote: string;
  author: string;
  role: string;
  theme: 'Discipline' | 'Curiosity' | 'Perseverance' | 'Excellence' | 'Mastery';
}

export interface DailyStreakSummary {
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
  totalActiveDays: number;
  activeDateKeys: string[];
  nextMilestone: number;
  progressToNextMilestonePct: number;
  isMilestoneReached: boolean;
}

export interface PlatformNotificationItem {
  id: string;
  type: 'daily_checkin' | 'motivational_quote' | 'streak_milestone' | 'achievement_unlocked';
  title: string;
  message: string;
  quoteAuthor?: string;
  createdAt: string;
  read: boolean;
  deliveredToDevice: boolean;
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 'q-mandela',
    quote: 'Education is the most powerful weapon which you can use to change the world.',
    author: 'Nelson Mandela',
    role: 'Statesman & Nobel Peace Laureate',
    theme: 'Excellence',
  },
  {
    id: 'q-curie',
    quote: 'Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.',
    author: 'Marie Curie',
    role: 'Physicist, Chemist & Two-Time Nobel Laureate',
    theme: 'Curiosity',
  },
  {
    id: 'q-maathai',
    quote: 'It is the little things citizens do—consistent, daily effort—that will make the difference.',
    author: 'Prof. Wangari Maathai',
    role: 'Environmental Scientist & Nobel Laureate',
    theme: 'Discipline',
  },
  {
    id: 'q-katherine-johnson',
    quote: 'Like what you do, and then you will do your best. Ask questions—there is no such thing as a dumb question.',
    author: 'Katherine Johnson',
    role: 'NASA Orbital Mathematician',
    theme: 'Mastery',
  },
  {
    id: 'q-einstein',
    quote: 'It is not that I am so smart, it is just that I stay with problems longer.',
    author: 'Albert Einstein',
    role: 'Theoretical Physicist',
    theme: 'Perseverance',
  },
  {
    id: 'q-achebe',
    quote: 'One of the truest tests of integrity and scholarship is the refusal to take shortcuts when building understanding.',
    author: 'Chinua Achebe',
    role: 'Novelist, Poet & Academic',
    theme: 'Excellence',
  },
  {
    id: 'q-aristotle',
    quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    author: 'Aristotle',
    role: 'Classical Philosopher & Scientist',
    theme: 'Discipline',
  },
  {
    id: 'q-franklin',
    quote: 'An investment in knowledge always pays the best interest.',
    author: 'Benjamin Franklin',
    role: 'Polymath, Scientist & Inventor',
    theme: 'Mastery',
  },
  {
    id: 'q-soyinka',
    quote: 'The greatest threat to freedom and progress is the absence of criticism and disciplined inquiry.',
    author: 'Prof. Wole Soyinka',
    role: 'Playwright & Nobel Laureate in Literature',
    theme: 'Curiosity',
  },
  {
    id: 'q-malala',
    quote: 'One child, one teacher, one book, and one pen can change the world.',
    author: 'Malala Yousafzai',
    role: 'Education Advocate & Nobel Laureate',
    theme: 'Excellence',
  },
  {
    id: 'q-emeagwali',
    quote: 'Hard work and deep preparation turn complex mathematical challenges into stepping stones for discovery.',
    author: 'Dr. Philip Emeagwali',
    role: 'Computer Scientist & Gordon Bell Prize Winner',
    theme: 'Perseverance',
  },
  {
    id: 'q-lovelace',
    quote: 'That brain of mine is something more than merely mortal; as time will show through patient study.',
    author: 'Ada Lovelace',
    role: 'Mathematician & Pioneer of Computing',
    theme: 'Curiosity',
  },
  {
    id: 'q-newton',
    quote: 'If I have seen further it is by standing on the shoulders of Giants and by thinking continually upon the subject.',
    author: 'Sir Isaac Newton',
    role: 'Mathematician, Physicist & Astronomer',
    theme: 'Mastery',
  },
  {
    id: 'q-annan',
    quote: 'Knowledge is power. Information is liberating. Education is the premise of progress, in every society, in every family.',
    author: 'Kofi Annan',
    role: 'Diplomat & Nobel Peace Laureate',
    theme: 'Excellence',
  },
  {
    id: 'q-carver',
    quote: 'Education is the key to unlock the golden door of freedom and scientific discovery.',
    author: 'George Washington Carver',
    role: 'Agricultural Scientist & Inventor',
    theme: 'Curiosity',
  },
  {
    id: 'q-angelou',
    quote: 'Nothing will work unless you do. Every day of practice builds the confidence you need on examination day.',
    author: 'Maya Angelou',
    role: 'Author, Poet & Educator',
    theme: 'Discipline',
  },
];

export function toLocalCalendarDateKey(isoOrDate?: string | Date): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function getDailyMotivationalQuote(
  dateKey: string = toLocalCalendarDateKey(),
  offset: number = 0
): MotivationalQuote {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const idx = (hash + Math.max(0, offset)) % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[idx];
}

function diffCalendarDays(dayA: string, dayB: string): number {
  const [y1, m1, d1] = dayA.split('-').map(Number);
  const [y2, m2, d2] = dayB.split('-').map(Number);
  const utc1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
  const utc2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export const STREAK_MILESTONES = [1, 3, 7, 14, 30, 60, 100];

export function evaluateDailyCheckInStreak(
  checkInDates: string[] = [],
  attempts: ExamAttempt[] = [],
  todayKey: string = toLocalCalendarDateKey()
): DailyStreakSummary {
  const dateSet = new Set<string>();

  for (const raw of checkInDates) {
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      dateSet.add(raw);
    } else if (raw) {
      dateSet.add(toLocalCalendarDateKey(raw));
    }
  }

  for (const att of attempts) {
    if ((att.status === 'submitted' || att.status === 'expired') && att.result) {
      const ts = att.result.submittedAt || att.submittedAt || att.startedAt;
      if (ts) {
        dateSet.add(toLocalCalendarDateKey(ts));
      }
    }
  }

  const activeDateKeys = Array.from(dateSet).sort();
  if (activeDateKeys.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      checkedInToday: false,
      totalActiveDays: 0,
      activeDateKeys: [],
      nextMilestone: 3,
      progressToNextMilestonePct: 0,
      isMilestoneReached: false,
    };
  }

  let longestStreak = 1;
  let running = 1;
  for (let i = 1; i < activeDateKeys.length; i++) {
    const gap = diffCalendarDays(activeDateKeys[i - 1], activeDateKeys[i]);
    if (gap === 1) {
      running += 1;
      if (running > longestStreak) longestStreak = running;
    } else if (gap > 1) {
      running = 1;
    }
  }

  const lastDate = activeDateKeys[activeDateKeys.length - 1];
  const gapFromLastToToday = diffCalendarDays(lastDate, todayKey);
  const checkedInToday = lastDate === todayKey;

  let currentStreak = 0;
  if (gapFromLastToToday === 0 || gapFromLastToToday === 1) {
    currentStreak = 1;
    for (let i = activeDateKeys.length - 1; i > 0; i--) {
      const gap = diffCalendarDays(activeDateKeys[i - 1], activeDateKeys[i]);
      if (gap === 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  const nextMilestone =
    STREAK_MILESTONES.find((m) => m > currentStreak) ||
    Math.ceil((currentStreak + 1) / 30) * 30;
  const progressToNextMilestonePct = Math.min(
    100,
    Math.round((currentStreak / nextMilestone) * 100)
  );
  const isMilestoneReached = STREAK_MILESTONES.includes(currentStreak) && checkedInToday;

  return {
    currentStreak,
    longestStreak,
    checkedInToday,
    totalActiveDays: activeDateKeys.length,
    activeDateKeys,
    nextMilestone,
    progressToNextMilestonePct,
    isMilestoneReached,
  };
}

export function shouldTriggerDailyReminder(params: {
  enabled: boolean;
  lastRemindedDate: string | null | undefined;
  checkedInToday: boolean;
  todayKey?: string;
}): boolean {
  const { enabled, lastRemindedDate, checkedInToday, todayKey = toLocalCalendarDateKey() } =
    params;
  if (!enabled) return false;
  if (checkedInToday) return false;
  if (lastRemindedDate === todayKey) return false;
  return true;
}

export function buildLoginQuoteNotificationPayload(params: {
  studentName?: string;
  streakDays: number;
  checkedInToday: boolean;
  quote: MotivationalQuote;
}): {
  title: string;
  body: string;
  platformTitle: string;
  platformMessage: string;
} {
  const firstName = (params.studentName || 'Scholar').split(' ')[0];
  const streakLabel =
    params.streakDays > 0
      ? `${params.streakDays}-Day Streak`
      : 'Start Your Study Streak';
  const practicePrompt = params.checkedInToday
    ? 'Keep your momentum going with a 10-minute Grade 7 practice paper!'
    : 'Remember to complete your daily practice session today!';

  return {
    title: `Welcome back, ${firstName} · ${streakLabel}`,
    body: `"${params.quote.quote}" — ${params.quote.author}. ${practicePrompt}`,
    platformTitle: `Daily Login Wisdom & Practice Reminder · ${streakLabel}`,
    platformMessage: `"${params.quote.quote}" — ${practicePrompt}`,
  };
}

export async function requestDeviceNotificationPermission(): Promise<
  'granted' | 'denied' | 'default' | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

export async function dispatchSystemAndPlatformNotification(payload: {
  title: string;
  body: string;
  tag?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // Attempt automatic permission activation if still in 'default' state
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      // Ignore if browser requires a direct click gesture
    }
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const tag = payload.tag || `scholarcbt-${Date.now()}`;
  const options: NotificationOptions = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(payload.title, options);
        return true;
      }
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_SYSTEM_NOTIFICATION',
          title: payload.title,
          options,
        });
        return true;
      }
    }
  } catch {
    // Fallback to standard Notification constructor
  }

  try {
    new Notification(payload.title, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Plays a rich, artistic musical fanfare using the Web Audio API when a student unlocks a milestone or badge.
 * Uses pure synthesis (zero external audio files needed, 100% offline-ready).
 */
export function playMilestoneCelebrationFanfare(
  rarity: BadgeRarity | 'streak' = 'Rare'
): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Musical notes in Hz (C5 major / Lydian heroic fanfare)
    const chordProgression: Array<{ freq: number; delay: number; duration: number; type: OscillatorType; gain: number }> =
      rarity === 'Legendary' || rarity === 'Epic'
        ? [
            { freq: 523.25, delay: 0.0, duration: 0.28, type: 'triangle', gain: 0.16 }, // C5
            { freq: 659.25, delay: 0.11, duration: 0.28, type: 'triangle', gain: 0.16 }, // E5
            { freq: 783.99, delay: 0.22, duration: 0.3, type: 'triangle', gain: 0.18 }, // G5
            { freq: 987.77, delay: 0.34, duration: 0.35, type: 'sine', gain: 0.17 }, // B5
            { freq: 1046.5, delay: 0.46, duration: 0.95, type: 'triangle', gain: 0.22 }, // C6
            { freq: 523.25, delay: 0.46, duration: 0.95, type: 'sine', gain: 0.14 }, // C5 bass harmonic
            { freq: 659.25, delay: 0.46, duration: 0.95, type: 'sine', gain: 0.14 }, // E5 harmonic
            { freq: 1318.51, delay: 0.62, duration: 0.85, type: 'sine', gain: 0.12 }, // E6 shimmer
          ]
        : [
            { freq: 523.25, delay: 0.0, duration: 0.22, type: 'triangle', gain: 0.15 }, // C5
            { freq: 659.25, delay: 0.1, duration: 0.22, type: 'triangle', gain: 0.15 }, // E5
            { freq: 783.99, delay: 0.2, duration: 0.26, type: 'triangle', gain: 0.16 }, // G5
            { freq: 1046.5, delay: 0.32, duration: 0.75, type: 'sine', gain: 0.2 }, // C6
            { freq: 523.25, delay: 0.32, duration: 0.75, type: 'sine', gain: 0.12 }, // C5 root
          ];

    const now = ctx.currentTime;
    for (const note of chordProgression) {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, now + note.delay);

      gainNode.gain.setValueAtTime(0.0001, now + note.delay);
      gainNode.gain.linearRampToValueAtTime(note.gain, now + note.delay + 0.025);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        now + note.delay + note.duration
      );

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + note.delay);
      osc.stop(now + note.delay + note.duration + 0.04);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1800);
  } catch {
    // Audio playback is best-effort
  }
}
