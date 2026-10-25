import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAttemptStreak,
  calculateConsecutiveDayStreak,
  toCalendarDayKey,
  evaluateStudentBadges,
  mergeUnlockedAchievements,
  BADGE_DEFINITIONS,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_RARITIES,
} from './badgeSystem';
import { ExamAttempt, QuestionReviewItem } from '../types/cbt';

function createMockReview(
  questionNumber: number,
  status: 'correct' | 'incorrect' | 'unanswered',
  subject = 'Mathematics'
): QuestionReviewItem {
  return {
    questionId: `q-${questionNumber}`,
    questionNumber,
    questionText: `Grade 7 Problem ${questionNumber} $x^2 + 5 = 14$`,
    options: [
      { id: 'A', text: 'Option A details with key points expected' },
      { id: 'B', text: 'Option B details with key points expected' },
      { id: 'C', text: 'Option C details with key points expected' },
      { id: 'D', text: 'Option D details with key points expected' },
    ],
    studentAnswer: status === 'correct' ? 'A' : status === 'incorrect' ? 'B' : null,
    correctAnswer: 'A',
    status,
    whySelectedIncorrect: null,
    whyCorrectSupported: 'Strictly supported by note',
    conceptToRevisit: 'Indices',
    subject: subject as any,
    weekNumber: 1,
    sourceDocumentId: 'doc-1',
    sourceDocumentTitle: 'General Mathematics',
    sectionHeading: 'Lesson 1',
    pageReference: 'Page 1',
    supportingExcerpt: 'Excerpt text',
    cognitiveCategory: 'Application',
    difficultyLevel: 'High difficulty',
  };
}

function createMockAttempt(
  id: string,
  statuses: ('correct' | 'incorrect' | 'unanswered')[],
  percentageScore: number,
  timeTakenSeconds = 600,
  durationMinutes: 15 | 30 | 45 | 60 = 30,
  submittedAt = '2026-10-21T10:15:00.000Z',
  subject = 'Mathematics',
  weekNumber = 1
): ExamAttempt {
  const reviews = statuses.map((st, idx) => createMockReview(idx + 1, st, subject));
  const correctCount = statuses.filter((s) => s === 'correct').length;
  const incorrectCount = statuses.filter((s) => s === 'incorrect').length;
  const unansweredCount = statuses.filter((s) => s === 'unanswered').length;
  return {
    id,
    config: {
      id: `cfg-${id}`,
      title: `${subject} Term Examination`,
      selections: [
        {
          documentId: 'doc-1',
          subject: subject as any,
          documentTitle: subject,
          selectedWeeks: [weekNumber],
        },
      ],
      questionCount: statuses.length,
      durationMinutes,
      difficulty: 'High difficulty',
      createdAt: submittedAt,
    },
    status: 'submitted',
    startedAt: submittedAt,
    deadlineAt: submittedAt,
    submittedAt,
    currentQuestionIndex: statuses.length - 1,
    responses: {},
    questions: [],
    result: {
      attemptId: id,
      totalQuestions: statuses.length,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unansweredQuestions: unansweredCount,
      percentageScore,
      timeTakenSeconds,
      submittedAt,
      submissionTrigger: 'manual',
      subjectBreakdown: [],
      weekBreakdown: [
        {
          label: `${subject} — Week ${weekNumber}`,
          subject,
          weekNumber,
          correct: correctCount,
          total: statuses.length,
          percentage: percentageScore,
          totalQuestions: statuses.length,
          correctCount,
          incorrectCount,
          unansweredCount,
          accuracyPercentage: percentageScore,
        },
      ],
      cognitiveBreakdown: [],
      reviews,
      distractorUsage: {
        q1: { A: correctCount, B: incorrectCount, C: 0, D: 0 },
      },
    },
  };
}

test('BADGE_DEFINITIONS covers all 7 achievement categories and 5 rarity levels with 23 unique badges', () => {
  assert.equal(BADGE_DEFINITIONS.length, 23);
  const uniqueIds = new Set(BADGE_DEFINITIONS.map((b) => b.id));
  assert.equal(uniqueIds.size, 23);

  const presentCategories = new Set(BADGE_DEFINITIONS.map((b) => b.category));
  for (const cat of ACHIEVEMENT_CATEGORIES) {
    assert.equal(presentCategories.has(cat), true, `Missing category: ${cat}`);
  }
  const presentRarities = new Set(BADGE_DEFINITIONS.map((b) => b.rarity));
  for (const rar of ACHIEVEMENT_RARITIES) {
    assert.equal(presentRarities.has(rar), true, `Missing rarity: ${rar}`);
  }
});

