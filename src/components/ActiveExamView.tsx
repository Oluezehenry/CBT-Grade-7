import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExamAttempt, StudentProfile, StudentQuestionResponse } from '../types/cbt';
import {
  computeRemainingSeconds,
  deriveQuestionNavState,
  getTimerUrgencyInfo,
} from '../lib/cbtLogic';
import { MathText } from './MathText';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudOff,
  Eraser,
  Flag,
  Grid,
  Keyboard,
  Loader2,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';

export type AttemptSaveStatus = 'idle' | 'saving' | 'saved' | 'saved_local' | 'save_failed';

interface ActiveExamViewProps {
  attempt: ExamAttempt;
  profile: StudentProfile;
  saveStatus?: AttemptSaveStatus;
  lastSavedAt?: string;
  onSaveProgress: (
    currentQuestionIndex: number,
    responses: Record<string, StudentQuestionResponse>
  ) => Promise<boolean> | void;
  onSubmitAttempt: (trigger: 'manual' | 'timer_expired') => void;
  onPauseAndReturnHome?: () => void;
}

export const ActiveExamView: React.FC<ActiveExamViewProps> = ({
  attempt,
  profile,
  saveStatus = 'saved',
  lastSavedAt,
  onSaveProgress,
  onSubmitAttempt,
  onPauseAndReturnHome,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(() =>
    Math.max(
      0,
      Math.min(attempt.questions.length - 1, attempt.currentQuestionIndex || 0)
    )
  );
  const [responses, setResponses] = useState<Record<string, StudentQuestionResponse>>(
    () => attempt.responses || {}
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    computeRemainingSeconds(attempt.deadlineAt, Date.now())
  );
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showShortcutsLegend, setShowShortcutsLegend] = useState(false);

  const hasAutoSubmitted = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayedSecondRef = useRef<number | null>(null);

  const questions = attempt.questions;
  const currentQuestion = questions[currentIndex];

  // Sync local state if attempt ID changes (e.g., resuming a different attempt)
  useEffect(() => {
    setCurrentIndex(
      Math.max(0, Math.min(attempt.questions.length - 1, attempt.currentQuestionIndex || 0))
    );
    setResponses(attempt.responses || {});
    setRemainingSeconds(computeRemainingSeconds(attempt.deadlineAt, Date.now()));
    hasAutoSubmitted.current = false;
  }, [attempt.id, attempt.deadlineAt, attempt.questions.length]);

  const playTickSound = useCallback(
    (isCritical: boolean) => {
      if (soundMuted) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isCritical ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(isCritical ? 880 : 620, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(isCritical ? 0.05 : 0.025, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.075);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
      } catch {
        // Ignore audio context autoplay block
      }
    },
    [soundMuted]
  );

  // Mark current question as visited immediately and persist
  useEffect(() => {
    if (!currentQuestion) return;
    const existing = responses[currentQuestion.id];
    if (existing && existing.visited) return;
    const updated: Record<string, StudentQuestionResponse> = {
      ...responses,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        selectedOptionId: existing?.selectedOptionId ?? null,
        markedForReview: existing?.markedForReview ?? false,
        visited: true,
        updatedAt: new Date().toISOString(),
      },
    };
    setResponses(updated);
    onSaveProgress(currentIndex, updated);
  }, [currentIndex, currentQuestion, responses, onSaveProgress]);

  // Authoritative countdown timer from server deadlineAt
  useEffect(() => {
    const checkRemaining = () => {
      const rem = computeRemainingSeconds(attempt.deadlineAt, Date.now());
      setRemainingSeconds(rem);
      if (rem <= 0 && !hasAutoSubmitted.current) {
        hasAutoSubmitted.current = true;
        setSubmitting(true);
        onSubmitAttempt('timer_expired');
      }
    };

    checkRemaining();
    const timer = window.setInterval(checkRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [attempt.deadlineAt, onSubmitAttempt]);

  // Periodic background checkpoint save
  useEffect(() => {
    const intervalSec = Math.max(5, profile.autoSaveIntervalSeconds || 10);
    const id = window.setInterval(() => {
      onSaveProgress(currentIndex, responses);
    }, intervalSec * 1000);
    return () => window.clearInterval(id);
  }, [currentIndex, responses, profile.autoSaveIntervalSeconds, onSaveProgress]);

  const handleSelectOption = useCallback(
    (optionId: 'A' | 'B' | 'C' | 'D') => {
      if (!currentQuestion || submitting) return;
      const now = new Date().toISOString();
      const existing = responses[currentQuestion.id];
      const nextResponses: Record<string, StudentQuestionResponse> = {
        ...responses,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          selectedOptionId: optionId,
          markedForReview: existing?.markedForReview ?? false,
          visited: true,
          updatedAt: now,
        },
      };
      setResponses(nextResponses);

      const nextIdx =
        profile.autoAdvanceOnSelect && currentIndex < questions.length - 1
          ? currentIndex + 1
          : currentIndex;
      if (nextIdx !== currentIndex) {
        setCurrentIndex(nextIdx);
      }
      onSaveProgress(nextIdx, nextResponses);
    },
    [
      currentQuestion,
      submitting,
      responses,
      profile.autoAdvanceOnSelect,
      currentIndex,
      questions.length,
      onSaveProgress,
    ]
  );

  const handleClearOption = useCallback(() => {
    if (!currentQuestion || submitting) return;
    const now = new Date().toISOString();
    const existing = responses[currentQuestion.id];
    const nextResponses: Record<string, StudentQuestionResponse> = {
      ...responses,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        selectedOptionId: null,
        markedForReview: existing?.markedForReview ?? false,
        visited: true,
        updatedAt: now,
      },
    };
    setResponses(nextResponses);
    onSaveProgress(currentIndex, nextResponses);
  }, [currentQuestion, submitting, responses, currentIndex, onSaveProgress]);

  const handleToggleReview = useCallback(() => {
    if (!currentQuestion || submitting) return;
    const now = new Date().toISOString();
    const existing = responses[currentQuestion.id];
    const nextResponses: Record<string, StudentQuestionResponse> = {
      ...responses,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        selectedOptionId: existing?.selectedOptionId ?? null,
        markedForReview: !(existing?.markedForReview ?? false),
        visited: true,
        updatedAt: now,
      },
    };
    setResponses(nextResponses);
    onSaveProgress(currentIndex, nextResponses);
  }, [currentQuestion, submitting, responses, currentIndex, onSaveProgress]);

  const handleJumpToQuestion = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(questions.length - 1, idx));
      setCurrentIndex(clamped);
      setShowMobilePalette(false);
      onSaveProgress(clamped, responses);
    },
    [questions.length, onSaveProgress, responses]
  );

  // Keyboard shortcuts: A/B/C/D or 1/2/3/4, Left/Right arrows, M for Mark for Review
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showSubmitModal || submitting) return;
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      const key = e.key.toUpperCase();
      if (key === 'A' || key === '1') handleSelectOption('A');
      else if (key === 'B' || key === '2') handleSelectOption('B');
      else if (key === 'C' || key === '3') handleSelectOption('C');
      else if (key === 'D' || key === '4') handleSelectOption('D');
      else if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        handleJumpToQuestion(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        handleJumpToQuestion(currentIndex - 1);
      } else if (key === 'M') {
        handleToggleReview();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    showSubmitModal,
    submitting,
    currentIndex,
    questions.length,
    handleSelectOption,
    handleToggleReview,
    handleJumpToQuestion,
  ]);

  const timerUrgency = useMemo(
    () => getTimerUrgencyInfo(remainingSeconds, attempt.config.durationMinutes),
    [remainingSeconds, attempt.config.durationMinutes]
  );

  useEffect(() => {
    if (!profile.showTimerWarnings || soundMuted) return;
    if (!timerUrgency.shouldPlayTick || !timerUrgency.tickIntervalSeconds) return;
    if (remainingSeconds <= 0) return;

    if (
      remainingSeconds % timerUrgency.tickIntervalSeconds === 0 &&
      lastPlayedSecondRef.current !== remainingSeconds
    ) {
      lastPlayedSecondRef.current = remainingSeconds;
      playTickSound(timerUrgency.state === 'critical_1m');
    }
  }, [
    remainingSeconds,
    timerUrgency,
    profile.showTimerWarnings,
    soundMuted,
    playTickSound,
  ]);

  const formatClock = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
  };

  const stats = useMemo(() => {
    let answered = 0;
    let marked = 0;
    let visitedUnanswered = 0;
    let notVisited = 0;

    for (const q of questions) {
      const r = responses[q.id];
      const st = deriveQuestionNavState(r);
      if (r?.selectedOptionId) answered++;
      if (r?.markedForReview) marked++;
      if (st === 'visited_unanswered') visitedUnanswered++;
      if (st === 'not_visited') notVisited++;
    }

    const unansweredTotal = questions.length - answered;
    return { answered, marked, visitedUnanswered, notVisited, unansweredTotal };
  }, [questions, responses]);

  const currentResp = currentQuestion ? responses[currentQuestion.id] : undefined;

  // Honest real-time save indicator badge
  const renderSaveIndicator = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <span
            data-testid="exam-save-indicator"
            className="inline-flex items-center gap-1.5 rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
            <span>Saving…</span>
          </span>
        );
      case 'saved_local':
        return (
          <span
            data-testid="exam-save-indicator"
            className="inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-xs font-medium text-amber-200"
            title="Saved to device storage; will synchronize automatically when online"
          >
            <CloudOff className="h-3.5 w-3.5 text-amber-400" />
            <span>Saved locally — awaiting sync</span>
          </span>
        );
      case 'save_failed':
        return (
          <span
            data-testid="exam-save-indicator"
            className="inline-flex items-center gap-1.5 rounded border border-red-500/50 bg-red-950/70 px-2.5 py-1 text-xs font-medium text-red-200"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span>Save failed — retrying</span>
          </span>
        );
      default:
        return (
          <span
            data-testid="exam-save-indicator"
            className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-1 text-xs font-medium text-emerald-200"
            title={
              lastSavedAt
                ? `Last saved at ${new Date(lastSavedAt).toLocaleTimeString()}`
                : 'All responses saved'
            }
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Saved</span>
          </span>
        );
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="space-y-4 pb-12">
      {/* Sticky Official Examination Top Bar */}
      <header className="sticky top-0 z-30 rounded-xl border border-slate-800 bg-[#0F172A] px-4 py-3 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Exam Title & Progress */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 font-mono text-sm font-bold text-white">
              {currentIndex + 1}/{questions.length}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-bold text-white sm:text-base">
                  {attempt.config.title}
                </h1>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span>
                  Answered:{' '}
                  <strong className="font-mono text-white">
                    {stats.answered}/{questions.length}
                  </strong>
                </span>
                {stats.marked > 0 && (
                  <span className="text-amber-300">
                    Marked for Review: <strong className="font-mono">{stats.marked}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Save Status, Timer & Submit Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            {renderSaveIndicator()}

            {/* Authoritative Countdown Timer */}
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                timerUrgency.pulseClass
              } ${
                timerUrgency.state === 'critical_1m'
                  ? 'border-red-400 bg-[#B91C1C] text-white'
                  : timerUrgency.state === 'warning_5m' && profile.showTimerWarnings
                  ? 'border-amber-400 bg-[#B45309] text-white'
                  : 'border-slate-700 bg-slate-800/90 text-white'
              }`}
            >
              <Clock className="h-4 w-4 shrink-0" />
              <span className="cbt-timer-display">{formatClock(remainingSeconds)}</span>
              {timerUrgency.isTimeRunningOut && profile.showTimerWarnings && (
                <button
                  type="button"
                  onClick={() => setSoundMuted((m) => !m)}
                  title={soundMuted ? 'Unmute timer alert' : 'Mute timer alert'}
                  className="ml-1 rounded p-0.5 hover:bg-black/20 cursor-pointer"
                >
                  {soundMuted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMobilePalette((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 lg:hidden cursor-pointer"
            >
              <Grid className="h-4 w-4" />
              <span>Palette</span>
            </button>

            {onPauseAndReturnHome && (
              <button
                type="button"
                onClick={async () => {
                  await onSaveProgress(currentIndex, responses);
                  onPauseAndReturnHome();
                }}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                title="Save progress and return to Home screen"
              >
                <span>Save &amp; Exit</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#15803D] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit Exam</span>
            </button>
          </div>
        </div>

        {/* Clean Progress Line */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-[#38BDF8] transition-all duration-200"
            style={{
              width: `${Math.round((stats.answered / Math.max(1, questions.length)) * 100)}%`,
            }}
          />
        </div>
      </header>

      {/* Main Two-Column Examination Workspace */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left: Primary Question & Options Area (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Question Header Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center rounded-md bg-[#0F172A] px-3 py-1 font-mono text-xs font-bold text-white">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {currentQuestion.subject}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleReview}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  currentResp?.markedForReview
                    ? 'border-amber-400 bg-amber-50 text-[#B45309]'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${
                    currentResp?.markedForReview ? 'fill-[#B45309] text-[#B45309]' : ''
                  }`}
                />
                <span>
                  {currentResp?.markedForReview ? 'Marked for Review' : 'Mark for Review'}
                </span>
              </button>
            </div>

            {/* Question Stem (18–20px standard examination typography + KaTeX) */}
            <div className="py-1">
              <MathText
                as="div"
                text={currentQuestion.questionText}
                className="cbt-question-stem"
              />
            </div>

            {/* Answer Options (A–D, 16–18px standard examination typography + KaTeX) */}
            <div className="space-y-3 pt-2" role="radiogroup" aria-label={`Question ${currentIndex + 1} options`}>
              {currentQuestion.options.map((opt) => {
                const isSelected = currentResp?.selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors flex items-start gap-4 cursor-pointer ${
                      isSelected
                        ? 'border-[#1D4ED8] bg-blue-50/60'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold transition-colors ${
                        isSelected
                          ? 'bg-[#1D4ED8] text-white'
                          : 'border border-slate-300 bg-slate-100 text-slate-800'
                      }`}
                    >
                      {opt.id}
                    </span>
                    <div className="pt-0.5 flex-1 min-w-0">
                      <MathText text={opt.text} className="cbt-option-text block" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Question Navigation Bar */}
          <div className="rounded-b-xl border-t border-slate-200 bg-[#F8FAFC] px-6 py-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearOption}
                  disabled={!currentResp?.selectedOptionId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span>Clear Answer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowShortcutsLegend((s) => !s)}
                  aria-expanded={showShortcutsLegend}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    showShortcutsLegend
                      ? 'border-slate-800 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  <span>? Shortcuts</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleJumpToQuestion(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => handleJumpToQuestion(currentIndex + 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1E3A8A] transition-colors cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#15803D] px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Review & Submit</span>
                  </button>
                )}
              </div>
            </div>

            {showShortcutsLegend && (
              <div
                aria-label="Keyboard Shortcuts Legend"
                className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-700"
              >
                <span className="font-bold text-slate-900">Keyboard Shortcuts:</span>
                <span className="inline-flex items-center gap-1.5">
                  <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                    A–D
                  </kbd>
                  <span>or</span>
                  <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                    1–4
                  </kbd>
                  <span>Select Option</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                    ←
                  </kbd>
                  <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                    →
                  </kbd>
                  <span>Prev / Next Question</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                    M
                  </kbd>
                  <span>Toggle Mark for Review</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Question Palette Navigator (4 cols) */}
        <aside
          className={`lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs ${
            showMobilePalette ? 'block' : 'hidden lg:block'
          }`}
          aria-label="Question Palette"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Question Palette</h2>
            <span className="font-mono text-xs font-semibold text-slate-600">
              {stats.answered} of {questions.length} Answered
            </span>
          </div>

          {/* Legend */}
          <div className="mt-3 grid grid-cols-2 gap-2 border-b border-slate-100 pb-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-xs bg-[#15803D]" />
              <span>Answered ({stats.answered})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-xs bg-[#B45309]" />
              <span>For Review ({stats.marked})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-xs border border-slate-400 bg-slate-200" />
              <span>Skipped ({stats.visitedUnanswered})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-xs border border-slate-300 bg-white" />
              <span>Not Visited ({stats.notVisited})</span>
            </div>
          </div>

          {/* Numbered Grid */}
          <div className="mt-4 grid max-h-80 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 lg:grid-cols-5">
            {questions.map((q, idx) => {
              const r = responses[q.id];
              const navState = deriveQuestionNavState(r);
              const isCurrent = idx === currentIndex;

              let cellStyle = 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50';
              if (navState === 'marked_for_review') {
                cellStyle = 'bg-[#B45309] text-white border-[#B45309]';
              } else if (navState === 'answered') {
                cellStyle = 'bg-[#15803D] text-white border-[#15803D]';
              } else if (navState === 'visited_unanswered') {
                cellStyle = 'bg-slate-200 text-slate-800 border-slate-400';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleJumpToQuestion(idx)}
                  aria-label={`Go to Question ${idx + 1}`}
                  className={`relative h-9 rounded-lg border font-mono text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${cellStyle} ${
                    isCurrent ? 'ring-2 ring-[#0F172A] ring-offset-1' : ''
                  }`}
                >
                  {idx + 1}
                  {r?.markedForReview && r?.selectedOptionId && (
                    <span
                      className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white bg-[#15803D]"
                      title="Answered & Marked for Review"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F172A] py-2.5 text-xs font-bold text-white hover:bg-[#1E3A8A] transition-colors cursor-pointer"
            >
              <Flag className="h-3.5 w-3.5" />
              <span>Finish & Submit Examination</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Submit Examination Paper?
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Please verify your question completion summary before final submission:
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="font-mono text-xl font-bold text-[#15803D]">
                  {stats.answered}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-emerald-900">
                  Answered
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="font-mono text-xl font-bold text-slate-800">
                  {stats.unansweredTotal}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-slate-600">
                  Unanswered
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="font-mono text-xl font-bold text-[#B45309]">
                  {stats.marked}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-amber-900">
                  For Review
                </div>
              </div>
            </div>

            {stats.unansweredTotal > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#B45309] mt-0.5" />
                <span>
                  You still have <strong>{stats.unansweredTotal} unanswered</strong>{' '}
                  {stats.unansweredTotal === 1 ? 'question' : 'questions'}. Unanswered items score 0 marks.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitting(true);
                  onSubmitAttempt('manual');
                }}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#15803D] px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{submitting ? 'Grading Paper…' : 'Confirm & Submit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
