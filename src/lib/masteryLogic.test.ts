import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPersonalRevisionDeck,
  computeAcademicGradeLetter,
  computeWeakWeekTopics,
  generateCohortAttemptsCsv,
  generateItemDifficultyCsv,
} from './masteryLogic';
import { ExamAttempt, StudyDocument } from '../types/cbt';

const SAMPLE_DOCS: StudyDocument[] = [
  {
    id: 'doc-math-g7',
    title: 'Grade 7 Mathematics First Term',
    subject: 'Mathematics',
    classTerm: 'Grade 7 · First Term',
    description: 'Math syllabus',
    originalFilename: 'math.pdf',
    fileType: 'PDF',
    fileSizeBytes: 1024,
    uploadDate: '2026-10-01T00:00:00.000Z',
    lastUpdated: '2026-10-01T00:00:00.000Z',
    processingStatus: 'ready',
    extractionStatus: 'complete',
    storagePath: '/tmp/math.pdf',
    rawText: 'Week 1: Whole Numbers\nWeek 2: Fractions\nWeek 3: Algebra',
    weeks: [
      {
        id: 'w1',
        weekNumber: 1,
        lessonTitle: 'Whole Numbers & Place Value',
        content: 'Content 1',
        pageReference: 'Page 1',
        wordCount: 50,
        passageCount: 2,
      },
      {
        id: 'w2',
        weekNumber: 2,
        lessonTitle: 'Fractions & Decimals',
        content: 'Content 2',
        pageReference: 'Page 2',
        wordCount: 50,
        passageCount: 2,
      },
      {
        id: 'w3',
        weekNumber: 3,
        lessonTitle: 'Algebraic Expressions',
        content: 'Content 3',
        pageReference: 'Page 3',
        wordCount: 50,
        passageCount: 2,
      },
    ],
    passages: [],
  },
];

const SAMPLE_SUBMITTED_ATTEMPT: ExamAttempt = {
  id: 'att-test-1',
  studentId: 'student-1',
  config: {
    id: 'cfg-1',
    title: 'Mathematics Assessment',
    selections: [
      {
        documentId: 'doc-math-g7',
        subject: 'Mathematics',
        documentTitle: 'Grade 7 Mathematics First Term',
        selectedWeeks: [1, 2, 3],
      },
    ],
    questionCount: 5,
    durationMinutes: 30,
    difficulty: 'High difficulty',
    createdAt: '2026-10-25T07:00:00.000Z',
  },
  status: 'submitted',
  startedAt: '2026-10-25T07:00:00.000Z',
  deadlineAt: '2026-10-25T07:30:00.000Z',
  submittedAt: '2026-10-25T07:15:00.000Z',
  currentQuestionIndex: 0,
  responses: {
    q1: {
      questionId: 'q1',
      selectedOptionId: 'A',
      markedForReview: true,
      visited: true,
      updatedAt: '2026-10-25T07:05:00.000Z',
    },
    q2: {
      questionId: 'q2',
      selectedOptionId: 'B',
      markedForReview: false,
      visited: true,
      updatedAt: '2026-10-25T07:06:00.000Z',
    },
    q3: {
      questionId: 'q3',
      selectedOptionId: 'C',
      markedForReview: false,
      visited: true,
      updatedAt: '2026-10-25T07:07:00.000Z',
    },
  },
  questions: [],
  result: {
    attemptId: 'att-test-1',
    totalQuestions: 3,
    correctAnswers: 1,
    incorrectAnswers: 2,
    unansweredQuestions: 0,
    percentageScore: 33,
    timeTakenSeconds: 900,
    submittedAt: '2026-10-25T07:15:00.000Z',
    submissionTrigger: 'manual',
    subjectBreakdown: [
      { label: 'Mathematics', subject: 'Mathematics', correct: 1, total: 3, percentage: 33 },
    ],
    weekBreakdown: [
      { label: 'Week 1', subject: 'Mathematics', weekNumber: 1, correct: 1, total: 1, percentage: 100 },
      { label: 'Week 2', subject: 'Mathematics', weekNumber: 2, correct: 0, total: 2, percentage: 0 },
    ],
    cognitiveBreakdown: [],
    distractorUsage: {},
    reviews: [
      {
        questionId: 'q1',
        questionNumber: 1,
        questionText: 'What is the place value of 7 in 7,420?',
        options: [
          { id: 'A', text: 'Thousands' },
          { id: 'B', text: 'Hundreds' },
          { id: 'C', text: 'Tens' },
          { id: 'D', text: 'Units' },
        ],
        studentAnswer: 'A',
        correctAnswer: 'A',
        status: 'correct',
        whySelectedIncorrect: null,
        whyCorrectSupported: '7 is in the thousands position.',
        conceptToRevisit: 'Place Value',
        subject: 'Mathematics',
        weekNumber: 1,
        sourceDocumentId: 'doc-math-g7',
        sourceDocumentTitle: 'Grade 7 Mathematics First Term',
        sectionHeading: 'Week 1',
        pageReference: 'Page 1',
        supportingExcerpt: 'Place value of digits in whole numbers.',
        cognitiveCategory: 'Recall and precise knowledge',
        difficultyLevel: 'Standard',
      },
      {
        questionId: 'q2',
        questionNumber: 2,
        questionText: 'Simplify the fraction 12/18 to its lowest terms.',
        options: [
          { id: 'A', text: '2/3' },
          { id: 'B', text: '3/4' },
          { id: 'C', text: '4/6' },
          { id: 'D', text: '1/2' },
        ],
        studentAnswer: 'B',
        correctAnswer: 'A',
        status: 'incorrect',
        whySelectedIncorrect: '3/4 is 12/16, not 12/18.',
        whyCorrectSupported: 'Dividing numerator and denominator by 6 gives 2/3.',
        conceptToRevisit: 'Equivalent Fractions',
        subject: 'Mathematics',
        weekNumber: 2,
        sourceDocumentId: 'doc-math-g7',
        sourceDocumentTitle: 'Grade 7 Mathematics First Term',
        sectionHeading: 'Week 2',
        pageReference: 'Page 2',
        supportingExcerpt: 'Divide both numerator and denominator by their HCF.',
        cognitiveCategory: 'Application',
        difficultyLevel: 'High difficulty',
      },
      {
        questionId: 'q3',
        questionNumber: 3,
        questionText: 'Convert 3/8 to a decimal fraction.',
        options: [
          { id: 'A', text: '0.375' },
          { id: 'B', text: '0.325' },
          { id: 'C', text: '0.625' },
          { id: 'D', text: '0.125' },
        ],
        studentAnswer: 'C',
        correctAnswer: 'A',
        status: 'incorrect',
        whySelectedIncorrect: '0.625 is 5/8.',
        whyCorrectSupported: '3 divided by 8 equals 0.375.',
        conceptToRevisit: 'Fraction to Decimal Conversion',
        subject: 'Mathematics',
        weekNumber: 2,
        sourceDocumentId: 'doc-math-g7',
        sourceDocumentTitle: 'Grade 7 Mathematics First Term',
        sectionHeading: 'Week 2',
        pageReference: 'Page 2',
        supportingExcerpt: 'Divide numerator by denominator.',
        cognitiveCategory: 'Application',
        difficultyLevel: 'High difficulty',
      },
    ],
  },
};