test('calculateAttemptStreak: calculates max consecutive correct answers correctly', () => {
  const statuses: ('correct' | 'incorrect')[] = [
    'correct', 'correct', 'correct', 'correct',
    'incorrect',
    'correct', 'correct', 'correct', 'correct', 'correct',
    'correct', 'correct', 'correct', 'correct', 'correct', 'correct',
    'incorrect',
  ];
  const attempt = createMockAttempt('att-1', statuses, 88);
  const streak = calculateAttemptStreak(attempt);
  assert.equal(streak, 11);
});

test('calculateAttemptStreak: handles empty and zero correct attempts', () => {
  const attempt = createMockAttempt('att-zero', ['incorrect', 'incorrect'], 0);
  assert.equal(calculateAttemptStreak(attempt), 0);
});

test('calculateConsecutiveDayStreak: computes consecutive calendar day streaks and resets on gaps', () => {
  // 3 consecutive days, then a 2-day gap, then 2 consecutive days
  const entries = [
    { dayKey: toCalendarDayKey('2026-10-10T09:00:00Z'), submittedAt: '2026-10-10T09:00:00Z' },
    { dayKey: toCalendarDayKey('2026-10-11T14:30:00Z'), submittedAt: '2026-10-11T14:30:00Z' },
    { dayKey: toCalendarDayKey('2026-10-12T18:00:00Z'), submittedAt: '2026-10-12T18:00:00Z' },
    { dayKey: toCalendarDayKey('2026-10-15T10:00:00Z'), submittedAt: '2026-10-15T10:00:00Z' },
    { dayKey: toCalendarDayKey('2026-10-16T10:00:00Z'), submittedAt: '2026-10-16T10:00:00Z' },
  ];
  const res = calculateConsecutiveDayStreak(entries);
  assert.equal(res.maxConsecutiveDays, 3);
  assert.equal(res.currentConsecutiveDays, 2);
  assert.equal(res.thresholdUnlockDates[3], '2026-10-12T18:00:00Z');
});

test('evaluateStudentBadges: rewards 10 Consecutive Correct Answers when streak >= 10', () => {
  const statuses: ('correct' | 'incorrect')[] = Array(12).fill('correct');
  const attempt = createMockAttempt('att-streak10', statuses, 100);
  const badges = evaluateStudentBadges([attempt]);

  const streak10Badge = badges.find((b) => b.badge.id === 'streak_10');
  assert.ok(streak10Badge);
  assert.equal(streak10Badge.unlocked, true);
  assert.equal(streak10Badge.currentValue, 10);
  assert.equal(streak10Badge.progressPercentage, 100);
});

test('evaluateStudentBadges: marks 10 Consecutive Correct as in-progress if streak < 10', () => {
  const statuses: ('correct' | 'incorrect')[] = [
    'correct', 'correct', 'correct', 'correct', 'correct', 'correct', 'correct',
    'incorrect',
    'correct', 'correct',
  ];
  const attempt = createMockAttempt('att-streak7', statuses, 80);
  const badges = evaluateStudentBadges([attempt]);

  const streak10Badge = badges.find((b) => b.badge.id === 'streak_10');
  assert.ok(streak10Badge);
  assert.equal(streak10Badge.unlocked, false);
  assert.equal(streak10Badge.currentValue, 7);
  assert.equal(streak10Badge.progressPercentage, 70);

  const streak5Badge = badges.find((b) => b.badge.id === 'streak_5');
  assert.ok(streak5Badge);
  assert.equal(streak5Badge.unlocked, true);
});

