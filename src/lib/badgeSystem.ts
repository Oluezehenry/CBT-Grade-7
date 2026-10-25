import {
  BadgeCategory,
  BadgeDefinition,
  BadgeRarity,
  ExamAttempt,
  StudentBadgeProgress,
  UnlockedAchievementRecord,
} from '../types/cbt';

export const ACHIEVEMENT_CATEGORIES: BadgeCategory[] = [
  'Getting Started',
  'Consistency',
  'Accuracy',
  'Mastery',
  'Persistence',
  'Exploration',
  'Dedication',
];

export const ACHIEVEMENT_RARITIES: BadgeRarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
];

/**
 * Complete Grade 7 CBT Achievement & Badge Collection across 7 categories and 5 rarity tiers.
 * Every achievement is linked to real, verifiable student actions and exam outcomes.
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // 1. Getting Started
  {
    id: 'first_login',
    title: 'First Login',
    description:
      'Signed in to the ScholarCBT Grade 7 examination portal and initialized your academic profile.',
    unlockRequirementText: 'Complete your first verified student sign-in.',
    awardingTrigger: 'Student authentication & profile initialization',
    category: 'Getting Started',
    rarity: 'Common',
    tier: 'bronze',
    iconName: 'CompassCrest',
    targetValue: 1,
    unitLabel: 'login completed',
  },
  {
    id: 'first_practice',
    title: 'First Practice',
    description:
      'Completed your first practice assessment session to build familiarity with CBT controls.',
    unlockRequirementText: 'Complete 1 practice-mode or standard CBT session.',
    awardingTrigger: 'Practice or standard CBT attempt submission',
    category: 'Getting Started',
    rarity: 'Common',
    tier: 'bronze',
    iconName: 'QuillShield',
    targetValue: 1,
    unitLabel: 'practice completed',
  },
  {
    id: 'first_cbt',
    title: 'First Examination',
    description:
      'Successfully submitted your first full Grade 7 CBT examination session.',
    unlockRequirementText: 'Submit 1 completed CBT examination.',
    awardingTrigger: 'Full CBT examination submission',
    category: 'Getting Started',
    rarity: 'Common',
    tier: 'bronze',
    iconName: 'FoundationSeal',
    targetValue: 1,
    unitLabel: 'exam completed',
  },

  // 2. Consistency
  {
    id: 'day_streak_3',
    title: 'Three-Day Streak',
    description:
      'Maintained a 3-day consecutive calendar study streak of completed CBT practice or examinations.',
    unlockRequirementText: 'Complete examinations on 3 consecutive calendar days.',
    awardingTrigger: 'Consecutive calendar-day streak verification on exam submission',
    category: 'Consistency',
    rarity: 'Common',
    tier: 'bronze',
    iconName: 'ChronoTorchBronze',
    targetValue: 3,
    unitLabel: 'consecutive days',
  },
  {
    id: 'day_streak_7',
    title: 'Seven-Day Streak',
    description:
      'Sustained a full 7-day consecutive calendar streak of Grade 7 examination practice.',
    unlockRequirementText: 'Complete examinations on 7 consecutive calendar days.',
    awardingTrigger: 'Consecutive calendar-day streak verification on exam submission',
    category: 'Consistency',
    rarity: 'Rare',
    tier: 'silver',
    iconName: 'ChronoTorchSilver',
    targetValue: 7,
    unitLabel: 'consecutive days',
  },
  {
    id: 'day_streak_14',
    title: 'Fourteen-Day Streak',
    description:
      'Demonstrated exceptional academic discipline across 14 consecutive calendar days of practice.',
    unlockRequirementText: 'Complete examinations on 14 consecutive calendar days.',
    awardingTrigger: 'Consecutive calendar-day streak verification on exam submission',
    category: 'Consistency',
    rarity: 'Epic',
    tier: 'gold',
    iconName: 'ChronoTorchGold',
    targetValue: 14,
    unitLabel: 'consecutive days',
  },

  // 3. Accuracy
  {
    id: 'streak_5',
    title: 'Precision Focus',
    description:
      'Answered 5 consecutive questions accurately in a single examination sitting.',
    unlockRequirementText: 'Achieve a streak of 5 consecutive correct answers in one exam.',
    awardingTrigger: 'Question-by-question response accuracy verification',
    category: 'Accuracy',
    rarity: 'Common',
    tier: 'bronze',
    iconName: 'AstrolabeRing',
    targetValue: 5,
    unitLabel: 'consecutive correct',
  },
  {
    id: 'streak_10',
    title: 'Error-Free Momentum',
    description:
      'Answered 10 consecutive questions accurately without a single error in an examination.',
    unlockRequirementText: 'Achieve a streak of 10 consecutive correct answers in one exam.',
    awardingTrigger: 'Question-by-question response accuracy verification',
    category: 'Accuracy',
    rarity: 'Rare',
    tier: 'gold',
    iconName: 'PrecisionPrism',
    targetValue: 10,
    unitLabel: 'consecutive correct',
  },
  {
    id: 'high_achiever',
    title: 'Accuracy Expert',
    description:
      'Achieved a score of 85% or higher on a Grade 7 examination paper.',
    unlockRequirementText: 'Score at least 85% in any submitted examination.',
    awardingTrigger: 'Examination grading & percentage score verification',
    category: 'Accuracy',
    rarity: 'Uncommon',
    tier: 'silver',
    iconName: 'MeritStar',
    targetValue: 85,
    unitLabel: '% best score',
  },
  {
    id: 'error_free_attempt',
    title: 'Error-Free Attempt',
    description:
      'Completed a full CBT session with zero incorrect responses and every question answered.',
    unlockRequirementText: 'Submit a completed examination with 0 incorrect answers.',
    awardingTrigger: 'Zero-error response audit on examination submission',
    category: 'Accuracy',
    rarity: 'Rare',
    tier: 'gold',
    iconName: 'AegisFlawless',
    targetValue: 1,
    unitLabel: 'error-free exam',
  },
  {
    id: 'perfect_grade',
    title: 'Perfect Score',
    description:
      'Achieved an unblemished 100% score on a completed Grade 7 CBT examination.',
    unlockRequirementText: 'Score 100% on any completed CBT examination.',
    awardingTrigger: '100% score verification on submitted examination',
    category: 'Accuracy',
    rarity: 'Legendary',
    tier: 'diamond',
    iconName: 'SovereignLaurel',
    targetValue: 100,
    unitLabel: '% best score',
  },

  // 4. Mastery
  {
    id: 'subject_specialist',
    title: 'Subject Specialist',
    description:
      'Scored 80% or above across 3 examinations in the same core school subject.',
    unlockRequirementText: 'Complete 3 exams in a single subject with >= 80% accuracy.',
    awardingTrigger: 'Subject-level longitudinal mastery tracking',
    category: 'Mastery',
    rarity: 'Rare',
    tier: 'gold',
    iconName: 'MasteryMedallion',
    targetValue: 3,
    unitLabel: 'high-score subject exams',
  },
  {
    id: 'topic_master',
    title: 'Topic Master',
    description:
      'Achieved 90% or higher mastery across at least 3 distinct curriculum week topics.',
    unlockRequirementText: 'Score >= 90% accuracy in 3 distinct weekly curriculum topics.',
    awardingTrigger: 'Weekly topic breakdown accuracy evaluation (>= 90%)',
    category: 'Mastery',
    rarity: 'Rare',
    tier: 'gold',
    iconName: 'TopicSignet',
    targetValue: 3,
    unitLabel: 'topics at >= 90%',
  },
  {
    id: 'week_mastery',
    title: 'Week-by-Week Mastery',
    description:
      'Mastered curriculum topics across at least 6 different instructional weeks with >= 75% accuracy.',
    unlockRequirementText: 'Achieve >= 75% accuracy across 6 distinct curriculum weeks.',
    awardingTrigger: 'Multi-week syllabus mastery evaluation (>= 75%)',
    category: 'Mastery',
    rarity: 'Epic',
    tier: 'gold',
    iconName: 'CurriculumCrown',
    targetValue: 6,
    unitLabel: 'weeks mastered',
  },
  {
    id: 'speed_demon',
    title: 'Timed Examination Mastery',
    description:
      'Scored 80% or higher while completing the paper within half of the allotted time.',
    unlockRequirementText: 'Score >= 80% in under 50% of the exam duration.',
    awardingTrigger: 'Elapsed examination timer & accuracy verification',
    category: 'Mastery',
    rarity: 'Rare',
    tier: 'silver',
    iconName: 'VelocityChronometer',
    targetValue: 1,
    unitLabel: 'rapid high-score exam',
  },

  // 5. Persistence
  {
    id: 'comeback_learner',
    title: 'Comeback Learner',
    description:
      'Improved your score in the same subject by at least 15 percentage points on a subsequent attempt.',
    unlockRequirementText: 'Improve a subject score by +15% or more on a later attempt.',
    awardingTrigger: 'Historical score delta comparison within same subject',
    category: 'Persistence',
    rarity: 'Uncommon',
    tier: 'silver',
    iconName: 'PhoenixEmblem',
    targetValue: 15,
    unitLabel: '% score improvement',
  },
  {
    id: 'retry_champion',
    title: 'Retry Champion',
    description:
      'Returned to a previously attempted subject and completed at least 3 practice or exam papers.',
    unlockRequirementText: 'Complete 3 attempts in any single subject.',
    awardingTrigger: 'Repeat subject attempt counter verification',
    category: 'Persistence',
    rarity: 'Uncommon',
    tier: 'silver',
    iconName: 'AnvilCrest',
    targetValue: 3,
    unitLabel: 'subject attempts',
  },
  {
    id: 'mistake_corrector',
    title: 'Mistake Corrector',
    description:
      'Achieved 85% or higher in a subject where an earlier attempt scored below 70%.',
    unlockRequirementText: 'Raise a subject score from < 70% to >= 85%.',
    awardingTrigger: 'Subject remediation & mastery turnaround check',
    category: 'Persistence',
    rarity: 'Epic',
    tier: 'gold',
    iconName: 'AlchemistSeal',
    targetValue: 1,
    unitLabel: 'subject turnaround',
  },

  // 6. Exploration
  {
    id: 'subject_master',
    title: 'Multi-Subject Explorer',
    description:
      'Completed examinations across at least 3 different Grade 7 curriculum subjects.',
    unlockRequirementText: 'Complete examinations in 3 distinct school subjects.',
    awardingTrigger: 'Cross-disciplinary subject breadth evaluation',
    category: 'Exploration',
    rarity: 'Uncommon',
    tier: 'silver',
    iconName: 'HorizonAstrolabe',
    targetValue: 3,
    unitLabel: 'subjects explored',
  },
  {
    id: 'full_syllabus_explorer',
    title: 'Full-Syllabus Explorer',
    description:
      'Completed examinations across 6 different Grade 7 curriculum subjects.',
    unlockRequirementText: 'Complete examinations in 6 distinct school subjects.',
    awardingTrigger: 'Full-curriculum subject breadth evaluation',
    category: 'Exploration',
    rarity: 'Epic',
    tier: 'gold',
    iconName: 'CelestialGlobe',
    targetValue: 6,
    unitLabel: 'subjects explored',
  },

  // 7. Dedication
  {
    id: 'practice_milestone',
    title: 'Practice Milestone',
    description:
      'Completed 5 full CBT examination sessions across the term.',
    unlockRequirementText: 'Submit 5 completed CBT examination sessions.',
    awardingTrigger: 'Cumulative completed session counter (5 sessions)',
    category: 'Dedication',
    rarity: 'Uncommon',
    tier: 'silver',
    iconName: 'PillarOfStudy',
    targetValue: 5,
    unitLabel: 'exams completed',
  },
  {
    id: 'revision_champion',
    title: 'Revision Champion',
    description:
      'Completed 10 full CBT practice or examination sessions to thoroughly revise term material.',
    unlockRequirementText: 'Submit 10 completed CBT examination sessions.',
    awardingTrigger: 'Cumulative completed session counter (10 sessions)',
    category: 'Dedication',
    rarity: 'Epic',
    tier: 'gold',
    iconName: 'RevisionLantern',
    targetValue: 10,
    unitLabel: 'exams completed',
  },
  {
    id: 'marathon_scholar',
    title: 'Question Marathon',
    description:
      'Answered a cumulative total of 150 or more correct questions across your examinations.',
    unlockRequirementText: 'Accumulate 150 correct answers across all completed exams.',
    awardingTrigger: 'Cumulative verified correct response counter',
    category: 'Dedication',
    rarity: 'Legendary',
    tier: 'diamond',
    iconName: 'GrandArchiveTome',
    targetValue: 150,
    unitLabel: 'correct answers',
  },
];

/**
 * Formats an ISO timestamp into a YYYY-MM-DD calendar day key in the specified timezone.
 * Defaults to UTC if no timezone is specified or if the timezone is invalid.
 */
