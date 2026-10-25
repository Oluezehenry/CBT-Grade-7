import React, { useEffect, useState } from 'react';
import {
  DEMO_PRACTICE_QUESTIONS,
  STUDENT_WALKTHROUGH_STEPS,
  WalkthroughState,
  simulateWeekScopeQuestionPool,
} from '../lib/walkthroughLogic';
import { MainNavSection } from '../types/cbt';
import { MathText } from './MathText';
import { BadgeArtwork } from './BadgeArtwork';
import {
  AstrolabeTargetIcon,
  ChronometerKeyIcon,
  CrestOfExcellenceIcon,
  EternalFlameMedallionIcon,
  HeraldBellIcon,
  RoyalTranscriptSealIcon,
  ScholarCodexIcon,
  SovereignAegisIcon,
} from './ClassicAcademicIcons';
import {
  dispatchSystemAndPlatformNotification,
  getDailyMotivationalQuote,
  playMilestoneCelebrationFanfare,
  requestDeviceNotificationPermission,
} from '../lib/dailyEngagementLogic';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BellRing,
  CheckCircle2,
  Clock,
  Flag,
  Flame,
  Printer,
  Quote,
  Sparkles,
  Target,
  Volume2,
  X,
} from 'lucide-react';

export interface StudentWalkthroughProps {
  isOpen: boolean;
  activeStepIndex?: number;
  walkthroughState: WalkthroughState;
  onSelectStep?: (idx: number) => void;
  onUpdateState?: (next: WalkthroughState) => void;
  onCompleteStep?: (stepId: string) => void;
  onCompleteAll?: () => void;
  onNavigate?: (nav: MainNavSection) => void;
  onNavigateToFeature?: (dest: any) => void;
  onClose: () => void;
}