test('evaluateStudentBadges: rewards First Practice, Error-Free Attempt, and Perfect Score when score is 100%', () => {
  const statuses: ('correct' | 'incorrect')[] = Array(15).fill('correct');
  const attempt = createMockAttempt('att-perfect', statuses, 100);
  const badges = evaluateStudentBadges([attempt]);

  const firstPractice = badges.find((b) => b.badge.id === 'first_practice');
  assert.ok(firstPractice);
  assert.equal(firstPractice.unlocked, true);
  assert.equal(firstPractice.triggerAttemptId, 'att-perfect');
  assert.ok(firstPractice.earnedReason?.includes('Mathematics Term Examination'));

  const errorFree = badges.find((b) => b.badge.id === 'error_free_attempt');
  assert.ok(errorFree);
  assert.equal(errorFree.unlocked, true);

  const perfectBadge = badges.find((b) => b.badge.id === 'perfect_grade');
  assert.ok(perfectBadge);
  assert.equal(perfectBadge.unlocked, true);
  assert.equal(perfectBadge.currentValue, 100);
  assert.equal(perfectBadge.progressPercentage, 100);
  assert.equal(perfectBadge.triggerAttemptId, 'att-perfect');
  assert.ok(perfectBadge.earnedReason?.includes('100%'));
});

test('evaluateStudentBadges: tracks progress towards Perfect Score if score < 100%', () => {
  const statuses: ('correct' | 'incorrect')[] = [
    'correct', 'correct', 'correct', 'incorrect',
  ];
  const attempt = createMockAttempt('att-92', statuses, 92);
  const badges = evaluateStudentBadges([attempt]);

  const perfectBadge = badges.find((b) => b.badge.id === 'perfect_grade');
  assert.ok(perfectBadge);
  assert.equal(perfectBadge.unlocked, false);
  assert.equal(perfectBadge.currentValue, 92);
  assert.equal(perfectBadge.progressPercentage, 92);
});

test('evaluateStudentBadges: unlocks First Exam, First Practice, Three-Day Streak, Topic Master, Comeback Learner, and Mistake Corrector', () => {
  const att1 = createMockAttempt(
    'att-1',
    ['correct', 'incorrect'],
    60,
    300,
    30,
    '2026-10-20T10:00:00.000Z',
    'Mathematics',
    1
  );
  const att2 = createMockAttempt(
    'att-2',
    Array(10).fill('correct'),
    100,
    300,
    30,
    '2026-10-21T10:00:00.000Z',
    'Mathematics',
    2
  );
  const att3 = createMockAttempt(
    'att-3',
    Array(10).fill('correct'),
    100,
    300,
    30,
    '2026-10-22T10:00:00.000Z',
    'Basic Science',
    3
  );
  const att4 = createMockAttempt(
    'att-4',
    Array(10).fill('correct'),
    100,
    300,
    30,
    '2026-10-22T14:00:00.000Z',
    'English Studies',
    4
  );
  const badges = evaluateStudentBadges([att1, att2, att3, att4], { hasLoggedIn: true });

  assert.ok(badges.find((b) => b.badge.id === 'first_login')?.unlocked);
  assert.ok(badges.find((b) => b.badge.id === 'first_practice')?.unlocked);
  assert.ok(badges.find((b) => b.badge.id === 'first_cbt')?.unlocked);
  assert.ok(badges.find((b) => b.badge.id === 'day_streak_3')?.unlocked);
  assert.ok(badges.find((b) => b.badge.id === 'topic_master')?.unlocked);
  assert.ok(badges.find((b) => b.badge.id === 'subject_master')?.unlocked);
  assert.ok(badges.find((b) => b.badge.id === 'speed_demon')?.unlocked);
  assert.ok(badges.find((b) => b.badge.id === 'comeback_learner')?.unlocked);
  assert.ok(badges.find((b) => b.badge.id === 'mistake_corrector')?.unlocked);

  // Verify idempotent persistence via mergeUnlockedAchievements
  const firstMerge = mergeUnlockedAchievements([], badges, '2026-10-22T15:00:00.000Z');
  assert.ok(firstMerge.newlyUnlocked.length >= 9);
  const secondMerge = mergeUnlockedAchievements(
    firstMerge.merged,
    badges,
    '2026-10-23T10:00:00.000Z'
  );
  assert.equal(
    secondMerge.newlyUnlocked.length,
    0,
    'Already unlocked badges must never trigger duplicate unlocks'
  );
});