export function toCalendarDayKey(isoTimestamp: string, timeZone = 'UTC'): string {
  try {
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) {
      return isoTimestamp.slice(0, 10);
    }
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return isoTimestamp.slice(0, 10);
  }
}

/**
 * Calculates the maximum consecutive calendar-day streak from chronological (dayKey, submittedAt) entries.
 */
export function calculateConsecutiveDayStreak(
  entries: Array<{ dayKey: string; submittedAt: string }>
): {
  maxConsecutiveDays: number;
  currentConsecutiveDays: number;
  thresholdUnlockDates: Record<number, string>;
} {
  if (entries.length === 0) {
    return {
      maxConsecutiveDays: 0,
      currentConsecutiveDays: 0,
      thresholdUnlockDates: {},
    };
  }

  // Deduplicate by calendar dayKey, keeping the earliest timestamp on each day
  const dayMap = new Map<string, string>();
  for (const item of entries) {
    if (!dayMap.has(item.dayKey)) {
      dayMap.set(item.dayKey, item.submittedAt);
    }
  }

  const sortedDays = Array.from(dayMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  let maxConsecutiveDays = 1;
  let currentStreak = 1;
  const thresholdUnlockDates: Record<number, string> = {
    1: sortedDays[0][1],
  };

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(`${sortedDays[i - 1][0]}T00:00:00Z`);
    const currDate = new Date(`${sortedDays[i][0]}T00:00:00Z`);
    const diffDays = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      currentStreak += 1;
    } else if (diffDays > 1) {
      currentStreak = 1;
    }

    if (currentStreak > maxConsecutiveDays) {
      maxConsecutiveDays = currentStreak;
    }
    if (!thresholdUnlockDates[currentStreak]) {
      thresholdUnlockDates[currentStreak] = sortedDays[i][1];
    }
  }

  return {
    maxConsecutiveDays,
    currentConsecutiveDays: currentStreak,
    thresholdUnlockDates,
  };
}