test('computeWeakWeekTopics returns empty array when student has zero attempts', () => {
  const result = computeWeakWeekTopics([], SAMPLE_DOCS);
  assert.equal(result.length, 0);
});

test('computeWeakWeekTopics accurately identifies weeks below 60% accuracy and maps to documentId', () => {
  const groups = computeWeakWeekTopics([SAMPLE_SUBMITTED_ATTEMPT], SAMPLE_DOCS, 60);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].documentId, 'doc-math-g7');
  assert.equal(groups[0].subject, 'Mathematics');
  assert.deepEqual(groups[0].weakWeeks, [2]);
  assert.equal(groups[0].weekDetails[0].lessonTitle, 'Fractions & Decimals');
  assert.equal(groups[0].weekDetails[0].accuracyPercentage, 0);
});

test('buildPersonalRevisionDeck collects both marked-for-review and incorrect questions and respects masteredQuestionIds', () => {
  const deck = buildPersonalRevisionDeck([SAMPLE_SUBMITTED_ATTEMPT], ['q2']);
  // q1 was correct but markedForReview = true; q2 and q3 were incorrect
  assert.equal(deck.length, 3);
  const q1Card = deck.find((d) => d.id === 'q1');
  const q2Card = deck.find((d) => d.id === 'q2');
  assert.ok(q1Card);
  assert.deepEqual(q1Card.reasons, ['marked_for_review']);
  assert.equal(q1Card.isMastered, false);

  assert.ok(q2Card);
  assert.deepEqual(q2Card.reasons, ['incorrect']);
  assert.equal(q2Card.isMastered, true);
});

test('computeAcademicGradeLetter returns accurate grade letters and remarks', () => {
  assert.deepEqual(computeAcademicGradeLetter(82, 50), {
    gradeCode: 'A1',
    remark: 'Distinction',
    passed: true,
  });
  assert.deepEqual(computeAcademicGradeLetter(52, 50), {
    gradeCode: 'C6',
    remark: 'Credit Pass',
    passed: true,
  });
  assert.deepEqual(computeAcademicGradeLetter(35, 50), {
    gradeCode: 'F9',
    remark: 'Needs Remediation',
    passed: false,
  });
});

test('generateCohortAttemptsCsv and generateItemDifficultyCsv produce valid CSV output', () => {
  const attemptCsv = generateCohortAttemptsCsv([SAMPLE_SUBMITTED_ATTEMPT]);
  assert.ok(attemptCsv.includes('Attempt ID,Student ID,Examination Title'));
  assert.ok(attemptCsv.includes('att-test-1'));
  assert.ok(attemptCsv.includes('F9 (Needs Remediation)'));

  const itemCsv = generateItemDifficultyCsv([SAMPLE_SUBMITTED_ATTEMPT], []);
  assert.ok(itemCsv.includes('Question ID,Subject,Week Number'));
  assert.ok(itemCsv.includes('Simplify the fraction 12/18'));
});
