import {
  ExamAttempt,
  OptionId,
  QuestionBankItem,
  QuestionOption,
  StudyDocument,
} from '../types/cbt';

export interface WeakWeekDetail {
  weekNumber: number;
  lessonTitle: string;
  correct: number;
  total: number;
  accuracyPercentage: number;
}

export interface SubjectWeakTopicGroup {
  documentId: string;
  subject: string;
  weakWeeks: number[];
  weekDetails: WeakWeekDetail[];
  overallAccuracyPercentage: number;
  totalMissedQuestions: number;
}

export interface RevisionDeckItem {
  id: string;
  normKey: string;
  questionText: string;
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption];
  studentAnswer: OptionId | null;
  correctAnswer: OptionId;
  whySelectedIncorrect: string | null;
  whyCorrectSupported: string;
  conceptToRevisit: string;
  supportingExcerpt: string;
  subject: string;
  weekNumber: number;
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  sectionHeading: string;
  reasons: Array<'incorrect' | 'unanswered' | 'marked_for_review'>;
  isMastered: boolean;
  attemptId: string;
  attemptTitle: string;
  submittedAt: string;
}

export interface AcademicGradeDescriptor {
  gradeCode: 'A1' | 'B2' | 'B3' | 'C4' | 'C5' | 'C6' | 'D7' | 'E8' | 'F9';
  remark: string;
  passed: boolean;
}

/**
 * Returns standard WAEC/NECO/JSS academic grade letter and remark for a percentage score.
 */
export function computeAcademicGradeLetter(
  percentageScore: number,
  passMarkPercentage: number = 50
): AcademicGradeDescriptor {
  const score = Math.max(0, Math.min(100, Math.round(percentageScore)));
  const passed = score >= passMarkPercentage;

  if (score >= 75) return { gradeCode: 'A1', remark: 'Distinction', passed };
  if (score >= 70) return { gradeCode: 'B2', remark: 'Very Good', passed };
  if (score >= 65) return { gradeCode: 'B3', remark: 'Good', passed };
  if (score >= 60) return { gradeCode: 'C4', remark: 'Credit', passed };
  if (score >= 55) return { gradeCode: 'C5', remark: 'Credit', passed };
  if (score >= 50) return { gradeCode: 'C6', remark: 'Credit Pass', passed };
  if (score >= 45) return { gradeCode: 'D7', remark: 'Pass', passed };
  if (score >= 40) return { gradeCode: 'E8', remark: 'Fair', passed };
  return { gradeCode: 'F9', remark: 'Needs Remediation', passed };
}

/**
 * Analyzes completed attempts to identify subject weeks where student accuracy is below thresholdPct (default 60%).
 */
