import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTIVATIONAL_QUOTES,
  buildLoginQuoteNotificationPayload,
  evaluateDailyCheckInStreak,
  getDailyMotivationalQuote,
  shouldTriggerDailyReminder,
} from './dailyEngagementLogic';

test('MOTIVATIONAL_QUOTES has at least 15 curated quotes with authors and themes', () => {
  assert.ok(MOTIVATIONAL_QUOTES.length >= 15);
  for (const q of MOTIVATIONAL_QUOTES) {
    assert.ok(q.quote.length > 20);
    assert.ok(q.author.length > 2);
    assert.ok(q.role.length > 2);
  }
});

test('getDailyMotivationalQuote deterministically returns a quote for a date and rotates with offset', () => {
  const q1 = getDailyMotivationalQuote('2026-10-25', 0);
  const q1Repeat = getDailyMotivationalQuote('2026-10-25', 0);
  const q2 = getDailyMotivationalQuote('2026-10-25', 1);

  assert.equal(q1.id, q1Repeat.id);
  assert.notEqual(q1.id, q2.id);
});

test('evaluateDailyCheckInStreak computes consecutive day streaks, longest streak, and milestones accurately', () => {
  const empty = evaluateDailyCheckInStreak([], [], '2026-10-25');
  assert.equal(empty.currentStreak, 0);
  assert.equal(empty.checkedInToday, false);

  const threeDays = evaluateDailyCheckInStreak(
    ['2026-10-23', '2026-10-24', '2026-10-25'],
    [],
    '2026-10-25'
  );
  assert.equal(threeDays.currentStreak, 3);
  assert.equal(threeDays.longestStreak, 3);
  assert.equal(threeDays.checkedInToday, true);
  assert.equal(threeDays.isMilestoneReached, true);
  assert.equal(threeDays.nextMilestone, 7);

  // Broken streak resets currentStreak to 0 if last check-in was >1 day ago
  const broken = evaluateDailyCheckInStreak(
    ['2026-10-18', '2026-10-19', '2026-10-20'],
    [],
    '2026-10-25'
  );
  assert.equal(broken.currentStreak, 0);
  assert.equal(broken.longestStreak, 3);
  assert.equal(broken.checkedInToday, false);
});

test('shouldTriggerDailyReminder fires only once per day when enabled and not yet checked in', () => {
  assert.equal(
    shouldTriggerDailyReminder({
      enabled: true,
      lastRemindedDate: null,
      checkedInToday: false,
      todayKey: '2026-10-25',
    }),
    true
  );

  assert.equal(
    shouldTriggerDailyReminder({
      enabled: true,
      lastRemindedDate: '2026-10-25',
      checkedInToday: false,
      todayKey: '2026-10-25',
    }),
    false
  );

  assert.equal(
    shouldTriggerDailyReminder({
      enabled: false,
      lastRemindedDate: null,
      checkedInToday: false,
      todayKey: '2026-10-25',
    }),
    false
  );
});

test('buildLoginQuoteNotificationPayload generates personalized login quote and practice reminder messages', () => {
  const quote = getDailyMotivationalQuote('2026-10-25', 0);
  const payload = buildLoginQuoteNotificationPayload({
    studentName: 'David Adeyemi',
    streakDays: 5,
    checkedInToday: false,
    quote,
  });

  assert.ok(payload.title.includes('David'));
  assert.ok(payload.title.includes('5-Day Streak'));
  assert.ok(payload.body.includes(quote.quote));
  assert.ok(payload.body.includes(quote.author));
});

