import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Play,
  Printer,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { ExamAttempt, StudentProfile, StudyDocument } from '../types/cbt';
import { computeAcademicGradeLetter, computeWeakWeekTopics } from '../lib/masteryLogic';
import { AstrolabeTargetIcon, RoyalTranscriptSealIcon } from './ClassicAcademicIcons';

interface HistoryAnalyticsViewProps {
  mode: 'history' | 'analytics';
  attempts: ExamAttempt[];
  documents?: StudyDocument[];
  profile?: StudentProfile | null;
  onInspectAttempt: (attemptId: string) => void;
  onResumeAttempt: (attemptId: string) => void;
  onRetryAttempt: (newAttempt: ExamAttempt) => void;
  onStartNewExam: () => void;
  onStartSubjectPractice?: (documentId: string, selectedWeeks?: number[]) => void;
}

export const HistoryAnalyticsView: React.FC<HistoryAnalyticsViewProps> = ({
  mode,
  attempts,
  documents = [],
  profile,
  onInspectAttempt,
  onResumeAttempt,
  onRetryAttempt,
  onStartNewExam,
  onStartSubjectPractice,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'in_progress'>(
    'all'
  );
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [showTermReportCard, setShowTermReportCard] = useState<boolean>(false);

  const submittedAttempts = useMemo(
    () => attempts.filter((a) => a.status === 'submitted' && a.result),
    [attempts]
  );

  const filteredAttempts = useMemo(() => {
    if (statusFilter === 'all') return attempts;
    return attempts.filter((a) => a.status === statusFilter);
  }, [attempts, statusFilter]);

  const weakTopicGroups = useMemo(
    () => computeWeakWeekTopics(submittedAttempts, documents, 60),
    [submittedAttempts, documents]
  );

  // Aggregate Analytics across all completed attempts
  const analyticsData = useMemo(() => {
    const subjectAgg = new Map<string, { correct: number; total: number }>();
    const weekAgg = new Map<
      string,
      { label: string; subject: string; weekNumber: number; correct: number; total: number }
    >();
    const cognitiveAgg = new Map<string, { correct: number; total: number }>();
    const missedConceptsMap = new Map<string, { concept: string; count: number; week: number; subject: string }>();

    for (const att of submittedAttempts) {
      const res = att.result!;
      for (const sb of res.subjectBreakdown) {
        const cur = subjectAgg.get(sb.label) || { correct: 0, total: 0 };
        cur.correct += sb.correct;
        cur.total += sb.total;
        subjectAgg.set(sb.label, cur);
      }
      for (const wb of res.weekBreakdown) {
        const cur = weekAgg.get(wb.label) || {
          label: wb.label,
          subject: wb.subject || '',
          weekNumber: wb.weekNumber || 1,
          correct: 0,
          total: 0,
        };
        cur.correct += wb.correct;
        cur.total += wb.total;
        weekAgg.set(wb.label, cur);
      }
      for (const cb of res.cognitiveBreakdown) {
        const cur = cognitiveAgg.get(cb.label) || { correct: 0, total: 0 };
        cur.correct += cb.correct;
        cur.total += cb.total;
        cognitiveAgg.set(cb.label, cur);
      }
      for (const rev of res.reviews) {
        if (rev.status !== 'correct') {
          const existing = missedConceptsMap.get(rev.conceptToRevisit) || {
            concept: rev.conceptToRevisit,
            count: 0,
            week: rev.weekNumber,
            subject: rev.subject,
          };
          existing.count++;
          missedConceptsMap.set(rev.conceptToRevisit, existing);
        }
      }
    }

    const subjects = Array.from(subjectAgg.entries()).map(([label, s]) => ({
      label,
      correct: s.correct,
      total: s.total,
      percentage: Math.round((s.correct / s.total) * 100),
    }));

    const weeks = Array.from(weekAgg.values())
      .map((w) => ({
        ...w,
        percentage: Math.round((w.correct / w.total) * 100),
      }))
      .sort((a, b) => a.percentage - b.percentage);

    const cognitives = Array.from(cognitiveAgg.entries()).map(([label, c]) => ({
      label,
      correct: c.correct,
      total: c.total,
      percentage: Math.round((c.correct / c.total) * 100),
    }));

    const missedConcepts = Array.from(missedConceptsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const totalCorrect = subjects.reduce((acc, s) => acc + s.correct, 0);
    const totalQuestions = subjects.reduce((acc, s) => acc + s.total, 0);
    const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return { subjects, weeks, cognitives, missedConcepts, overallPct, totalCorrect, totalQuestions };
  }, [submittedAttempts]);

  const handleQuickRetry = async (attemptId: string) => {
    setRetryingId(attemptId);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/retry-incorrect`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.attempt) {
        onRetryAttempt(data.attempt);
      }
    } finally {
      setRetryingId(null);
    }
  };

  if (mode === 'history') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Examination History
            </h1>
            <p className="text-sm text-slate-600">
              Persistent online archive of your completed and in-progress CBT attempts.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
            {(
              [
                { id: 'all', label: `All (${attempts.length})` },
                { id: 'submitted', label: `Completed (${submittedAttempts.length})` },
                {
                  id: 'in_progress',
                  label: `In Progress (${attempts.length - submittedAttempts.length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredAttempts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              No examination attempts found
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your examination history is empty until you start or submit an assessment.
            </p>
            <button
              type="button"
              onClick={onStartNewExam}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Start New Examination
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAttempts.map((att) => {
              const isSubmitted = att.status === 'submitted' && att.result;
              const res = att.result;
              return (
                <div
                  key={att.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-indigo-700">
                        {Array.from(
                          new Set(att.config.selections.map((s) => s.subject))
                        ).join(' · ')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{att.config.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {att.config.questionCount} Questions
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {att.config.durationMinutes} min limit
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(att.startedAt).toLocaleString()}</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {att.config.title}
                    </h2>

                    <div className="text-xs text-slate-600">
                      Selected Weeks:{' '}
                      {att.config.selections
                        .map(
                          (s) =>
                            `${s.subject} (Weeks ${s.selectedWeeks.join(', ')})`
                        )
                        .join(' · ')}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0">
                    {isSubmitted && res ? (
                      <>
                        <div className="text-right">
                          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                            {res.percentageScore}%
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            {res.correctAnswers}/{res.totalQuestions} correct
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {res.incorrectAnswers + res.unansweredQuestions > 0 && (
                            <button
                              type="button"
                              disabled={retryingId === att.id}
                              onClick={() => handleQuickRetry(att.id)}
                              className="px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Retry Missed</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onInspectAttempt(att.id)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                          >
                            Review Explanations
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onResumeAttempt(att.id)}
                        className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume Active Attempt</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const overallGrade = computeAcademicGradeLetter(analyticsData.overallPct, 50);

  // PERFORMANCE ANALYTICS VIEW
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Performance Analytics & Diagnostic Insights
          </h1>
          <p className="text-sm text-slate-600">
            Longitudinal analysis across your completed examinations by subject, week, and
            cognitive reasoning level.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          {submittedAttempts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowTermReportCard(true);
                setTimeout(() => {
                  try {
                    window.print();
                  } catch {
                    // Preview stays visible
                  }
                }, 80);
              }}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Term Performance Report (Print / PDF)</span>
            </button>
          )}
          <button
            type="button"
            onClick={onStartNewExam}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Start New Examination
          </button>
        </div>
      </div>

      {submittedAttempts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <BarChart3 className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">
            Insufficient Completed Attempts for Analytics
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Complete at least one CBT examination to generate genuine subject, weekly, and
            cognitive category analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Printable / Previewable Term Performance Report Card */}
          <section
            aria-label="Official Term Performance Report Card"
            className={`${showTermReportCard ? 'block' : 'hidden print:block'} cbt-print-sheet bg-white rounded-xl border-2 border-slate-900 p-6 sm:p-8 space-y-6`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
              <div className="flex items-start gap-3">
                <RoyalTranscriptSealIcon size={44} className="shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-600">
                    SCHOLARCBT · GRADE 7 CUMULATIVE TERM REPORT CARD
                  </div>
                  <h2 className="text-xl font-bold text-slate-950 mt-0.5">
                    Candidate Cumulative Term Performance Summary
                  </h2>
                  <p className="text-xs text-slate-600">
                    Candidate: <strong>{profile?.studentName || 'Grade 7 Student'}</strong> ({profile?.gradeLevel || 'Grade 7'}) · Completed Assessments:{' '}
                    <strong className="font-mono">{submittedAttempts.length}</strong>
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
                  <span>Print Report Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTermReportCard(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg border border-slate-300 bg-slate-50">
                <div className="text-slate-500">Cumulative Accuracy</div>
                <div className="text-xl font-bold font-mono text-slate-950">
                  {analyticsData.overallPct}% ({analyticsData.totalCorrect}/{analyticsData.totalQuestions})
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-300 bg-slate-50">
                <div className="text-slate-500">Overall Term Standing</div>
                <div className="text-xl font-bold font-mono text-slate-950">
                  {overallGrade.gradeCode} · {overallGrade.remark}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-300 bg-slate-50">
                <div className="text-slate-500">Subjects Examined</div>
                <div className="text-xl font-bold font-mono text-slate-950">
                  {analyticsData.subjects.length}
                </div>
              </div>
            </div>

            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600">
                  <th className="py-2">Subject</th>
                  <th className="py-2 font-mono text-right">Questions Correct</th>
                  <th className="py-2 font-mono text-right">Accuracy %</th>
                  <th className="py-2 font-mono text-right">Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {analyticsData.subjects.map((s) => {
                  const g = computeAcademicGradeLetter(s.percentage, 50);
                  return (
                    <tr key={s.label}>
                      <td className="py-2 font-bold text-slate-900">{s.label}</td>
                      <td className="py-2 font-mono text-right">
                        {s.correct}/{s.total}
                      </td>
                      <td className="py-2 font-mono font-bold text-right">{s.percentage}%</td>
                      <td className="py-2 font-mono text-right">
                        {g.gradeCode} ({g.remark})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Targeted Weak-Topic Revision Panel ("Practise My Weakest Weeks") */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-3">
                <AstrolabeTargetIcon size={40} className="shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                    <Target className="w-4 h-4" />
                    <span>Targeted Weak-Topic Revision (&lt;60% Accuracy Threshold)</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-0.5">
                    Practise Your Weakest Weekly Topics
                  </h2>
                  <p className="text-xs text-slate-500">
                    Launch a focused revision examination pre-configured with the exact subject weeks where your cumulative accuracy is below 60%.
                  </p>
                </div>
              </div>
            </div>

            {weakTopicGroups.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  All examined subject weeks currently meet or exceed the 60% mastery benchmark!
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weakTopicGroups.map((grp) => (
                  <div
                    key={grp.subject}
                    className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">{grp.subject}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-xs font-bold">
                          Avg: {grp.overallAccuracyPercentage}%
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {grp.weekDetails.map((w) => (
                          <span
                            key={w.weekNumber}
                            className="px-2 py-0.5 rounded border border-amber-300 bg-white font-mono text-[11px] text-slate-800"
                          >
                            Week {w.weekNumber}: {w.accuracyPercentage}% ({w.correct}/{w.total})
                          </span>
                        ))}
                      </div>
                    </div>

                    {onStartSubjectPractice && grp.documentId && (
                      <button
                        type="button"
                        onClick={() =>
                          onStartSubjectPractice(grp.documentId, grp.weakWeeks)
                        }
                        className="self-start px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>
                          Revise Weak Weeks (Wk {grp.weakWeeks.join(', ')})
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Score Progression Across Attempts */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Examination Score Progression
                </h2>
                <p className="text-xs text-slate-500">
                  Chronological accuracy across your completed assessments
                </p>
              </div>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {submittedAttempts
                .slice()
                .reverse()
                .map((att, idx) => {
                  const res = att.result!;
                  return (
                    <div
                      key={att.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono font-semibold">Attempt #{idx + 1}</span>
                        <span>{new Date(res.submittedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                        {res.percentageScore}%
                      </div>
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {att.config.title}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Mastery Overview Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Mastery Overview by Academic Week
                </h2>
                <p className="text-xs text-slate-500">
                  Accuracy trends mapped across weekly lesson topics
                </p>
              </div>
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.weeks}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="percentage" name="Accuracy %" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two-Column Breakdown: Subject & Cognitive Category Accuracy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Subject Accuracy Breakdown
                </h2>
                <BookOpen className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-4">
                {analyticsData.subjects.map((s) => (
                  <div key={s.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">{s.label}</span>
                      <span className="font-mono tabular-nums text-slate-700">
                        {s.correct}/{s.total} questions ({s.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Performance by Cognitive Category
                </h2>
                <Target className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-4">
                {analyticsData.cognitives.map((c) => (
                  <div key={c.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{c.label}</span>
                      <span className="font-mono tabular-nums text-slate-700">
                        {c.correct}/{c.total} ({c.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          c.percentage >= 75
                            ? 'bg-emerald-600'
                            : c.percentage >= 55
                            ? 'bg-indigo-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${c.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Week-Level Strengths & Weaknesses + Actionable Study Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                Week-Level Strengths & Weaknesses (Sorted by Priority)
              </h2>
              <p className="text-xs text-slate-500">
                Based on questions answered across your completed attempts. Note: sections
                with fewer than 5 questions represent initial indicators rather than
                definitive diagnosis.
              </p>
              <div className="space-y-3">
                {analyticsData.weeks.map((wk) => (
                  <div
                    key={wk.label}
                    className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{wk.label}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {wk.correct} of {wk.total} questions answered correctly
                      </div>
                    </div>
                    <div
                      className={`text-sm font-bold font-mono tabular-nums ${
                        wk.percentage >= 75
                          ? 'text-emerald-700'
                          : wk.percentage >= 55
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {wk.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                Actionable Revision Recommendations
              </h2>
              <p className="text-xs text-slate-500">
                Specific weekly concepts missed during your examinations that warrant
                focused source review:
              </p>
              {analyticsData.missedConcepts.length === 0 ? (
                <div className="p-4 bg-emerald-50 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>No missed concepts recorded across completed examinations!</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {analyticsData.missedConcepts.map((mc) => (
                    <div
                      key={mc.concept}
                      className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-950">{mc.subject}</span>
                        <span className="font-mono text-amber-800">
                          Missed {mc.count} time{mc.count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-800 font-medium">
                        Revisit: {mc.concept}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