export function computeWeakWeekTopics(
  attempts: ExamAttempt[],
  documents: StudyDocument[],
  thresholdPct: number = 60
): SubjectWeakTopicGroup[] {
  const completed = attempts.filter(
    (a) => (a.status === 'submitted' || a.status === 'expired') && a.result
  );
  if (completed.length === 0) return [];

  // Map key: `${subject}::${weekNumber}`
  const weekStatsMap = new Map<
    string,
    {
      subject: string;
      documentId: string;
      weekNumber: number;
      correct: number;
      total: number;
    }
  >();

  const docBySubject = new Map<string, StudyDocument>();
  const docById = new Map<string, StudyDocument>();
  for (const doc of documents) {
    docBySubject.set(doc.subject.toLowerCase(), doc);
    docById.set(doc.id, doc);
  }

  for (const att of completed) {
    const reviews = att.result?.reviews || [];
    if (reviews.length > 0) {
      for (const rev of reviews) {
        const matchedDoc =
          docById.get(rev.sourceDocumentId) ||
          docBySubject.get((rev.subject || '').toLowerCase());
        const resolvedDocId = matchedDoc?.id || rev.sourceDocumentId || '';
        const resolvedSubject = matchedDoc?.subject || rev.subject || 'General';
        const wk = rev.weekNumber || 1;
        const key = `${resolvedSubject}::${wk}`;
        const cur = weekStatsMap.get(key) || {
          subject: resolvedSubject,
          documentId: resolvedDocId,
          weekNumber: wk,
          correct: 0,
          total: 0,
        };
        cur.total += 1;
        if (rev.status === 'correct') {
          cur.correct += 1;
        }
        weekStatsMap.set(key, cur);
      }
    } else {
      // Fallback to weekBreakdown if reviews array is empty
      for (const wb of att.result?.weekBreakdown || []) {
        const subj =
          wb.subject || att.config.selections?.[0]?.subject || 'General';
        const matchedDoc = docBySubject.get(subj.toLowerCase());
        const wk = wb.weekNumber || 1;
        const key = `${subj}::${wk}`;
        const cur = weekStatsMap.get(key) || {
          subject: subj,
          documentId:
            matchedDoc?.id || att.config.selections?.[0]?.documentId || '',
          weekNumber: wk,
          correct: 0,
          total: 0,
        };
        cur.correct += wb.correct;
        cur.total += wb.total;
        weekStatsMap.set(key, cur);
      }
    }
  }

  // Group weak weeks by subject
  const groupsBySubject = new Map<
    string,
    {
      documentId: string;
      subject: string;
      weakDetails: WeakWeekDetail[];
      totalCorrect: number;
      totalQuestions: number;
    }
  >();

  for (const entry of weekStatsMap.values()) {
    if (entry.total <= 0) continue;
    const accuracyPercentage = Math.round((entry.correct / entry.total) * 100);
    if (accuracyPercentage >= thresholdPct) continue;

    const doc =
      docById.get(entry.documentId) ||
      docBySubject.get(entry.subject.toLowerCase());
    const weekObj = doc?.weeks.find((w) => w.weekNumber === entry.weekNumber);
    const lessonTitle =
      weekObj?.lessonTitle || `Week ${entry.weekNumber} Curriculum Topic`;

    const group = groupsBySubject.get(entry.subject) || {
      documentId: doc?.id || entry.documentId,
      subject: entry.subject,
      weakDetails: [],
      totalCorrect: 0,
      totalQuestions: 0,
    };

    group.weakDetails.push({
      weekNumber: entry.weekNumber,
      lessonTitle,
      correct: entry.correct,
      total: entry.total,
      accuracyPercentage,
    });
    group.totalCorrect += entry.correct;
    group.totalQuestions += entry.total;
    groupsBySubject.set(entry.subject, group);
  }

  return Array.from(groupsBySubject.values())
    .map((g) => {
      const sortedDetails = g.weakDetails.sort(
        (a, b) => a.accuracyPercentage - b.accuracyPercentage || a.weekNumber - b.weekNumber
      );
      return {
        documentId: g.documentId,
        subject: g.subject,
        weakWeeks: sortedDetails.map((d) => d.weekNumber).sort((a, b) => a - b),
        weekDetails: sortedDetails,
        overallAccuracyPercentage:
          g.totalQuestions > 0
            ? Math.round((g.totalCorrect / g.totalQuestions) * 100)
            : 0,
        totalMissedQuestions: g.totalQuestions - g.totalCorrect,
      };
    })
    .sort(
      (a, b) =>
        a.overallAccuracyPercentage - b.overallAccuracyPercentage ||
        b.totalMissedQuestions - a.totalMissedQuestions
    );
}

/**
 * Builds the student's Personal Revision Deck from questions answered incorrectly, left unanswered,
 * or explicitly Marked for Review across completed examination attempts.
 */
export function buildPersonalRevisionDeck(
  attempts: ExamAttempt[],
  masteredQuestionIds: string[] = []
): RevisionDeckItem[] {
  const masteredSet = new Set(masteredQuestionIds);
  const completed = [...attempts]
    .filter((a) => (a.status === 'submitted' || a.status === 'expired') && a.result)
    .sort(
      (a, b) =>
        new Date(b.submittedAt || b.startedAt).getTime() -
        new Date(a.submittedAt || a.startedAt).getTime()
    );

  const deckByNormKey = new Map<string, RevisionDeckItem>();

  for (const att of completed) {
    const reviews = att.result?.reviews || [];
    for (const rev of reviews) {
      const responseObj = att.responses?.[rev.questionId];
      const wasMarkedForReview = Boolean(responseObj?.markedForReview);
      const wasIncorrect = rev.status === 'incorrect';
      const wasUnanswered = rev.status === 'unanswered';

      if (!wasIncorrect && !wasUnanswered && !wasMarkedForReview) {
        continue;
      }

      const normKey = `${rev.subject}::w${rev.weekNumber}::${rev.questionText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .slice(0, 120)}`;

      if (deckByNormKey.has(normKey)) {
        // Merge reasons if already seen in a newer attempt
        const existing = deckByNormKey.get(normKey)!;
        if (wasMarkedForReview && !existing.reasons.includes('marked_for_review')) {
          existing.reasons.push('marked_for_review');
        }
        continue;
      }

      const reasons: Array<'incorrect' | 'unanswered' | 'marked_for_review'> = [];
      if (wasIncorrect) reasons.push('incorrect');
      if (wasUnanswered) reasons.push('unanswered');
      if (wasMarkedForReview) reasons.push('marked_for_review');

      const isMastered =
        masteredSet.has(rev.questionId) || masteredSet.has(normKey);

      deckByNormKey.set(normKey, {
        id: rev.questionId,
        normKey,
        questionText: rev.questionText,
        options: rev.options,
        studentAnswer: rev.studentAnswer,
        correctAnswer: rev.correctAnswer,
        whySelectedIncorrect: rev.whySelectedIncorrect,
        whyCorrectSupported: rev.whyCorrectSupported,
        conceptToRevisit: rev.conceptToRevisit,
        supportingExcerpt: rev.supportingExcerpt,
        subject: rev.subject,
        weekNumber: rev.weekNumber,
        sourceDocumentId: rev.sourceDocumentId,
        sourceDocumentTitle: rev.sourceDocumentTitle,
        sectionHeading: rev.sectionHeading,
        reasons,
        isMastered,
        attemptId: att.id,
        attemptTitle: att.config.title,
        submittedAt: att.submittedAt || att.startedAt,
      });
    }
  }

  return Array.from(deckByNormKey.values());
}

