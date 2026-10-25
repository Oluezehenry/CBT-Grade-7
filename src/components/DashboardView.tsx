import React, { useMemo, useState } from 'react';
import {
  ExamAttempt,
  ExamQuestion,
  MainNavSection,
  StudentProfile,
  StudyDocument,
} from '../types/cbt';
import { BADGE_DEFINITIONS, evaluateStudentBadges } from '../lib/badgeSystem';
import {
  AstrolabeTargetIcon,
  CrestOfExcellenceIcon,
  EternalFlameMedallionIcon,
  HeraldBellIcon,
  RoyalTranscriptSealIcon,
  ScholarCodexIcon,
  SovereignAegisIcon,
} from './ClassicAcademicIcons';
import {
  evaluateDailyCheckInStreak,
  getDailyMotivationalQuote,
  toLocalCalendarDateKey,
} from '../lib/dailyEngagementLogic';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Clock,
  Compass,
  Database,
  FileText,
  History,
  Play,
  Quote,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
} from 'lucide-react';

interface DashboardViewProps {
  profile: StudentProfile;
  documents: StudyDocument[];
  questionBank: ExamQuestion[];
  attempts: ExamAttempt[];
  activeAttempt: ExamAttempt | null;
  onNavigate: (nav: MainNavSection) => void;
  onResumeAttempt: (attempt?: ExamAttempt) => void;
  onInspectAttempt: (attempt: ExamAttempt) => void;
  onStartSubjectPractice?: (documentId: string, selectedWeeks?: number[]) => void;
  onOpenWalkthrough?: () => void;
  onOpenDailyEngagement?: () => void;
}

