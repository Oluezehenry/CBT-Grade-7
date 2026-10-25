import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDENT_WALKTHROUGH_STEPS,
  DEMO_PRACTICE_QUESTIONS,
  createInitialWalkthroughState,
  markWalkthroughStepCompleted,
  markAllWalkthroughStepsCompleted,
  computeWalkthroughCompletionPercent,
  simulateWeekScopeQuestionPool,
} from './walkthroughLogic';

test('Student walkthrough defines 7 student-focused steps with zero admin jargon', () => {
  assert.equal(STUDENT_WALKTHROUGH_STEPS.length, 7);
  for (const step of STUDENT_WALKTHROUGH_STEPS) {
    assert.ok(step.title.length > 5);
    assert.ok(step.keyTakeaways.length >= 3);
    assert.notEqual(step.targetNav, 'question_bank', 'Walkthrough should focus on student workflows, not admin');
  }
});

test('Walkthrough progress tracking increments accurately and marks completion at 100%', () => {
  let state = createInitialWalkthroughState();
  assert.equal(computeWalkthroughCompletionPercent(state), 0);
  assert.equal(state.completedAt, null);

  state = markWalkthroughStepCompleted(state, 'step-subjects-weeks', '2026-10-24T12:00:00.000Z');
  assert.equal(computeWalkthroughCompletionPercent(state), Math.round((1 / 7) * 100));
  assert.equal(state.completedAt, null);

  // Duplicate step completion is idempotent
  state = markWalkthroughStepCompleted(state, 'step-subjects-weeks', '2026-10-24T12:01:00.000Z');
  assert.equal(computeWalkthroughCompletionPercent(state), Math.round((1 / 7) * 100));

  state = markAllWalkthroughStepsCompleted(state, '2026-10-24T12:05:00.000Z');
  assert.equal(computeWalkthroughCompletionPercent(state), 100);
  assert.equal(state.completedStepIds.length, 7);
  assert.equal(state.completedAt, '2026-10-24T12:05:00.000Z');
});

test('Demo practice questions have 4 context-matched options A-D and valid correctOptionId', () => {
  assert.ok(DEMO_PRACTICE_QUESTIONS.length >= 3);
  for (const q of DEMO_PRACTICE_QUESTIONS) {
    assert.equal(q.options.length, 4);
    assert.deepEqual(
      q.options.map((o) => o.id),
      ['A', 'B', 'C', 'D']
    );
    const hasCorrect = q.options.some((o) => o.id === q.correctOptionId);
    assert.equal(hasCorrect, true);
  }
});

test('simulateWeekScopeQuestionPool computes realistic pool and per-week distribution', () => {
  const sim = simulateWeekScopeQuestionPool(2, 5, 'weak_areas');
  assert.equal(sim.availablePoolCount, 60);
  assert.equal(sim.examQuestionCount, 50);
  assert.equal(sim.questionsPerWeekAvg, 5);
  assert.ok(sim.strategySummary.includes('70%'));
});