/**
 * Calculates the maximum consecutive correct answers within a single exam attempt's review list.
 */
export function calculateAttemptStreak(attempt: ExamAttempt): number {
  const reviews = attempt.result?.reviews;
  if (!reviews || reviews.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 0;

  for (const item of reviews) {
    if (item.status === 'correct') {
      currentStreak += 1;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

export interface BadgeEvaluationOptions {
  hasLoggedIn?: boolean;
  firstLoginAt?: string;
  persistedUnlocks?: UnlockedAchievementRecord[];
  timeZone?: string;
}

interface UnlockTriggerMeta {
  unlockedAt: string;
  earnedReason: string;
  triggerAttemptId?: string;
  triggerAttemptTitle?: string;
}

/**
 * Evaluates all student exam attempts and profile milestones to compute current badge unlock states,
 * progress values, and verifiable earnedReason metadata.
 * Preserves existing persisted unlock timestamps so achievements are never unlocked twice or lost.
 */
export function evaluateStudentBadges(
  attempts: ExamAttempt[],
  options: BadgeEvaluationOptions = {}
): StudentBadgeProgress[] {
  const timeZone = options.timeZone || 'UTC';
  const completedAttempts = attempts
    .filter((a) => (a.status === 'submitted' || a.status === 'expired') && a.result)
    .sort((a, b) => {
      const tA = new Date(a.result?.submittedAt || a.submittedAt || a.startedAt).getTime();
      const tB = new Date(b.result?.submittedAt || b.submittedAt || b.startedAt).getTime();
      return tA - tB;
    });

  const persistedMap = new Map<string, UnlockedAchievementRecord>();
  if (options.persistedUnlocks) {
    for (const rec of options.persistedUnlocks) {
      if (rec.badgeId && rec.unlockedAt) {
        persistedMap.set(rec.badgeId, rec);
      }
    }
  }

  let maxConsecutiveCorrect = 0;
  let bestPercentageScore = 0;
  let totalCorrectAnswers = 0;
  let speedHighAchieverCount = 0;
  let errorFreeAttemptCount = 0;
  const distinctSubjects = new Set<string>();
  const masteredWeeks75 = new Set<string>();
  const masteredTopics90 = new Set<string>();
  const subjectAttemptsMap = new Map<
    string,
    { score: number; submittedAt: string; attemptId: string; title: string }[]
  >();
  const studyDayEntries: Array<{ dayKey: string; submittedAt: string }> = [];

  const unlockMeta = new Map<string, UnlockTriggerMeta>();
  const recordUnlock = (badgeId: string, meta: UnlockTriggerMeta) => {
    if (!unlockMeta.has(badgeId)) {
      unlockMeta.set(badgeId, meta);
    }
  };

  for (let idx = 0; idx < completedAttempts.length; idx++) {
    const attempt = completedAttempts[idx];
    const res = attempt.result!;
    const submittedAt = res.submittedAt || attempt.submittedAt || attempt.startedAt;
    const title = attempt.config.title || 'Grade 7 CBT Examination';

    // First Practice & First Examination
    recordUnlock('first_practice', {
      unlockedAt: submittedAt,
      earnedReason: `Completed your first practice session on "${title}" (${res.percentageScore}% score).`,
      triggerAttemptId: attempt.id,
      triggerAttemptTitle: title,
    });
    recordUnlock('first_cbt', {
      unlockedAt: submittedAt,
      earnedReason: `Submitted your first Grade 7 CBT examination "${title}" (${res.correctAnswers}/${res.totalQuestions} correct).`,
      triggerAttemptId: attempt.id,
      triggerAttemptTitle: title,
    });

    if (idx + 1 >= 5) {
      recordUnlock('practice_milestone', {
        unlockedAt: submittedAt,
        earnedReason: `Completed your 5th CBT session on "${title}".`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }
    if (idx + 1 >= 10) {
      recordUnlock('revision_champion', {
        unlockedAt: submittedAt,
        earnedReason: `Completed your 10th revision session on "${title}".`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }

    // Calendar day entry for consecutive streak calculation
    const dayKey = toCalendarDayKey(submittedAt, timeZone);
    studyDayEntries.push({ dayKey, submittedAt });

    // 1. Consecutive correct streak within attempt
    const streak = calculateAttemptStreak(attempt);
    if (streak > maxConsecutiveCorrect) {
      maxConsecutiveCorrect = streak;
    }
    if (streak >= 5) {
      recordUnlock('streak_5', {
        unlockedAt: submittedAt,
        earnedReason: `Answered ${streak} consecutive questions correctly in "${title}".`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }
    if (streak >= 10) {
      recordUnlock('streak_10', {
        unlockedAt: submittedAt,
        earnedReason: `Answered ${streak} consecutive questions without error in "${title}".`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }

    // 2. Score percentage & Error-Free Attempt
    if (res.percentageScore > bestPercentageScore) {
      bestPercentageScore = res.percentageScore;
    }
    if (
      res.totalQuestions > 0 &&
      res.incorrectAnswers === 0 &&
      res.unansweredQuestions === 0
    ) {
      errorFreeAttemptCount += 1;
      recordUnlock('error_free_attempt', {
        unlockedAt: submittedAt,
        earnedReason: `Completed "${title}" with 0 incorrect answers (${res.correctAnswers}/${res.totalQuestions} correct).`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }
    if (res.percentageScore === 100) {
      recordUnlock('perfect_grade', {
        unlockedAt: submittedAt,
        earnedReason: `Scored a perfect 100% (${res.correctAnswers}/${res.totalQuestions}) on "${title}".`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }
    if (res.percentageScore >= 85) {
      recordUnlock('high_achiever', {
        unlockedAt: submittedAt,
        earnedReason: `Scored ${res.percentageScore}% (${res.correctAnswers}/${res.totalQuestions}) on "${title}".`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }

    // 3. Total cumulative correct answers
    totalCorrectAnswers += res.correctAnswers;
    if (totalCorrectAnswers >= 150) {
      recordUnlock('marathon_scholar', {
        unlockedAt: submittedAt,
        earnedReason: `Surpassed 150 cumulative correct answers (${totalCorrectAnswers} total) during "${title}".`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }

    // 4. Distinct subjects & per-subject history
    const attemptSubjects = new Set<string>();
    for (const sel of attempt.config.selections) {
      distinctSubjects.add(sel.subject);
      attemptSubjects.add(sel.subject);
    }
    if (distinctSubjects.size >= 3) {
      recordUnlock('subject_master', {
        unlockedAt: submittedAt,
        earnedReason: `Explored 3 distinct curriculum subjects (${Array.from(distinctSubjects).slice(0, 3).join(', ')}).`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }
    if (distinctSubjects.size >= 6) {
      recordUnlock('full_syllabus_explorer', {
        unlockedAt: submittedAt,
        earnedReason: `Completed assessments across 6 curriculum subjects (${Array.from(distinctSubjects).slice(0, 6).join(', ')}).`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }

    for (const subj of attemptSubjects) {
      const list = subjectAttemptsMap.get(subj) || [];
      list.push({
        score: res.percentageScore,
        submittedAt,
        attemptId: attempt.id,
        title,
      });
      subjectAttemptsMap.set(subj, list);

      const highScores = list.filter((x) => x.score >= 80).length;
      if (highScores >= 3) {
        recordUnlock('subject_specialist', {
          unlockedAt: submittedAt,
          earnedReason: `Achieved >= 80% accuracy across 3 examinations in ${subj}.`,
          triggerAttemptId: attempt.id,
          triggerAttemptTitle: title,
        });
      }
      if (list.length >= 3) {
        recordUnlock('retry_champion', {
          unlockedAt: submittedAt,
          earnedReason: `Completed 3 practice/examination sessions in ${subj}.`,
          triggerAttemptId: attempt.id,
          triggerAttemptTitle: title,
        });
      }
      if (list.length >= 2) {
        const minPrev = Math.min(...list.slice(0, -1).map((x) => x.score));
        const improvement = res.percentageScore - minPrev;
        if (improvement >= 15) {
          recordUnlock('comeback_learner', {
            unlockedAt: submittedAt,
            earnedReason: `Improved ${subj} score by +${improvement}% (from ${minPrev}% to ${res.percentageScore}%).`,
            triggerAttemptId: attempt.id,
            triggerAttemptTitle: title,
          });
        }
        if (minPrev < 70 && res.percentageScore >= 85) {
          recordUnlock('mistake_corrector', {
            unlockedAt: submittedAt,
            earnedReason: `Raised ${subj} score from ${minPrev}% to ${res.percentageScore}% on "${title}".`,
            triggerAttemptId: attempt.id,
            triggerAttemptTitle: title,
          });
        }
      }
    }

    // 5. Week & Topic mastery
    if (res.weekBreakdown) {
      for (const wb of res.weekBreakdown) {
        const totalQ = wb.totalQuestions ?? wb.total ?? 0;
        const accPct = wb.accuracyPercentage ?? wb.percentage ?? 0;
        const subjPrefix = wb.subject || attempt.config.selections[0]?.subject || 'General';
        if (totalQ > 0 && accPct >= 75) {
          masteredWeeks75.add(`${subjPrefix}-W${wb.weekNumber}`);
        }
        if (totalQ > 0 && accPct >= 90) {
          masteredTopics90.add(`${subjPrefix}-W${wb.weekNumber}`);
        }
      }
      if (masteredTopics90.size >= 3) {
        recordUnlock('topic_master', {
          unlockedAt: submittedAt,
          earnedReason: `Mastered ${masteredTopics90.size} weekly curriculum topics with >= 90% accuracy.`,
          triggerAttemptId: attempt.id,
          triggerAttemptTitle: title,
        });
      }
      if (masteredWeeks75.size >= 6) {
        recordUnlock('week_mastery', {
          unlockedAt: submittedAt,
          earnedReason: `Achieved >= 75% mastery across ${masteredWeeks75.size} distinct curriculum weeks.`,
          triggerAttemptId: attempt.id,
          triggerAttemptTitle: title,
        });
      }
    }

    // 6. Timed Examination Mastery: >= 80% score in <= 50% of allotted time
    const allottedSeconds = attempt.config.durationMinutes * 60;
    if (
      res.percentageScore >= 80 &&
      res.timeTakenSeconds > 0 &&
      res.timeTakenSeconds <= allottedSeconds * 0.5
    ) {
      speedHighAchieverCount += 1;
      const mins = Math.max(1, Math.round(res.timeTakenSeconds / 60));
      recordUnlock('speed_demon', {
        unlockedAt: submittedAt,
        earnedReason: `Scored ${res.percentageScore}% on "${title}" in ~${mins} min (under 50% of the ${attempt.config.durationMinutes}-min limit).`,
        triggerAttemptId: attempt.id,
        triggerAttemptTitle: title,
      });
    }
  }

  // Evaluate consecutive calendar day streaks
  const streakInfo = calculateConsecutiveDayStreak(studyDayEntries);
  if (streakInfo.maxConsecutiveDays >= 3 && streakInfo.thresholdUnlockDates[3]) {
    recordUnlock('day_streak_3', {
      unlockedAt: streakInfo.thresholdUnlockDates[3],
      earnedReason: `Completed CBT sessions across 3 consecutive calendar days (${timeZone}).`,
    });
  }
  if (streakInfo.maxConsecutiveDays >= 7 && streakInfo.thresholdUnlockDates[7]) {
    recordUnlock('day_streak_7', {
      unlockedAt: streakInfo.thresholdUnlockDates[7],
      earnedReason: `Sustained a 7-day consecutive calendar study streak (${timeZone}).`,
    });
  }
  if (streakInfo.maxConsecutiveDays >= 14 && streakInfo.thresholdUnlockDates[14]) {
    recordUnlock('day_streak_14', {
      unlockedAt: streakInfo.thresholdUnlockDates[14],
      earnedReason: `Sustained a 14-day consecutive calendar study streak (${timeZone}).`,
    });
  }

  // Compute aggregate persistence metrics across all subjects
  let maxSubjectHighScores = 0;
  let maxSubjectRetries = 0;
  let maxScoreImprovement = 0;
  let mistakeCorrectedCount = 0;

  for (const list of subjectAttemptsMap.values()) {
    const highCount = list.filter((x) => x.score >= 80).length;
    if (highCount > maxSubjectHighScores) maxSubjectHighScores = highCount;
    if (list.length > maxSubjectRetries) maxSubjectRetries = list.length;

    if (list.length >= 2) {
      for (let i = 1; i < list.length; i++) {
        const prevMin = Math.min(...list.slice(0, i).map((x) => x.score));
        const diff = list[i].score - prevMin;
        if (diff > maxScoreImprovement) maxScoreImprovement = diff;
        if (prevMin < 70 && list[i].score >= 85) {
          mistakeCorrectedCount = 1;
        }
      }
    }
  }

  const hasLoggedIn = Boolean(
    options.hasLoggedIn ||
      options.firstLoginAt ||
      persistedMap.has('first_login') ||
      completedAttempts.length > 0
  );

  if (hasLoggedIn) {
    const firstExamMeta = unlockMeta.get('first_cbt');
    recordUnlock('first_login', {
      unlockedAt:
        options.firstLoginAt ||
        firstExamMeta?.unlockedAt ||
        new Date().toISOString(),
      earnedReason:
        'Verified student sign-in and initialized Grade 7 ScholarCBT profile.',
    });
  }

  return BADGE_DEFINITIONS.map((badge) => {
    let currentValue = 0;

    switch (badge.id) {
      case 'first_login':
        currentValue = hasLoggedIn ? 1 : 0;
        break;
      case 'first_practice':
        currentValue = Math.min(1, completedAttempts.length);
        break;
      case 'first_cbt':
        currentValue = Math.min(1, completedAttempts.length);
        break;
      case 'day_streak_3':
      case 'day_streak_7':
      case 'day_streak_14':
        currentValue = Math.min(badge.targetValue, streakInfo.maxConsecutiveDays);
        break;
      case 'streak_5':
      case 'streak_10':
        currentValue = Math.min(badge.targetValue, maxConsecutiveCorrect);
        break;
      case 'high_achiever':
      case 'perfect_grade':
        currentValue = Math.min(badge.targetValue, bestPercentageScore);
        break;
      case 'error_free_attempt':
        currentValue = Math.min(
          badge.targetValue,
          errorFreeAttemptCount > 0 || bestPercentageScore === 100 ? 1 : 0
        );
        break;
      case 'subject_specialist':
        currentValue = Math.min(badge.targetValue, maxSubjectHighScores);
        break;
      case 'topic_master':
        currentValue = Math.min(badge.targetValue, masteredTopics90.size);
        break;
      case 'week_mastery':
        currentValue = Math.min(badge.targetValue, masteredWeeks75.size);
        break;
      case 'speed_demon':
        currentValue = Math.min(badge.targetValue, speedHighAchieverCount);
        break;
      case 'comeback_learner':
        currentValue = Math.min(badge.targetValue, Math.max(0, maxScoreImprovement));
        break;
      case 'retry_champion':
        currentValue = Math.min(badge.targetValue, maxSubjectRetries);
        break;
      case 'mistake_corrector':
        currentValue = Math.min(badge.targetValue, mistakeCorrectedCount);
        break;
      case 'subject_master':
      case 'full_syllabus_explorer':
        currentValue = Math.min(badge.targetValue, distinctSubjects.size);
        break;
      case 'practice_milestone':
      case 'revision_champion':
        currentValue = Math.min(badge.targetValue, completedAttempts.length);
        break;
      case 'marathon_scholar':
        currentValue = Math.min(badge.targetValue, totalCorrectAnswers);
        break;
    }

    const persistedRec = persistedMap.get(badge.id);
    const computedMeta = unlockMeta.get(badge.id);
    const unlocked = Boolean(persistedRec) || currentValue >= badge.targetValue;

    if (unlocked && currentValue < badge.targetValue) {
      currentValue = badge.targetValue;
    }

    const progressPercentage = Math.min(
      100,
      Math.round((currentValue / badge.targetValue) * 100)
    );

    const unlockedAt =
      persistedRec?.unlockedAt || (unlocked ? computedMeta?.unlockedAt : undefined);

    const remaining = Math.max(0, badge.targetValue - currentValue);
    const earnedReason = unlocked
      ? computedMeta?.earnedReason ||
        persistedRec?.earnedReason ||
        `Requirement satisfied: ${badge.unlockRequirementText}`
      : `In progress: ${currentValue} of ${badge.targetValue} ${badge.unitLabel} recorded (${remaining} more needed).`;

    return {
      badge,
      unlocked,
      unlockedAt,
      currentValue,
      progressPercentage,
      earnedReason,
      triggerAttemptId:
        computedMeta?.triggerAttemptId || persistedRec?.triggerAttemptId,
      triggerAttemptTitle: computedMeta?.triggerAttemptTitle,
    };
  });
}

/**
 * Merges newly evaluated badge unlocks with existing persisted unlock records idempotently.
 * Ensures an unlocked achievement is never unlocked twice or loses its original unlock timestamp.
 */
export function mergeUnlockedAchievements(
  existing: UnlockedAchievementRecord[] = [],
  evaluated: StudentBadgeProgress[],
  fallbackTimestamp = new Date().toISOString()
): {
  merged: UnlockedAchievementRecord[];
  newlyUnlocked: StudentBadgeProgress[];
} {
  const recordMap = new Map<string, UnlockedAchievementRecord>();
  for (const item of existing) {
    if (item.badgeId && item.unlockedAt) {
      recordMap.set(item.badgeId, {
        badgeId: item.badgeId,
        unlockedAt: item.unlockedAt,
        earnedReason: item.earnedReason,
        triggerAttemptId: item.triggerAttemptId,
      });
    }
  }

  const newlyUnlocked: StudentBadgeProgress[] = [];

  for (const item of evaluated) {
    if (item.unlocked) {
      if (!recordMap.has(item.badge.id)) {
        const ts = item.unlockedAt || fallbackTimestamp;
        const rec: UnlockedAchievementRecord = {
          badgeId: item.badge.id,
          unlockedAt: ts,
          earnedReason: item.earnedReason,
          triggerAttemptId: item.triggerAttemptId,
        };
        recordMap.set(item.badge.id, rec);
        newlyUnlocked.push({
          ...item,
          unlockedAt: ts,
        });
      } else {
        // Backfill earnedReason if previously missing on persisted record
        const prev = recordMap.get(item.badge.id)!;
        if (!prev.earnedReason && item.earnedReason) {
          prev.earnedReason = item.earnedReason;
        }
        if (!prev.triggerAttemptId && item.triggerAttemptId) {
          prev.triggerAttemptId = item.triggerAttemptId;
        }
      }
    }
  }

  const merged: UnlockedAchievementRecord[] = Array.from(recordMap.values());

  return { merged, newlyUnlocked };
}