type PracticeScopePreset = 'all_weeks' | 'first_half' | 'second_half';

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  documents,
  questionBank,
  attempts,
  activeAttempt,
  onNavigate,
  onResumeAttempt,
  onInspectAttempt,
  onStartSubjectPractice,
  onOpenWalkthrough,
  onOpenDailyEngagement,
}) => {
  const [subjectQuery, setSubjectQuery] = useState('');
  const [selectedScopePreset, setSelectedScopePreset] =
    useState<PracticeScopePreset>('all_weeks');
  const [quoteIdx, setQuoteIdx] = useState(0);

  const readyDocs = useMemo(
    () => documents.filter((d) => d.processingStatus === 'ready'),
    [documents]
  );

  const dailyQuote = useMemo(
    () => getDailyMotivationalQuote(toLocalCalendarDateKey(), quoteIdx),
    [quoteIdx]
  );

  const streakSummary = useMemo(
    () => evaluateDailyCheckInStreak(profile.dailyCheckInDates || [], attempts),
    [profile.dailyCheckInDates, attempts]
  );

  // All unfinished (in-progress) attempts whose deadline has not yet passed
  const unfinishedAttempts = useMemo(() => {
    const now = Date.now();
    const list = attempts.filter(
      (a) => a.status === 'in_progress' && new Date(a.deadlineAt).getTime() > now
    );
    if (
      activeAttempt &&
      activeAttempt.status === 'in_progress' &&
      new Date(activeAttempt.deadlineAt).getTime() > now &&
      !list.some((x) => x.id === activeAttempt.id)
    ) {
      list.unshift(activeAttempt);
    }
    return list;
  }, [attempts, activeAttempt]);

  const completedAttempts = useMemo(
    () =>
      attempts.filter(
        (a) => (a.status === 'submitted' || a.status === 'expired') && a.result
      ),
    [attempts]
  );

  const avgScore = useMemo(() => {
    if (completedAttempts.length === 0) return null;
    const sum = completedAttempts.reduce(
      (acc, a) => acc + (a.result?.percentageScore || 0),
      0
    );
    return Math.round(sum / completedAttempts.length);
  }, [completedAttempts]);

  const bestScore = useMemo(() => {
    if (completedAttempts.length === 0) return null;
    return Math.max(...completedAttempts.map((a) => a.result?.percentageScore || 0));
  }, [completedAttempts]);

  const practisedSubjectCount = useMemo(() => {
    const subjectSet = new Set<string>();
    for (const att of completedAttempts) {
      for (const sel of att.config.selections || []) {
        subjectSet.add(sel.documentId || sel.subject);
      }
    }
    return subjectSet.size;
  }, [completedAttempts]);

  // Count approved question bank items per document/subject
  const questionCountByDoc = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questionBank) {
      const status = (q as any).bankStatus || q.reviewStatus || 'Approved';
      if (String(status).toLowerCase() === 'approved') {
        map.set(q.sourceDocumentId, (map.get(q.sourceDocumentId) || 0) + 1);
      }
    }
    return map;
  }, [questionBank]);

  const filteredDocs = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase();
    if (!q) return readyDocs;
    return readyDocs.filter(
      (d) =>
        d.subject.toLowerCase().includes(q) || d.title.toLowerCase().includes(q)
    );
  }, [readyDocs, subjectQuery]);

  // Compact achievement count for secondary navigation link only (no gallery on home screen)
  const unlockedBadgeCount = useMemo(() => {
    const badges = evaluateStudentBadges(attempts, {
      hasLoggedIn: true,
      firstLoginAt: profile.firstLoginAt,
      persistedUnlocks: profile.unlockedAchievements,
    });
    return badges.filter((b) => b.unlocked).length;
  }, [attempts, profile.firstLoginAt, profile.unlockedAchievements]);

  const getWeeksForPreset = (doc: StudyDocument, preset: PracticeScopePreset): number[] => {
    const allWeeks = doc.weeks.map((w) => w.weekNumber).sort((a, b) => a - b);
    if (preset === 'first_half') {
      const filtered = allWeeks.filter((w) => w <= 6);
      return filtered.length > 0 ? filtered : allWeeks;
    }
    if (preset === 'second_half') {
      const filtered = allWeeks.filter((w) => w >= 7);
      return filtered.length > 0 ? filtered : allWeeks;
    }
    return allWeeks;
  };

  return (
    <div className="space-y-6 pb-10">
      {/* PRIORITY 1: Continue Unfinished Examination(s) when one or more exist */}
      {unfinishedAttempts.length > 0 && (
        <section
          data-walkthrough="unfinished-exam-banner"
          aria-label="Unfinished Examination Recovery"
          className="rounded-xl border-2 border-[#1E3A8A] bg-white p-5 shadow-xs"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
            <div className="flex items-start gap-3">
              <SovereignAegisIcon size={40} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#B45309]">
                  <span className="h-2 w-2 rounded-full bg-[#B45309]" />
                  <span>
                    {unfinishedAttempts.length === 1
                      ? 'Unfinished Examination In Progress'
                      : `${unfinishedAttempts.length} Unfinished Examinations In Progress`}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Resume Where You Left Off
                </h2>
                <p className="text-sm text-slate-600">
                  Your selected answers, question order, and remaining time are preserved.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('start_exam')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            >
              <Play className="h-3.5 w-3.5 text-[#1D4ED8]" />
              <span>Start a New Practice Session Instead</span>
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-200">
            {unfinishedAttempts.map((att) => {
              const answeredCount = Object.values(att.responses || {}).filter(
                (r) => r.selectedOptionId !== null
              ).length;
              const totalCount = att.questions.length;
              const pct =
                totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
              const subjectsLabel = Array.from(
                new Set(att.config.selections.map((s) => s.subject))
              ).join(', ');
              const remainingMin = Math.max(
                1,
                Math.ceil((new Date(att.deadlineAt).getTime() - Date.now()) / 60000)
              );

              return (
                <div
                  key={att.id}
                  className="flex flex-col gap-4 py-3.5 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">
                        {att.config.title}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {subjectsLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>
                        Started:{' '}
                        <strong className="font-mono text-slate-800">
                          {new Date(att.startedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                      </span>
                      <span>
                        Progress:{' '}
                        <strong className="font-mono text-slate-800">
                          {answeredCount} / {totalCount} answered ({pct}%)
                        </strong>
                      </span>
                      <span>
                        Current Question:{' '}
                        <strong className="font-mono text-slate-800">
                          #{att.currentQuestionIndex + 1}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#B45309] font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        ~{remainingMin} min remaining
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onResumeAttempt(att)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3A8A] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Continue Examination</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* PRIORITY 2: Start a New Practice Session */}
      <section
        data-walkthrough="home-primary-actions"
        aria-label="Start a New Practice Session"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <CrestOfExcellenceIcon size={46} className="shrink-0 mt-0.5 hidden sm:block" />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1E3A8A]">
                <span>{profile.gradeLevel}</span>
                <span>·</span>
                <span>{profile.schoolTerm}</span>
                <span>·</span>
                <span>{readyDocs.length} Curriculum Subjects Ready</span>
              </div>
              <h1 className="cbt-page-heading">
                Candidate Portal — {profile.studentName}
              </h1>
              <p className="max-w-2xl text-sm text-slate-600">
                Start a custom timed CBT examination paper across one or more subjects, or select a specific subject and weekly scope below.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('start_exam')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3A8A] transition-colors cursor-pointer"
            >
              <Play className="h-4 w-4" />
              <span>Start New Practice Session</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('subjects_lessons')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <BookOpen className="h-4 w-4 text-[#1E3A8A]" />
              <span>Lessons & Revision Deck</span>
            </button>

            {onOpenWalkthrough && (
              <button
                type="button"
                onClick={onOpenWalkthrough}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Compass className="h-4 w-4 text-[#1D4ED8]" />
                <span>Platform Walkthrough</span>
              </button>
            )}
          </div>
        </div>

        {/* Classic Daily Motivational Wisdom & Practice Reminder Bar */}
        <div className="rounded-xl border border-amber-200/80 bg-gradient-to-r from-[#FFFBEB] via-white to-indigo-50/40 px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <HeraldBellIcon size={32} className="shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                <span className="inline-flex items-center gap-1">
                  <Quote className="h-3 w-3 text-amber-600" />
                  <span>Daily Login Wisdom · {dailyQuote.theme}</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-indigo-800">
                  {streakSummary.currentStreak}d Study Streak
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm font-medium italic text-slate-900">
                &ldquo;{dailyQuote.quote}&rdquo;{' '}
                <span className="not-italic font-semibold text-slate-600">
                  — {dailyQuote.author}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setQuoteIdx((c) => c + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Next Quote</span>
            </button>
            {onOpenDailyEngagement && (
              <button
                type="button"
                onClick={onOpenDailyEngagement}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-[#1E3A8A] cursor-pointer"
              >
                <span>Daily Check-In & Alerts</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* PRIORITY 3: Select a Subject and Choose Examination Scope */}
      <section
        data-walkthrough="subject-selection-panel"
        aria-label="Select a Subject and Examination Scope"
        className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <ScholarCodexIcon size={36} className="shrink-0 hidden sm:block" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Select a Subject & Examination Scope
              </h2>
              <p className="text-xs text-slate-500">
                Choose your preferred weekly syllabus scope below, then launch practice for any Grade 7 subject.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Examination Scope Selector */}
            <div
              role="group"
              aria-label="Default Examination Scope"
              className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1"
            >
              <button
                type="button"
                onClick={() => setSelectedScopePreset('all_weeks')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  selectedScopePreset === 'all_weeks'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Full Term (Wks 1–12)
              </button>
              <button
                type="button"
                onClick={() => setSelectedScopePreset('first_half')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  selectedScopePreset === 'first_half'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                First Half (Wks 1–6)
              </button>
              <button
                type="button"
                onClick={() => setSelectedScopePreset('second_half')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  selectedScopePreset === 'second_half'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Second Half (Wks 7–12)
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={subjectQuery}
                onChange={(e) => setSubjectQuery(e.target.value)}
                placeholder="Filter 15 subjects..."
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1D4ED8] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredDocs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No subjects match "{subjectQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-2 md:divide-y-0">
              {filteredDocs.map((doc, idx) => {
                const qCount =
                  questionCountByDoc.get(doc.id) ||
                  Math.max(50, doc.passages.length * 4);
                const presetWeeks = getWeeksForPreset(doc, selectedScopePreset);
                const minWeek =
                  presetWeeks.length > 0 ? Math.min(...presetWeeks) : 1;
                const maxWeek =
                  presetWeeks.length > 0 ? Math.max(...presetWeeks) : 12;

                return (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between gap-4 p-4 hover:bg-slate-50/80 transition-colors border-b border-slate-200 ${
                      idx % 2 === 0 ? 'md:border-r' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-900">
                          {doc.subject}
                        </h3>
                        <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          Weeks {minWeek}–{maxWeek}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {presetWeeks.length} Selected Lessons ·{' '}
                        <span className="font-mono font-semibold text-slate-700">
                          {qCount}
                        </span>{' '}
                        Verified Questions
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onStartSubjectPractice) {
                            onStartSubjectPractice(doc.id, presetWeeks);
                          } else {
                            onNavigate('start_exam');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition-colors cursor-pointer"
                      >
                        <span>
                          Practise Wks {minWeek}–{maxWeek}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* PRIORITY 4: View Recent Examination Attempts & Compact Performance Summary */}
      <section
        data-walkthrough="recent-attempts-panel"
        aria-label="Recent Examination Attempts and Performance Summary"
        className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Examination Attempts & Performance Summary
            </h2>
            <p className="text-xs text-slate-500">
              Inspect your compact examination metrics, graded CBT papers, and question-by-question rationales.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
          >
            <span>Full Exam History</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Compact Academic Performance Summary Strip */}
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-[#F8FAFC] p-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
            <div className="text-xs font-medium text-slate-500">Completed Papers</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono text-lg font-bold text-slate-900">
                {completedAttempts.length}
              </span>
              <span className="text-[11px] text-slate-500">Submitted</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
            <div className="text-xs font-medium text-slate-500">Average Accuracy</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono text-lg font-bold text-slate-900">
                {avgScore !== null ? `${avgScore}%` : '—'}
              </span>
              <span className="text-[11px] text-slate-500">All Papers</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
            <div className="text-xs font-medium text-slate-500">Highest Score</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono text-lg font-bold text-slate-900">
                {bestScore !== null ? `${bestScore}%` : '—'}
              </span>
              <span className="text-[11px] text-slate-500">Personal Best</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
            <div className="text-xs font-medium text-slate-500">Subjects Practised</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono text-lg font-bold text-slate-900">
                {practisedSubjectCount} / {readyDocs.length}
              </span>
              <span className="text-[11px] text-slate-500">Grade 7</span>
            </div>
          </div>
        </div>

        {completedAttempts.length === 0 ? (
          <div className="p-8 text-center">
            <History className="mx-auto mb-2 h-7 w-7 text-slate-400" />
            <p className="text-sm font-semibold text-slate-800">
              No completed examination attempts yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Select a subject above or click "Start New Practice Session" to complete your first paper.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {completedAttempts.slice(0, 5).map((attempt) => {
              const score = attempt.result?.percentageScore ?? 0;
              const passed =
                attempt.result?.passed !== undefined
                  ? attempt.result.passed
                  : score >= 50;

              return (
                <div
                  key={attempt.id}
                  className="flex flex-col gap-3 p-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {attempt.config.title}
                      </span>
                      <span
                        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-bold uppercase ${
                          passed
                            ? 'border-emerald-200 bg-emerald-50 text-[#15803D]'
                            : 'border-red-200 bg-red-50 text-[#B91C1C]'
                        }`}
                      >
                        {passed ? 'Passed' : 'Needs Review'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700">
                        {attempt.result?.correctAnswers}/
                        {attempt.result?.totalQuestions}
                      </span>{' '}
                      correct · {attempt.config.durationMinutes} min paper ·{' '}
                      {new Date(
                        attempt.submittedAt || attempt.startedAt
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span
                      className={`font-mono text-base font-bold ${
                        score >= 75
                          ? 'text-[#15803D]'
                          : score >= 50
                          ? 'text-[#B45309]'
                          : 'text-[#B91C1C]'
                      }`}
                    >
                      {score}%
                    </span>
                    <button
                      type="button"
                      onClick={() => onInspectAttempt(attempt)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Review Answers
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* PRIORITY 5: Access Remaining Application Sections Through Navigation */}
      <section
        aria-label="Additional Platform Sections"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Additional Platform Sections
          </h2>
          <span className="text-xs text-slate-500">
            Secondary navigation & student records
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-left hover:border-[#1D4ED8] hover:bg-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BarChart3 className="h-4 w-4 shrink-0 text-[#1E3A8A]" />
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">
                  Performance Analytics
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Topic & accuracy breakdown
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('achievements')}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-left hover:border-[#1D4ED8] hover:bg-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Award className="h-4 w-4 shrink-0 text-[#1E3A8A]" />
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">
                  Achievements
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {unlockedBadgeCount} of {BADGE_DEFINITIONS.length} unlocked
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('documents')}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-left hover:border-[#1D4ED8] hover:bg-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-[#1E3A8A]" />
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">
                  Curriculum Files
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {readyDocs.length} syllabi loaded
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('question_bank')}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-left hover:border-[#1D4ED8] hover:bg-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Database className="h-4 w-4 shrink-0 text-[#1E3A8A]" />
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">
                  Question Bank
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Verified CBT items
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-left hover:border-[#1D4ED8] hover:bg-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Settings className="h-4 w-4 shrink-0 text-[#1E3A8A]" />
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">
                  Settings
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Candidate preferences
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>
        </div>
      </section>
    </div>
  );
};