export const StudentWalkthrough: React.FC<StudentWalkthroughProps> = ({
  isOpen,
  activeStepIndex,
  walkthroughState,
  onSelectStep,
  onUpdateState,
  onCompleteStep,
  onCompleteAll,
  onNavigate,
  onNavigateToFeature,
  onClose,
}) => {
  const [internalStepIdx, setInternalStepIdx] = useState<number>(
    activeStepIndex ?? walkthroughState.lastStepIndex ?? 0
  );
  const currentIdx =
    typeof activeStepIndex === 'number' ? activeStepIndex : internalStepIdx;

  // Interactive sandbox states inside the tour
  const [simSubjects] = useState(1);
  const [simWeeks, setSimWeeks] = useState(6);
  const [simStrategy, setSimStrategy] = useState<
    'random_all' | 'random_selected_weeks' | 'weak_areas'
  >('weak_areas');

  const [demoQuestionIdx, setDemoQuestionIdx] = useState(0);
  const [selectedDemoOption, setSelectedDemoOption] = useState<
    'A' | 'B' | 'C' | 'D' | null
  >(null);
  const [markedDemoReview, setMarkedDemoReview] = useState(false);
  const [demoDeckMastered, setDemoDeckMastered] = useState(false);
  const [demoQuoteIdx, setDemoQuoteIdx] = useState(0);
  const [demoNotificationSent, setDemoNotificationSent] = useState(false);

  // Target element spotlight rect when visible on page
  const [spotlightRect, setSpotlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const step =
    STUDENT_WALKTHROUGH_STEPS[
      Math.max(0, Math.min(STUDENT_WALKTHROUGH_STEPS.length - 1, currentIdx))
    ];

  useEffect(() => {
    if (!isOpen || !step?.targetSelector) {
      setSpotlightRect(null);
      return;
    }

    const updateRect = () => {
      try {
        const el = document.querySelector(step.targetSelector!) as HTMLElement | null;
        if (!el) {
          setSpotlightRect(null);
          return;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSpotlightRect({
            top: Math.max(8, rect.top - 6),
            left: Math.max(8, rect.left - 6),
            width: Math.min(window.innerWidth - 16, rect.width + 12),
            height: rect.height + 12,
          });
        } else {
          setSpotlightRect(null);
        }
      } catch {
        setSpotlightRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, step]);

  // Live Keyboard Shortcut Demo Listener during Step 4 (exam_interface_sandbox)
  useEffect(() => {
    if (!isOpen || step?.interactiveType !== 'exam_interface_sandbox') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const upper = e.key.toUpperCase();
      if (upper === 'A' || upper === '1') setSelectedDemoOption('A');
      else if (upper === 'B' || upper === '2') setSelectedDemoOption('B');
      else if (upper === 'C' || upper === '3') setSelectedDemoOption('C');
      else if (upper === 'D' || upper === '4') setSelectedDemoOption('D');
      else if (upper === 'F') setMarkedDemoReview((m) => !m);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step?.interactiveType]);

  if (!isOpen || !step) return null;

  const setStepIndex = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(STUDENT_WALKTHROUGH_STEPS.length - 1, nextIdx));
    setInternalStepIdx(clamped);
    onSelectStep?.(clamped);
  };

  const recordStepComplete = (stepId: string, nextIdx: number) => {
    onCompleteStep?.(stepId);
    if (onUpdateState) {
      const existing = new Set(walkthroughState.completedStepIds);
      existing.add(stepId);
      onUpdateState({
        ...walkthroughState,
        hasSeenIntro: true,
        completedStepIds: Array.from(existing),
        lastStepIndex: nextIdx,
      });
    }
  };

  const handleNext = () => {
    recordStepComplete(step.id, Math.min(STUDENT_WALKTHROUGH_STEPS.length - 1, currentIdx + 1));
    if (currentIdx < STUDENT_WALKTHROUGH_STEPS.length - 1) {
      setStepIndex(currentIdx + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setStepIndex(currentIdx - 1);
    }
  };

  const handleFinish = () => {
    onCompleteAll?.();
    if (onUpdateState) {
      onUpdateState({
        hasSeenIntro: true,
        completedStepIds: STUDENT_WALKTHROUGH_STEPS.map((s) => s.id),
        lastStepIndex: STUDENT_WALKTHROUGH_STEPS.length - 1,
        completedAt: new Date().toISOString(),
      });
    }
    onClose();
  };

  const handleGoToSection = (target: MainNavSection) => {
    recordStepComplete(step.id, currentIdx);
    if (onNavigate) onNavigate(target);
    else if (onNavigateToFeature) onNavigateToFeature(target);
    onClose();
  };

  const renderStepEmblem = (interactiveType: string, size = 44) => {
    switch (interactiveType) {
      case 'welcome_overview':
        return <CrestOfExcellenceIcon size={size} />;
      case 'subject_selector':
        return <ScholarCodexIcon size={size} />;
      case 'week_scope_simulator':
        return <AstrolabeTargetIcon size={size} />;
      case 'exam_interface_sandbox':
        return <ChronometerKeyIcon size={size} />;
      case 'results_review_preview':
        return <RoyalTranscriptSealIcon size={size} />;
      case 'session_recovery_demo':
        return <SovereignAegisIcon size={size} />;
      case 'achievements_preview':
        return <EternalFlameMedallionIcon size={size} />;
      default:
        return <CrestOfExcellenceIcon size={size} />;
    }
  };

  const simResult = simulateWeekScopeQuestionPool(simSubjects, simWeeks, simStrategy);
  const demoQ = DEMO_PRACTICE_QUESTIONS[demoQuestionIdx];
  const sampleQuote = getDailyMotivationalQuote( undefined, demoQuoteIdx);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-step-title"
    >
      {/* Spotlight frame around visible target UI element */}
      {spotlightRect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-40 rounded-xl border-2 border-[#38BDF8] shadow-[0_0_0_4px_rgba(29,78,216,0.25)] transition-all duration-200 hidden lg:block"
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`,
          }}
        />
      )}

      <div className="relative z-50 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Classic Gilded Academic Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] px-5 sm:px-6 py-4 text-white">
          <div className="flex items-center gap-3.5">
            <div className="shrink-0 drop-shadow-md">
              {renderStepEmblem(step.interactiveType, 44)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  data-testid="walkthrough-step-indicator"
                  className="rounded-md bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-200"
                >
                  Step {step.stepNumber} of {STUDENT_WALKTHROUGH_STEPS.length}
                </span>
                <span className="text-xs font-semibold tracking-wide text-slate-300">
                  Interactive Scholar Walkthrough
                </span>
              </div>
              <h2 id="walkthrough-step-title" className="mt-0.5 text-base sm:text-lg font-bold text-white">
                {step.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              Skip Tour
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close walkthrough"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stepper Navigation Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-[#F8FAFC] px-5 sm:px-6 py-2.5">
          {STUDENT_WALKTHROUGH_STEPS.map((s, idx) => {
            const isCurrent = idx === currentIdx;
            const isDone = walkthroughState.completedStepIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIndex(idx)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#0F172A] text-amber-300 shadow-xs ring-1 ring-amber-400/40'
                    : isDone
                    ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="font-mono">{s.stepNumber}.</span>
                <span>{s.title.replace(/^Welcome to ScholarCBT$/, 'Welcome')}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
              {step.subtitle}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
              {step.description}
            </p>
          </div>

          {/* Key Takeaways */}
          <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Key Capabilities & Workflow
            </div>
            <ul className="space-y-2">
              {step.keyTakeaways.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step 1: Welcome, Daily Streak & Automatic Login Motivational Quote Demo */}
          {step.interactiveType === 'welcome_overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <ScholarCodexIcon size={28} />
                    <span className="text-xs font-bold text-[#0F172A]">15 School Subjects</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Mathematics, Basic Science, English, Civic Education, Music, PHE, and more.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <EternalFlameMedallionIcon size={28} />
                    <span className="text-xs font-bold text-[#0F172A]">Daily Study Streak</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Check in daily and complete practice papers to build consecutive study streaks.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <HeraldBellIcon size={28} />
                    <span className="text-xs font-bold text-[#0F172A]">Auto Login Quotes</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Every login delivers a fresh motivational quote and daily OS practice reminder.
                  </p>
                </div>
              </div>

              {/* Interactive Daily Login Quote Preview */}
              <div className="rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 via-white to-indigo-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    <Quote className="h-3.5 w-3.5 text-amber-600" />
                    <span>Automatic Login Wisdom Preview · {sampleQuote.theme}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium italic text-slate-900">
                    &ldquo;{sampleQuote.quote}&rdquo;
                  </p>
                  <div className="text-[11px] text-slate-600">
                    — <strong>{sampleQuote.author}</strong>, {sampleQuote.role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDemoQuoteIdx((c) => c + 1)}
                  className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                >
                  Inspire Me Again →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Subjects & Personal Revision Deck Interactive Preview */}
          {step.interactiveType === 'subject_selector' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ScholarCodexIcon size={28} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Subject Pool & Personal Revision Deck Demo
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGoToSection('subjects_lessons')}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  Open Subjects & Revision Deck →
                </button>
              </div>

              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {[
                  { subject: 'Mathematics', weeks: 'Weeks 1–10', questions: 100 },
                  { subject: 'Basic Science', weeks: 'Weeks 1–11', questions: 100 },
                  { subject: 'English Studies', weeks: 'Weeks 1–10', questions: 100 },
                ].map((row) => (
                  <div
                    key={row.subject}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{row.subject}</span>
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                        {row.weeks}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-slate-700">
                      {row.questions} Verified MCQs
                    </span>
                  </div>
                ))}
              </div>

              {/* Interactive Personal Revision Deck Card Sandbox */}
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-indigo-950">
                    Try the Personal Revision Deck (&ldquo;Mark as Mastered&rdquo;)
                  </div>
                  <p className="text-slate-600">
                    Missed questions from your exams automatically collect in your Revision Deck with their correct answer and lesson explanation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDemoDeckMastered((m) => !m)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                    demoDeckMastered
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-indigo-300 text-indigo-900 hover:bg-indigo-100'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{demoDeckMastered ? 'Mastered! (Click to Undo)' : 'Mark as Mastered'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Exam Scope & 1-Click Weak-Topic Revision Simulator */}
          {step.interactiveType === 'week_scope_simulator' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AstrolabeTargetIcon size={28} />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
                    Interactive Scope & Weak-Topic Simulator
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-600">
                  Pool: <strong>{simResult.availablePoolCount}</strong> questions · Avg{' '}
                  <strong>{simResult.questionsPerWeekAvg}</strong>/week
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Weeks Selected ({simWeeks} Weeks)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={simWeeks}
                    onChange={(e) => setSimWeeks(Number(e.target.value))}
                    className="w-full accent-[#1D4ED8] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selection Strategy
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'weak_areas', label: 'Targeted Weak Areas' },
                        { id: 'random_selected_weeks', label: 'Selected Weeks' },
                        { id: 'random_all', label: 'Full Term' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSimStrategy(m.id)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          simStrategy === m.id
                            ? 'bg-[#0F172A] text-amber-300'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-700 bg-amber-50/70 p-3 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>{simResult.strategySummary}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGoToSection('start_exam')}
                  className="shrink-0 font-bold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  Configure Exam →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Active CBT & Keyboard Shortcuts Live Sandbox */}
          {step.interactiveType === 'exam_interface_sandbox' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <ChronometerKeyIcon size={28} />
                  <span className="rounded bg-[#0F172A] px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                    Try Live Shortcuts: Press A–D or F
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {demoQ.subject} (Week {demoQ.weekNumber})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMarkedDemoReview((m) => !m)}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold cursor-pointer ${
                      markedDemoReview
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Flag className="h-3 w-3" />
                    <span>{markedDemoReview ? 'Flagged (F)' : 'Flag (F)'}</span>
                  </button>
                  {DEMO_PRACTICE_QUESTIONS.map((q, i) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setDemoQuestionIdx(i);
                        setSelectedDemoOption(null);
                      }}
                      className={`rounded px-2 py-0.5 text-xs font-semibold cursor-pointer ${
                        demoQuestionIdx === i
                          ? 'bg-[#1D4ED8] text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {q.subject.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="py-1">
                <MathText text={demoQ.questionText} className="text-sm font-medium text-slate-900" />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {demoQ.options.map((opt) => {
                  const isSel = selectedDemoOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedDemoOption(opt.id)}
                      className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left text-xs transition-colors cursor-pointer ${
                        isSel
                          ? 'border-[#1D4ED8] bg-blue-50/70 font-semibold text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold ${
                          isSel ? 'bg-[#1D4ED8] text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <MathText text={opt.text} className="leading-snug" />
                    </button>
                  );
                })}
              </div>

              {selectedDemoOption && (
                <div
                  className={`rounded-lg border p-3 text-xs ${
                    selectedDemoOption === demoQ.correctOptionId
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                      : 'border-amber-200 bg-amber-50 text-amber-950'
                  }`}
                >
                  <strong>
                    {selectedDemoOption === demoQ.correctOptionId
                      ? 'Correct!'
                      : `Option ${demoQ.correctOptionId} is the verified answer:`}
                  </strong>{' '}
                  <MathText text={demoQ.explanation} />
                </div>
              )}
            </div>
          )}

          {/* Step 5: Official Result Slip, WAEC Grade Letters & Term Report Card Preview */}
          {step.interactiveType === 'results_review_preview' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RoyalTranscriptSealIcon size={30} />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Official Result Slip & Term Report Card Preview
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Zero fake history—your transcript updates exclusively as you complete real exams
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 border border-emerald-300 px-2.5 py-1 font-mono text-xs font-bold text-emerald-900">
                  Grade A1 · Distinction (88%)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Printer className="h-3.5 w-3.5 text-[#1D4ED8]" />
                    <span>Printable Result Slip</span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    Print or save a clean PDF examination slip with candidate details and weekly breakdown.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-amber-600" />
                    <span>Term Report Card</span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    Cumulative subject-by-subject report card with A1–F9 letter grades in Performance Analytics.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-rose-600" />
                    <span>1-Click Weak Weeks</span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    Immediately re-practise any instructional weeks where your score dipped below 70%.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Session Auto-Recovery Demo */}
          {step.interactiveType === 'session_recovery_demo' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <SovereignAegisIcon size={28} />
                <span>Real-Time Save Status Indicators During an Active Exam</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#15803D]" />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">Saved</div>
                    <div className="text-slate-600">
                      Confirmed on both the server and local device storage.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <Clock className="h-4 w-4 shrink-0 text-[#B45309]" />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">Saved locally — awaiting sync</div>
                    <div className="text-slate-600">
                      Stored safely in IndexedDB when offline; syncs automatically on reconnect.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Collectible Badges, Milestone Sound Fanfare & Device System Notifications */}
          {step.interactiveType === 'achievements_preview' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <BadgeArtwork
                    badgeId="perfect_grade"
                    rarity="Legendary"
                    unlocked={true}
                    size="md"
                  />
                  <BadgeArtwork
                    badgeId="subject_specialist"
                    rarity="Rare"
                    unlocked={true}
                    size="md"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">
                      20 Collectible Academic Emblems & Milestone Fanfare
                    </div>
                    <p className="mt-0.5 text-slate-600">
                      Filter by 7 categories and 5 rarity tiers, plus celebrate milestones with Web Audio fanfare and OS notifications.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleGoToSection('achievements')}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  <Award className="h-4 w-4 text-[#1E3A8A]" />
                  <span>Open Achievements</span>
                </button>
              </div>

              {/* Interactive Fanfare & System Notification Test Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => playMilestoneCelebrationFanfare('Legendary')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Play Milestone Fanfare</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await requestDeviceNotificationPermission();
                      await dispatchSystemAndPlatformNotification({
                        title: 'ScholarCBT · Daily Practice & Quote Active',
                        body: `"${sampleQuote.quote}" — ${sampleQuote.author}`,
                        tag: 'scholarcbt-walkthrough-demo',
                      });
                      setDemoNotificationSent(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E3A8A] px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                  >
                    <BellRing className="h-3.5 w-3.5 text-amber-300" />
                    <span>
                      {demoNotificationSent
                        ? 'System Notification Sent!'
                        : 'Activate & Test System Notification'}
                    </span>
                  </button>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Zero exam interruption guaranteed</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls: Back, Skip, Next / Finish */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-[#F8FAFC] px-5 sm:px-6 py-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIdx === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            {currentIdx < STUDENT_WALKTHROUGH_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-5 py-2 text-xs font-bold text-white hover:bg-[#1E3A8A] transition-colors cursor-pointer"
              >
                <span>Next Step</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#15803D] px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Finish Walkthrough</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudentWalkthroughModal = StudentWalkthrough;