function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/**
 * Generates an RFC-4180 CSV report of completed candidate examination attempts for teachers/admins.
 */
export function generateCohortAttemptsCsv(attempts: ExamAttempt[]): string {
  const headers = [
    'Attempt ID',
    'Student ID',
    'Examination Title',
    'Subjects',
    'Weeks Covered',
    'Total Questions',
    'Correct Answers',
    'Incorrect Answers',
    'Unanswered',
    'Percentage Score (%)',
    'Grade',
    'Status',
    'Duration Taken (sec)',
    'Submitted At',
  ];

  const completed = attempts.filter(
    (a) => (a.status === 'submitted' || a.status === 'expired') && a.result
  );

  const rows = completed.map((att) => {
    const res = att.result!;
    const subjects = Array.from(
      new Set((att.config.selections || []).map((s) => s.subject))
    ).join('; ');
    const weeks = (att.config.selections || [])
      .map((s) => `${s.subject}: Wks ${s.selectedWeeks.join('-')}`)
      .join('; ');
    const grade = computeAcademicGradeLetter(
      res.percentageScore,
      att.config.passMarkPercentage ?? 50
    );

    return [
      att.id,
      att.studentId || 'student-grade7-primary',
      att.config.title,
      subjects,
      weeks,
      res.totalQuestions,
      res.correctAnswers,
      res.incorrectAnswers,
      res.unansweredQuestions,
      res.percentageScore,
      `${grade.gradeCode} (${grade.remark})`,
      grade.passed ? 'PASSED' : 'BELOW PASS MARK',
      res.timeTakenSeconds,
      res.submittedAt || att.submittedAt || att.startedAt,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}

/**
 * Generates an RFC-4180 CSV report of question-level item difficulty and distractor telemetry.
 */
export function generateItemDifficultyCsv(
  attempts: ExamAttempt[],
  questionBank: QuestionBankItem[]
): string {
  const headers = [
    'Question ID',
    'Subject',
    'Week Number',
    'Cognitive Category',
    'Question Stem',
    'Correct Option',
    'Times Attempted',
    'Times Correct',
    'Item Difficulty (% Correct)',
    'Option A Count',
    'Option B Count',
    'Option C Count',
    'Option D Count',
  ];

  const statsByStem = new Map<
    string,
    {
      id: string;
      subject: string;
      weekNumber: number;
      cognitiveCategory: string;
      questionText: string;
      correctOptionId: OptionId;
      attempted: number;
      correct: number;
      optionCounts: Record<OptionId, number>;
    }
  >();

  for (const item of questionBank) {
    const norm = item.questionText.toLowerCase().trim();
    if (!statsByStem.has(norm)) {
      statsByStem.set(norm, {
        id: item.id,
        subject: item.subject,
        weekNumber: item.weekNumber,
        cognitiveCategory: item.cognitiveCategory,
        questionText: item.questionText,
        correctOptionId: item.correctOptionId,
        attempted: 0,
        correct: 0,
        optionCounts: { A: 0, B: 0, C: 0, D: 0 },
      });
    }
  }

  for (const att of attempts) {
    if (!att.result?.reviews) continue;
    for (const rev of att.result.reviews) {
      const norm = rev.questionText.toLowerCase().trim();
      let entry = statsByStem.get(norm);
      if (!entry) {
        entry = {
          id: rev.questionId,
          subject: rev.subject,
          weekNumber: rev.weekNumber,
          cognitiveCategory: rev.cognitiveCategory,
          questionText: rev.questionText,
          correctOptionId: rev.correctAnswer,
          attempted: 0,
          correct: 0,
          optionCounts: { A: 0, B: 0, C: 0, D: 0 },
        };
        statsByStem.set(norm, entry);
      }
      entry.attempted += 1;
      if (rev.status === 'correct') {
        entry.correct += 1;
      }
      if (rev.studentAnswer && ['A', 'B', 'C', 'D'].includes(rev.studentAnswer)) {
        entry.optionCounts[rev.studentAnswer] += 1;
      }
    }
  }

  const sorted = Array.from(statsByStem.values()).sort(
    (a, b) => b.attempted - a.attempted || a.subject.localeCompare(b.subject)
  );

  const rows = sorted.map((item) => {
    const diffPct =
      item.attempted > 0 ? Math.round((item.correct / item.attempted) * 100) : '';
    return [
      item.id,
      item.subject,
      item.weekNumber,
      item.cognitiveCategory,
      item.questionText,
      item.correctOptionId,
      item.attempted,
      item.correct,
      diffPct,
      item.optionCounts.A,
      item.optionCounts.B,
      item.optionCounts.C,
      item.optionCounts.D,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}
