import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Home,
  Play,
  Printer,
  RotateCcw,
  Target,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { ExamAttempt, QuestionReviewItem, StudentProfile, StudyDocument } from '../types/cbt';
import { MathText } from './MathText';
import { computeAcademicGradeLetter, computeWeakWeekTopics } from '../lib/masteryLogic';
import { AstrolabeTargetIcon, RoyalTranscriptSealIcon } from './ClassicAcademicIcons';

interface ExamResultReviewViewProps {
  attempt: ExamAttempt;
  documents?: StudyDocument[];
  profile?: StudentProfile | null;
  onRetryStarted: (newAttempt: ExamAttempt) => void;
  onStartNewExam: () => void;
  onStartSubjectPractice?: (documentId: string, selectedWeeks?: number[]) => void;
  onReturnDashboard: () => void;
}

export const ExamResultReviewView: React.FC<ExamResultReviewViewProps> = ({
  attempt,
  documents = [],
  profile,
  onRetryStarted,
  onStartNewExam,
  onStartSubjectPractice,
  onReturnDashboard,
}) => {
  const result = attempt.result;
  const [filterMode, setFilterMode] = useState<'all' | 'incorrect' | 'unanswered' | 'correct'>(
    'all'
  );
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [isCreatingRetry, setIsCreatingRetry] = useState<boolean>(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [showPrintSlip, setShowPrintSlip] = useState<boolean>(false);

  const filteredReviews: QuestionReviewItem[] = useMemo(() => {
    if (!result) return [];
    if (filterMode === 'all') return result.reviews;
    return result.reviews.filter((r) => r.status === filterMode);
  }, [result, filterMode]);

  const weakGroupsForAttempt = useMemo(() => {
    if (!result) return [];
    return computeWeakWeekTopics([attempt], documents, 60);
  }, [attempt, documents, result]);

  if (!result) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-600">Result summary is unavailable for this attempt.</p>
      </div>
    );
  }

  const currentReview =
    filteredReviews[Math.min(focusedIndex, Math.max(0, filteredReviews.length - 1))] ||
    null;

  const handleRetryIncorrect = async () => {
    setRetryError(null);
    setIsCreatingRetry(true);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}/retry-incorrect`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not create retry practice session.');
      }
      onRetryStarted(data.attempt);
    } catch (err: unknown) {
      setRetryError(
        err instanceof Error ? err.message : 'Failed to start retry session.'
      );
    } finally {
      setIsCreatingRetry(false);
    }
  };

  const handlePrintResultSlip = () => {
    setShowPrintSlip(true);
    setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        try {
          window.print();
        } catch {
          // Preview remains open on screen
        }
      }
    }, 80);
  };

  const missedCount = result.incorrectAnswers + result.unansweredQuestions;
  const minutesTaken = Math.floor(result.timeTakenSeconds / 60);
  const secondsTaken = result.timeTakenSeconds % 60;
  const passMarkPct = result.passMarkPercentage ?? attempt.config.passMarkPercentage ?? 50;
  const gradeInfo = computeAcademicGradeLetter(result.percentageScore, passMarkPct);

  return (
    <div className="space-y-8">
      {/* Top Result Hero Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 no-print">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6">
          <div className="space-y-2 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-indigo-700">
                EXAMINATION RESULT & SOURCE-GROUNDED REVIEW
              </span>
              <span aria-hidden="true">·</span>
              <span>{attempt.config.difficulty}</span>
              <span aria-hidden="true">·</span>
              <span>
                {result.submissionTrigger === 'timer_expired'
                  ? 'Auto-Submitted on Timer Expiry'
                  : 'Submitted Manually'}
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  (result.passed ?? result.percentageScore >= passMarkPct)
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {(result.passed ?? result.percentageScore >= passMarkPct)
                  ? `PASSED (≥${passMarkPct}%) · Grade ${gradeInfo.gradeCode}`
                  : `BELOW PASS MARK (<${passMarkPct}%) · Grade ${gradeInfo.gradeCode}`}
              </span>
              {attempt.isOfflineAttempt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold ${
                      attempt.syncStatus === 'synced'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : attempt.syncStatus === 'failed'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    Offline Attempt ({attempt.syncStatus === 'synced' ? 'Synced' : attempt.syncStatus === 'failed' ? 'Sync Failed' : 'Pending Sync'})
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {attempt.config.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Assessment Interpretation Note: A score of{' '}
              <strong className="font-mono">{result.percentageScore}%</strong> (
              <strong className="font-mono">
                {result.totalMarksEarned ?? result.correctAnswers} /{' '}
                {result.maxPossibleMarks ?? result.totalQuestions} Marks · {gradeInfo.gradeCode}{' '}
                {gradeInfo.remark}
              </strong>
              ) reflects your performance on the examined weekly lessons. Review the
              pedagogical explanations below to consolidate missed concepts.
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintResultSlip}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{showPrintSlip ? 'Print Official Result Slip' : 'Official Result Slip (Print / PDF)'}</span>
            </button>

            {missedCount > 0 && !attempt.isOfflineAttempt && (
              <button
                type="button"
                disabled={isCreatingRetry}
                onClick={handleRetryIncorrect}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {isCreatingRetry
                    ? 'Creating Practice Session...'
                    : `Retry Incorrect Questions (${missedCount})`}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onStartNewExam}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start New Examination</span>
            </button>
            <button
              type="button"
              onClick={onReturnDashboard}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>

        {retryError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            {retryError}
          </div>
        )}

        {/* Score Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1">
            <div className="text-xs text-slate-300">Score & Grade</div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">
              {result.percentageScore}% · {gradeInfo.gradeCode}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {result.totalMarksEarned ?? result.correctAnswers} /{' '}
              {result.maxPossibleMarks ?? result.totalQuestions} Marks ({gradeInfo.remark})
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-xs text-slate-500">Total Questions</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {result.totalQuestions}
            </div>
            <div className="text-[11px] text-slate-500">Validated 4-option</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
            <div className="text-xs text-emerald-800">Correct Answers</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-900">
              {result.correctAnswers}
            </div>
            <div className="text-[11px] text-emerald-700">Verified accurate</div>
          </div>

          <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1">
            <div className="text-xs text-red-800">Incorrect Answers</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-red-900">
              {result.incorrectAnswers}
            </div>
            <div className="text-[11px] text-red-700">See explanations below</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
            <div className="text-xs text-amber-800">Unanswered</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-900">
              {result.unansweredQuestions}
            </div>
            <div className="text-[11px] text-amber-700">Graded as 0 pts</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-xs text-slate-500">Time Taken</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {minutesTaken}m {secondsTaken}s
            </div>
            <div className="text-[11px] text-slate-500">
              of {attempt.config.durationMinutes}m limit
            </div>
          </div>
        </div>

        {/* Targeted Weak-Topic Revision Callout (when any examined week < 60%) */}
        {weakGroupsForAttempt.length > 0 && onStartSubjectPractice && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AstrolabeTargetIcon size={36} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                  <Target className="w-4 h-4 text-amber-700" />
                  <span>Targeted Weak-Week Revision Recommended (&lt;60% Accuracy)</span>
                </div>
                <p className="text-xs text-slate-700">
                  Consolidate the specific weekly lessons where accuracy fell below 60% in this paper:
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {weakGroupsForAttempt.map((grp) => (
                <button
                  key={grp.subject}
                  type="button"
                  disabled={!grp.documentId}
                  onClick={() =>
                    grp.documentId &&
                    onStartSubjectPractice(grp.documentId, grp.weakWeeks)
                  }
                  className="px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Revise {grp.subject} (Wk {grp.weakWeeks.join(', ')})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Three-Column Breakdown: Subject, Week, and Cognitive Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Subject Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h2 className="text-xs font-bold text-slate-800">Subject-Level Performance</h2>
            <div className="space-y-2.5">
              {result.subjectBreakdown.map((sb) => (
                <div key={sb.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{sb.label}</span>
                    <span className="font-mono tabular-nums text-slate-700">
                      {sb.correct}/{sb.total} ({sb.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${sb.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Week Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h2 className="text-xs font-bold text-slate-800">Weekly Lesson Breakdown</h2>
            <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
              {result.weekBreakdown.map((wb) => (
                <div key={wb.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{wb.label}</span>
                    <span className="font-mono tabular-nums text-slate-700">
                      {wb.correct}/{wb.total} ({wb.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        wb.percentage >= 75
                          ? 'bg-emerald-600'
                          : wb.percentage >= 55
                          ? 'bg-amber-500'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${wb.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cognitive Category Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h2 className="text-xs font-bold text-slate-800">
              Cognitive Category Performance
            </h2>
            <div className="space-y-2.5">
              {result.cognitiveBreakdown.map((cb) => (
                <div key={cb.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-800 truncate pr-2">
                      {cb.label}
                    </span>
                    <span className="font-mono tabular-nums text-slate-700 shrink-0">
                      {cb.correct}/{cb.total} ({cb.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${cb.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Official Printable / Previewable Candidate Result Slip */}
      <section
        aria-label="Official Candidate Result Slip"
        className={`${showPrintSlip ? 'block' : 'hidden print:block'} cbt-print-sheet bg-white rounded-xl border-2 border-slate-900 p-6 sm:p-8 space-y-6`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div className="flex items-start gap-3">
            <RoyalTranscriptSealIcon size={44} className="shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-600">
                SCHOLARCBT · GRADE 7 ACADEMIC EXAMINATION AUTHORITY
              </div>
              <h2 className="text-xl font-bold text-slate-950 mt-0.5">
                Official Candidate Examination Result Slip
              </h2>
              <p className="text-xs text-slate-600">
                Attempt Reference: <span className="font-mono font-semibold">{attempt.id}</span> · Issued{' '}
                {new Date(result.submittedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-lg bg-[#0F172A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPrintSlip(false)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Hide Preview
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-slate-200 pb-4">
          <div>
            <div className="text-slate-500">Candidate Name</div>
            <div className="font-bold text-slate-900 mt-0.5">
              {profile?.studentName || 'Grade 7 Candidate'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Class / Grade Level</div>
            <div className="font-bold text-slate-900 mt-0.5">
              {profile?.gradeLevel || 'Grade 7 (JSS 1)'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Assessment Paper</div>
            <div className="font-bold text-slate-900 mt-0.5">{attempt.config.title}</div>
          </div>
          <div>
            <div className="text-slate-500">Duration & Mode</div>
            <div className="font-mono font-bold text-slate-900 mt-0.5">
              {minutesTaken}m {secondsTaken}s / {attempt.config.durationMinutes}m
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg border border-slate-300 bg-slate-50">
            <div className="text-[11px] text-slate-500">Percentage Score</div>
            <div className="text-xl font-bold font-mono text-slate-950">
              {result.percentageScore}%
            </div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-300 bg-slate-50">
            <div className="text-[11px] text-slate-500">Letter Grade & Remark</div>
            <div className="text-xl font-bold font-mono text-slate-950">
              {gradeInfo.gradeCode} ({gradeInfo.remark})
            </div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-300 bg-slate-50">
            <div className="text-[11px] text-slate-500">Marks Earned</div>
            <div className="text-xl font-bold font-mono text-slate-950">
              {result.totalMarksEarned ?? result.correctAnswers} /{' '}
              {result.maxPossibleMarks ?? result.totalQuestions}
            </div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-300 bg-slate-50">
            <div className="text-[11px] text-slate-500">Final Status</div>
            <div className="text-xl font-bold font-mono text-slate-950">
              {gradeInfo.passed ? 'PASSED' : 'BELOW PASS MARK'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2">
              Subject & Week Breakdown
            </h3>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600">
                  <th className="py-1.5">Section / Week</th>
                  <th className="py-1.5 font-mono text-right">Score</th>
                  <th className="py-1.5 font-mono text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {result.weekBreakdown.map((wb) => (
                  <tr key={wb.label}>
                    <td className="py-1.5 font-medium text-slate-800">{wb.label}</td>
                    <td className="py-1.5 font-mono text-right">
                      {wb.correct}/{wb.total}
                    </td>
                    <td className="py-1.5 font-mono font-bold text-right">{wb.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2">
              Cognitive Domain Performance
            </h3>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600">
                  <th className="py-1.5">Cognitive Category</th>
                  <th className="py-1.5 font-mono text-right">Correct</th>
                  <th className="py-1.5 font-mono text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {result.cognitiveBreakdown.map((cb) => (
                  <tr key={cb.label}>
                    <td className="py-1.5 font-medium text-slate-800">{cb.label}</td>
                    <td className="py-1.5 font-mono text-right">
                      {cb.correct}/{cb.total}
                    </td>
                    <td className="py-1.5 font-mono font-bold text-right">{cb.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
          <div>
            <div className="border-b border-slate-400 h-7 mb-1" />
            <div>Candidate Signature & Date</div>
          </div>
          <div>
            <div className="border-b border-slate-400 h-7 mb-1" />
            <div>Academic Coordinator / Invigilator Verification</div>
          </div>
        </div>
      </section>

      {/* Detailed Answer Review Section (Configurable via Administrative Settings) */}
      {attempt.config.enablePostExamReview === false ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            Post-Examination Answer Review Disabled by Administrator
          </h2>
          <p className="text-xs text-slate-600 max-w-xl mx-auto">
            Your overall score, marks, and pass/fail status have been recorded. Detailed question-by-question answer keys and explanations are currently restricted by the examination settings.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Detailed Question-by-Question Review & Source References
              </h2>
              <p className="text-xs text-slate-500">
                Inspect every question, why distractors are incorrect, and the supporting
                lesson material after submission.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: `All (${result.totalQuestions})` },
                  { id: 'incorrect', label: `Incorrect (${result.incorrectAnswers})` },
                  { id: 'unanswered', label: `Unanswered (${result.unansweredQuestions})` },
                  { id: 'correct', label: `Correct (${result.correctAnswers})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFilterMode(tab.id);
                    setFocusedIndex(0);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    filterMode === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {!currentReview ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No questions match the selected filter ({filterMode}).
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quick Question Number Selector Strip */}
              <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto p-1">
                {filteredReviews.map((rev, idx) => {
                  const isActive = idx === focusedIndex;
                  return (
                    <button
                      key={rev.questionId}
                      type="button"
                      onClick={() => setFocusedIndex(idx)}
                      className={`w-9 h-9 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                        rev.status === 'correct'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : rev.status === 'incorrect'
                          ? 'bg-red-50 text-red-900 border-red-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      } ${isActive ? 'ring-2 ring-indigo-600 ring-offset-1' : ''}`}
                    >
                      Q{rev.questionNumber}
                    </button>
                  );
                })}
              </div>

              {/* Active Reviewed Question Card */}
              <div className="p-5 sm:p-6 rounded-xl border border-slate-200 bg-slate-50/40 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="font-mono font-bold text-slate-900">
                      Question {currentReview.questionNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-indigo-700">
                      {currentReview.subject}
                    </span>
                    {attempt.config.enableSourceDisclosure !== false && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">Week {currentReview.weekNumber}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{currentReview.cognitiveCategory}</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 text-xs font-bold ${
                      currentReview.status === 'correct'
                        ? 'text-emerald-700'
                        : currentReview.status === 'incorrect'
                        ? 'text-red-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {currentReview.status === 'correct' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Correct Answer</span>
                      </>
                    ) : currentReview.status === 'incorrect' ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Incorrect Answer</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>Unanswered</span>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-base font-semibold text-slate-900 leading-relaxed">
                  <MathText text={currentReview.questionText} />
                </p>

                {/* All Four Options with Student vs Correct Highlighting */}
                <div className="space-y-2.5">
                  {currentReview.options.map((opt) => {
                    const isCorrectOpt = opt.id === currentReview.correctAnswer;
                    const isStudentOpt = opt.id === currentReview.studentAnswer;

                    let boxStyle = 'bg-white border-slate-200 text-slate-800';
                    if (isCorrectOpt) {
                      boxStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950';
                    } else if (isStudentOpt && !isCorrectOpt) {
                      boxStyle = 'bg-red-50 border-red-400 text-red-950';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm ${boxStyle}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-mono font-bold">{opt.id}.</span>
                          <span>
                            <MathText text={opt.text} />
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-semibold text-xs">
                          {isCorrectOpt && (
                            <span className="text-emerald-800 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Correct Answer</span>
                            </span>
                          )}
                          {isStudentOpt && !isCorrectOpt && (
                            <span className="text-red-800 inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Your Selection</span>
                            </span>
                          )}
                          {isStudentOpt && isCorrectOpt && (
                            <span className="text-emerald-900">· Your Selection</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detailed Pedagogical Correction & Source Excerpt */}
                <div
                  className={`grid grid-cols-1 ${
                    attempt.config.enableSourceDisclosure !== false ? 'lg:grid-cols-2' : ''
                  } gap-4 pt-2`}
                >
                  <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3 text-xs">
                    {currentReview.whySelectedIncorrect && (
                      <div className="space-y-1">
                        <div className="font-bold text-red-700">
                          1. Why Your Selected Option ({currentReview.studentAnswer || 'None'})
                          Is Incorrect:
                        </div>
                        <p className="text-slate-700 leading-relaxed">
                          <MathText text={currentReview.whySelectedIncorrect} />
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="font-bold text-emerald-800">
                        {currentReview.whySelectedIncorrect ? '2. ' : ''}Why Option{' '}
                        {currentReview.correctAnswer} Is Supported by the Material:
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        <MathText text={currentReview.whyCorrectSupported} />
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">
                          Concept to Revisit:{' '}
                        </span>
                        <span className="text-indigo-700 font-semibold">
                          {currentReview.conceptToRevisit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Traceable Source Reference & Verbatim Excerpt */}
                  {attempt.config.enableSourceDisclosure !== false && (
                    <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2.5 text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>Traceable Source Document Provenance</span>
                      </div>
                      <div className="text-slate-600 space-y-0.5">
                        <div>
                          <strong>Document:</strong> {currentReview.sourceDocumentTitle}
                        </div>
                        <div>
                          <strong>Section & Week:</strong> Week {currentReview.weekNumber} —{' '}
                          {currentReview.sectionHeading}
                        </div>
                        <div>
                          <strong>Page Reference:</strong>{' '}
                          <span className="font-mono">{currentReview.pageReference}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-700 italic leading-relaxed">
                        &ldquo;{currentReview.supportingExcerpt}&rdquo;
                      </div>
                    </div>
                  )}
                </div>

                {/* Previous / Next Question in Review */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={focusedIndex <= 0}
                    onClick={() => setFocusedIndex((i) => Math.max(0, i - 1))}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous Question</span>
                  </button>

                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    Showing {focusedIndex + 1} of {filteredReviews.length}
                  </span>

                  <button
                    type="button"
                    disabled={focusedIndex >= filteredReviews.length - 1}
                    onClick={() =>
                      setFocusedIndex((i) => Math.min(filteredReviews.length - 1, i + 1))
                    }
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
