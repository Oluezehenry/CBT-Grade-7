import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Play,
  Sliders,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import {
  DifficultyLevel,
  DocumentWeekSelection,
  ExamAttempt,
  OfflineSubjectReserve,
  StudentProfile,
  StudyDocument,
  ValidatedQuestion,
} from '../types/cbt';
import {
  calculateSourceCapacity,
  filterPassagesBySelection,
  getTargetCognitiveDistribution,
} from '../lib/cbtLogic';
import {
  createOfflineExamAttemptFromReserve,
  getAllOfflineSubjectReserves,
  saveOfflineSubjectReserve,
} from '../lib/offlineEngine';

interface ExamConfigWizardProps {
  documents: StudyDocument[];
  profile: StudentProfile;
  preselectedDocId?: string | null;
  preselectedWeeks?: number[] | null;
  onExamStarted: (attempt: ExamAttempt, offlineAnswerKey?: ValidatedQuestion[]) => void;
  onCancel: () => void;
}

const STEP_LABELS = [
  '1. Subjects & Mode',
  '2. Week Coverage',
  '3. Question Count',
  '4. Duration',
  '5. Cognitive Difficulty',
  '6. Review & Generate',
];

export const ExamConfigWizard: React.FC<ExamConfigWizardProps> = ({
  documents,
  profile,
  preselectedDocId,
  preselectedWeeks,
  onExamStarted,
  onCancel,
}) => {
  const [step, setStep] = useState<number>(1);
  const [coverageMode, setCoverageMode] = useState<'full_subject' | 'targeted'>(() => {
    if (preselectedDocId && preselectedWeeks && preselectedWeeks.length > 0) {
      const targetDoc = documents.find((d) => d.id === preselectedDocId);
      if (targetDoc && preselectedWeeks.length < targetDoc.weeks.length) {
        return 'targeted';
      }
    }
    return profile.examCoverageMode || 'full_subject';
  });

  // Initialize selections: if preselectedDocId is passed, select it; otherwise select first document by default
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() => {
    if (preselectedDocId && documents.some((d) => d.id === preselectedDocId)) {
      return [preselectedDocId];
    }
    return documents.slice(0, 1).map((d) => d.id);
  });

  // Independent week selections per documentId
  const [weeksByDocId, setWeeksByDocId] = useState<Record<string, number[]>>(() => {
    const initial: Record<string, number[]> = {};
    for (const d of documents) {
      if (
        preselectedDocId === d.id &&
        preselectedWeeks &&
        preselectedWeeks.length > 0
      ) {
        initial[d.id] = [...preselectedWeeks];
      } else {
        initial[d.id] = d.weeks.map((w) => w.weekNumber);
      }
    }
    return initial;
  });

  const [questionCount, setQuestionCount] = useState<number>(
    profile.defaultQuestionCount || 50
  );
  const [customCountInput, setCustomCountInput] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<15 | 30 | 45 | 60 | 75 | 90 | 120>(
    profile.defaultDurationMinutes || 60
  );
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    profile.defaultDifficulty || 'High difficulty'
  );
  const [examTitle, setExamTitle] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Offline reserves state
  const [offlineReserves, setOfflineReserves] = useState<OfflineSubjectReserve[]>([]);
  const [isDownloadingReserve, setIsDownloadingReserve] = useState<boolean>(false);
  const [reserveNotice, setReserveNotice] = useState<string | null>(null);

  useEffect(() => {
    getAllOfflineSubjectReserves().then(setOfflineReserves);
  }, []);

  useEffect(() => {
    setWeeksByDocId((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const d of documents) {
        if (!next[d.id] || next[d.id].length === 0) {
          next[d.id] = d.weeks.map((w) => w.weekNumber);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    if (preselectedDocId && documents.some((d) => d.id === preselectedDocId)) {
      setSelectedDocIds([preselectedDocId]);
    }
  }, [documents, preselectedDocId]);

  const handleDownloadOfflineReserves = async () => {
    setIsDownloadingReserve(true);
    setReserveNotice(null);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/offline/reserve?count=${profile.offlineReserveSize || 60}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to download offline question reserve.');
      }
      const list = (data.reserves || []) as OfflineSubjectReserve[];
      for (const item of list) {
        await saveOfflineSubjectReserve(item);
      }
      const updated = await getAllOfflineSubjectReserves();
      setOfflineReserves(updated);
      setReserveNotice(
        `Downloaded offline reserve for ${list.length} subject(s) (${list.reduce(
          (acc, r) => acc + r.questionCount,
          0
        )} validated questions saved on device).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not download offline reserve while disconnected.'
      );
    } finally {
      setIsDownloadingReserve(false);
    }
  };

  const handleStartOfflineReserveExam = async (subjectName: string) => {
    setErrorMsg(null);
    setIsGenerating(true);
    try {
      const { attempt, answerKey } = await createOfflineExamAttemptFromReserve({
        subject: subjectName,
        questionCount,
        durationMinutes,
        difficulty,
        profile,
      });
      onExamStarted(attempt, answerKey);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to start offline practice exam.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const groupedBySubject = useMemo(() => {
    const map = new Map<string, StudyDocument[]>();
    for (const d of documents) {
      const list = map.get(d.subject) || [];
      list.push(d);
      map.set(d.subject, list);
    }
    return Array.from(map.entries());
  }, [documents]);

  const activeSelections: DocumentWeekSelection[] = useMemo(() => {
    const list: DocumentWeekSelection[] = [];
    for (const docId of selectedDocIds) {
      const doc = documents.find((d) => d.id === docId);
      if (!doc) continue;
      const availableWkNums = new Set(doc.weeks.map((w) => w.weekNumber));
      const chosenWeeks = (
        weeksByDocId[docId] && weeksByDocId[docId].length > 0
          ? weeksByDocId[docId]
          : doc.weeks.map((w) => w.weekNumber)
      ).filter((w) => availableWkNums.has(w));
      if (chosenWeeks.length > 0) {
        list.push({
          documentId: doc.id,
          subject: doc.subject,
          documentTitle: doc.title,
          selectedWeeks: chosenWeeks.sort((a, b) => a - b),
        });
      }
    }
    return list;
  }, [selectedDocIds, weeksByDocId, documents]);

  const selectedPassages = useMemo(
    () => filterPassagesBySelection(documents, activeSelections),
    [documents, activeSelections]
  );

  const capacity = useMemo(
    () => calculateSourceCapacity(selectedPassages),
    [selectedPassages]
  );

  const cognitiveTargets = useMemo(
    () => getTargetCognitiveDistribution(questionCount),
    [questionCount]
  );

  const toggleDocument = (doc: StudyDocument) => {
    setErrorMsg(null);
    setSelectedDocIds((prev) => {
      if (prev.includes(doc.id)) {
        return prev.filter((id) => id !== doc.id);
      }
      if (!weeksByDocId[doc.id] || weeksByDocId[doc.id].length === 0) {
        setWeeksByDocId((wPrev) => ({
          ...wPrev,
          [doc.id]: doc.weeks.map((w) => w.weekNumber),
        }));
      }
      return [...prev, doc.id];
    });
  };

  const toggleWeekForDoc = (docId: string, weekNumber: number) => {
    setErrorMsg(null);
    setCoverageMode('targeted');
    setWeeksByDocId((prev) => {
      const current = prev[docId] || [];
      const next = current.includes(weekNumber)
        ? current.filter((w) => w !== weekNumber)
        : [...current, weekNumber].sort((a, b) => a - b);
      return { ...prev, [docId]: next };
    });
  };

  const selectAllWeeksForDoc = (doc: StudyDocument) => {
    setWeeksByDocId((prev) => ({
      ...prev,
      [doc.id]: doc.weeks.map((w) => w.weekNumber),
    }));
  };

  const canProceedFromCurrentStep = (): boolean => {
    if (step === 1) return selectedDocIds.length > 0;
    if (step === 2) return activeSelections.length > 0;
    if (step === 3) {
      return (
        questionCount >= 10 &&
        questionCount <= 120 &&
        capacity.maxSupportedQuestions >= questionCount
      );
    }
    return true;
  };

  const handleGenerateExam = async () => {
    setErrorMsg(null);
    if (activeSelections.length === 0) {
      setErrorMsg('Please select at least one subject document and weekly lesson.');
      return;
    }
    if (questionCount < 10) {
      setErrorMsg('Minimum examination count is 10 questions.');
      return;
    }
    if (capacity.maxSupportedQuestions < questionCount) {
      setErrorMsg(
        `Selected source material supports up to ${capacity.maxSupportedQuestions} validated questions without fabricating content. Please reduce the question count to ${capacity.maxSupportedQuestions} or select additional weeks.`
      );
      return;
    }

    setIsGenerating(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('scholarcbt_session_token') || ''
          : '';
      const response = await fetch('/api/exams/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          studentId: profile.id,
          title: examTitle.trim(),
          selections: activeSelections,
          questionCount,
          durationMinutes,
          difficulty,
          coverageMode,
          marksPerQuestion: profile.marksPerQuestion ?? 1,
          negativeMarkingPenalty: profile.negativeMarkingPenalty ?? 0,
          passMarkPercentage: profile.passMarkPercentage ?? 50,
          shuffleQuestions: profile.shuffleQuestions ?? true,
          shuffleOptions: profile.shuffleOptions ?? true,
          allowAnswerChange: profile.allowAnswerChange ?? true,
          navigationMode: profile.navigationMode ?? 'free',
          timeoutBehaviour: profile.timeoutBehaviour ?? 'auto_submit',
          enablePostExamReview: profile.enablePostExamReview ?? true,
          enableSourceDisclosure: profile.enableSourceDisclosure ?? true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate examination.');
      }
      onExamStarted(data.attempt);
    } catch (err: unknown) {
      // If offline and an offline reserve exists for the first selected subject, offer/fallback cleanly
      const firstSubj = activeSelections[0]?.subject;
      const hasOfflineReserve = offlineReserves.some(
        (r) => r.subject.toLowerCase() === (firstSubj || '').toLowerCase()
      );
      if (hasOfflineReserve && firstSubj && typeof navigator !== 'undefined' && !navigator.onLine) {
        await handleStartOfflineReserveExam(firstSubj);
        return;
      }
      setErrorMsg(
        err instanceof Error ? err.message : 'Error generating examination.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const secondsPerQuestion = Math.round((durationMinutes * 60) / questionCount);
  const isTightDuration = secondsPerQuestion < 40;

  return (
    <div className="space-y-6">
      {/* Header + Mobile-Friendly Direct Generate Bar */}
      <div
        data-walkthrough="launch-exam-summary"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <h1 className="cbt-page-heading">
            Configure Grade 7 CBT Examination
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Full-subject random coverage across all weeks (default) or targeted weekly assessment.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeSelections.length > 0 && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateExam}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#0F172A] hover:bg-[#1E3A8A] disabled:opacity-50 rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin shrink-0" />
                  <span>Generating {questionCount} Questions...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>Generate {questionCount} Questions</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Offline Practice Reserve Bar */}
      <div className="p-4 bg-[#0F172A] text-white rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline Practice Question Reserve (IndexedDB)</span>
          </div>
          <p className="text-xs text-slate-300">
            {offlineReserves.length > 0
              ? `Ready for offline practice: ${offlineReserves
                  .map((r) => `${r.subject} (${r.questionCount} Qs)`)
                  .join(' · ')}`
              : 'Download a validated question reserve per subject to take practice examinations without internet connectivity.'}
          </p>
          {reserveNotice && (
            <p className="text-xs text-emerald-400 font-semibold">{reserveNotice}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isDownloadingReserve}
            onClick={handleDownloadOfflineReserves}
            className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/15 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isDownloadingReserve ? 'Saving Reserve...' : 'Download Offline Reserve'}
            </span>
          </button>
          {offlineReserves.map((resv) => (
            <button
              key={resv.subject}
              type="button"
              disabled={isGenerating}
              onClick={() => handleStartOfflineReserveExam(resv.subject)}
              className="px-3 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Practice {resv.subject} Offline</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6-Step Progress Bar */}
      <div
        data-walkthrough="exam-coverage-selector"
        className="bg-white rounded-xl border border-slate-200 p-4"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const isCurrent = step === stepNum;
            const isCompleted = step > stepNum;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (stepNum < step || canProceedFromCurrentStep()) {
                    setStep(stepNum);
                  }
                }}
                className={`px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  isCurrent
                    ? 'bg-[#0F172A] text-white'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{label}</span>
                {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {capacity.maxSupportedQuestions > 0 &&
            capacity.maxSupportedQuestions < questionCount && (
              <button
                type="button"
                onClick={() => {
                  setQuestionCount(capacity.maxSupportedQuestions);
                  setCustomCountInput(String(capacity.maxSupportedQuestions));
                  setErrorMsg(null);
                }}
                className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
              >
                Use Supported Set ({capacity.maxSupportedQuestions} Qs)
              </button>
            )}
        </div>
      )}

      {/* Step Content Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-6">
        {/* STEP 1: SELECT SUBJECTS, DOCUMENTS & COVERAGE MODE */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Step 1: Select Subject(s) & Examination Coverage Mode
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a subject and choose which weeks (Week 1 to the end of the term) you want questions from in your practice exam.
                </p>
              </div>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 self-start">
                <button
                  type="button"
                  onClick={() => {
                    setCoverageMode('full_subject');
                    const all: Record<string, number[]> = {};
                    for (const d of documents) {
                      all[d.id] = d.weeks.map((w) => w.weekNumber);
                    }
                    setWeeksByDocId(all);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    coverageMode === 'full_subject'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  All Weeks (Full Term)
                </button>
                <button
                  type="button"
                  onClick={() => setCoverageMode('targeted')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    coverageMode === 'targeted'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Custom Weeks Selection
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {groupedBySubject.map(([subjName, subjDocs]) => (
                <div key={subjName} className="space-y-3">
                  <div className="text-xs font-bold text-indigo-700 border-b border-slate-200 pb-1.5">
                    {subjName} ({subjDocs.length} document
                    {subjDocs.length === 1 ? '' : 's'})
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {subjDocs.map((doc) => {
                      const isChecked = selectedDocIds.includes(doc.id);
                      const isDisabled =
                        doc.processingStatus === 'error' || doc.weeks.length === 0;
                      const chosenWeeks = weeksByDocId[doc.id] || doc.weeks.map((w) => w.weekNumber);
                      return (
                        <div
                          key={doc.id}
                          className={`p-4 rounded-xl border transition-colors space-y-3 ${
                            isDisabled
                              ? 'bg-slate-50 border-slate-200 opacity-50'
                              : isChecked
                              ? 'bg-indigo-50/40 border-indigo-600'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <label className="flex items-start gap-3.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isDisabled}
                              onChange={() => toggleDocument(doc)}
                              className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                            />
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="text-sm font-bold text-slate-900">
                                {doc.title}
                              </div>
                              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                                <span>{doc.fileType}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  Weeks 1–{doc.weeks[doc.weeks.length - 1]?.weekNumber || doc.weeks.length} ({doc.weeks.length} weeks)
                                </span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={
                                    doc.processingStatus === 'ready'
                                      ? 'text-emerald-700 font-semibold'
                                      : 'text-amber-700 font-semibold'
                                  }
                                >
                                  {doc.processingStatus === 'ready'
                                    ? 'Verified'
                                    : 'Needs Review'}
                                </span>
                              </div>
                            </div>
                          </label>

                          {isChecked && (
                            <div className="pt-2.5 border-t border-indigo-200/70 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-indigo-950">
                                  Select Weeks to Include in Quiz ({chosenWeeks.length} of {doc.weeks.length} selected):
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCoverageMode('full_subject');
                                      selectAllWeeksForDoc(doc);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded cursor-pointer"
                                  >
                                    All Weeks (1–{doc.weeks[doc.weeks.length - 1]?.weekNumber || doc.weeks.length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCoverageMode('targeted');
                                      setWeeksByDocId((prev) => ({
                                        ...prev,
                                        [doc.id]: [doc.weeks[0]?.weekNumber || 1],
                                      }));
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded cursor-pointer"
                                  >
                                    Week 1 Only
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {doc.weeks.map((wk) => {
                                  const isWkSelected = chosenWeeks.includes(wk.weekNumber);
                                  return (
                                    <button
                                      key={wk.id}
                                      type="button"
                                      title={`Week ${wk.weekNumber}: ${wk.lessonTitle}`}
                                      onClick={() => toggleWeekForDoc(doc.id, wk.weekNumber)}
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                                        isWkSelected
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span className="font-mono font-bold">Wk {wk.weekNumber}</span>
                                      <span className={`truncate max-w-[140px] text-[11px] ${isWkSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                                        {wk.lessonTitle.replace(/^Week\s+\d+[:\s-]*/i, '')}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: SELECT WEEKS INDEPENDENTLY */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Step 2: Weekly Topic Coverage ({coverageMode === 'full_subject' ? 'Full-Subject Random Coverage' : 'Targeted Week Selection'})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {coverageMode === 'full_subject'
                    ? 'All available weeks from Week 1 to the end of the term are included by default. Toggle any week below to customize your weekly practice quiz.'
                    : 'Questions will be generated strictly from the weeks checked below.'}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {selectedDocIds.map((docId) => {
                const doc = documents.find((d) => d.id === docId);
                if (!doc) return null;
                const chosenWeeks = weeksByDocId[doc.id] || [];
                return (
                  <div
                    key={doc.id}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-indigo-700">
                          {doc.subject}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {doc.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectAllWeeksForDoc(doc)}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md cursor-pointer"
                        >
                          Select All ({doc.weeks.length}) Weeks
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setWeeksByDocId((prev) => ({ ...prev, [doc.id]: [doc.weeks[0]?.weekNumber || 1] }))
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          Week 1 Only
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {doc.weeks.map((wk) => {
                        const isSelected = chosenWeeks.includes(wk.weekNumber);
                        return (
                          <label
                            key={wk.id}
                            className={`p-3.5 rounded-lg border transition-colors flex items-start gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-white border-indigo-600 shadow-2xs'
                                : 'bg-white/70 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleWeekForDoc(doc.id, wk.weekNumber)}
                              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300"
                            />
                            <div className="space-y-0.5 min-w-0">
                              <div className="text-xs font-bold text-slate-900">
                                Week {wk.weekNumber}: {wk.lessonTitle}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {wk.pageReference} · {wk.wordCount} words
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary of selected weeks */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Selected Weekly Lesson Summary</span>
              </div>
              {activeSelections.length === 0 ? (
                <p className="text-xs text-red-700 font-medium">
                  Please select at least one week from a selected document to continue.
                </p>
              ) : (
                <ul className="text-xs text-slate-700 space-y-1">
                  {activeSelections.map((sel) => (
                    <li key={sel.documentId}>
                      <strong>{sel.subject}</strong> ({sel.documentTitle}):{' '}
                      <span className="font-mono font-semibold text-indigo-900">
                        Weeks {sel.selectedWeeks.join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: SELECT NUMBER OF QUESTIONS */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Step 3: Select Number of Examination Questions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard Grade 7 CBT examinations contain at least 50 questions. Choose a
                preset or enter a custom count supported by your selected weekly lessons.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[50, 60, 75, 100].map((preset) => {
                const isSelected = questionCount === preset && customCountInput === '';
                const isSupported = capacity.maxSupportedQuestions >= preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setCustomCountInput('');
                      setQuestionCount(preset);
                    }}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xl font-bold font-mono tabular-nums">
                      {preset}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        isSelected ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      {preset === 50 ? 'Standard CBT (Default)' : 'Extended Assessment'}
                    </div>
                    {!isSupported && (
                      <div className="text-[11px] text-amber-400 font-semibold mt-1">
                        Needs more weeks
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="max-w-xs space-y-1.5">
              <label
                htmlFor="custom-q-count"
                className="block text-xs font-semibold text-slate-700"
              >
                Or Enter Custom Question Count (Minimum: 50, Max: 120)
              </label>
              <input
                id="custom-q-count"
                type="number"
                min={50}
                max={120}
                value={customCountInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomCountInput(val);
                  const parsed = parseInt(val, 10);
                  if (!Number.isNaN(parsed)) {
                    setQuestionCount(parsed);
                  }
                }}
                placeholder="Enter custom count (e.g., 65)"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>

            {/* Source Capacity Verification Card */}
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                capacity.maxSupportedQuestions >= questionCount
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Source Material Capacity Verification</span>
                <span className="font-mono tabular-nums">
                  Requested: {questionCount} Qs · Max Supported:{' '}
                  {capacity.maxSupportedQuestions} Qs
                </span>
              </div>
              <p className="text-xs leading-relaxed">
                Your selected weekly sections contain{' '}
                <strong className="font-mono">{capacity.totalWords}</strong> words and{' '}
                <strong className="font-mono">{capacity.totalFacts}</strong> distinct
                factual statements across{' '}
                <strong className="font-mono">{selectedPassages.length}</strong> passages.
                {capacity.maxSupportedQuestions >= questionCount
                  ? ` This provides sufficient conceptual density to generate ${questionCount} unique, non-duplicate questions without inventing unsupported facts.`
                  : ` To generate ${questionCount} unique questions without repetition, please return to Step 1 or Step 2 and include additional weekly lessons, or reduce the question count to ${Math.max(
                      50,
                      capacity.maxSupportedQuestions
                    )}.`}
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: SELECT DURATION */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Step 4: Select Timed Examination Duration
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The persistent countdown timer starts once your examination is generated and
                automatically submits when time expires.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([15, 30, 45, 60] as const).map((mins) => {
                const isSelected = durationMinutes === mins;
                const secPerQ = Math.round((mins * 60) / questionCount);
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold font-mono tabular-nums">
                        {mins} min
                      </span>
                      <Clock className="w-4 h-4 opacity-80" />
                    </div>
                    <div
                      className={`text-xs mt-1 font-mono tabular-nums ${
                        isSelected ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      ~{secPerQ}s per question
                    </div>
                  </button>
                );
              })}
            </div>

            {isTightDuration && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Rapid Pacing Warning:</strong> Choosing {durationMinutes} minutes
                  for {questionCount} questions provides approximately{' '}
                  <strong className="font-mono">{secondsPerQuestion} seconds</strong> per
                  question. You may proceed with this speed challenge or choose 45 or 60
                  minutes for deeper multi-step reasoning.
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: SELECT DIFFICULTY */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Step 5: Select Cognitive Difficulty Level
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Difficulty governs the cognitive depth of reasoning, scenario application,
                and misconception traps—never obscure wording or outside trivia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  {
                    level: 'Advanced practice' as DifficultyLevel,
                    subtitle: 'Conceptual Clarity & Direct Application',
                    bullets: [
                      'Challenging Grade 7 questions beyond rote memorization',
                      'Conceptual distinctions between closely related terms',
                      'Direct application of formulas and rules from selected weeks',
                    ],
                  },
                  {
                    level: 'High difficulty' as DifficultyLevel,
                    subtitle: 'Multi-Step Reasoning & Misconceptions (Default)',
                    bullets: [
                      'Multi-step problem solving combining lesson principles',
                      'Application to novel but source-supported classroom scenarios',
                      'Distractors engineered from reversed relationships & common errors',
                    ],
                  },
                  {
                    level: 'Expert challenge' as DifficultyLevel,
                    subtitle: 'Maximum Grade 7 Analytical Synthesis',
                    bullets: [
                      'Demanding cross-concept synthesis across selected weekly lessons',
                      'Evaluation of experimental evidence, tables, and quantitative changes',
                      'Strict misconception traps requiring deep verification against text',
                    ],
                  },
                ] as const
              ).map((item) => {
                const isSelected = difficulty === item.level;
                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setDifficulty(item.level)}
                    className={`p-5 rounded-xl border text-left transition-colors flex flex-col justify-between gap-4 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-600 ring-1 ring-indigo-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-slate-900">
                          {item.level}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-indigo-700">
                        {item.subtitle}
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                        {item.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-1.5">
                            <span className="text-indigo-600 font-bold">·</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cognitive Distribution Target Table */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>
                  Target Cognitive Category Distribution ({questionCount} Questions)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {Object.entries(cognitiveTargets).map(([category, count]) => (
                  <div
                    key={category}
                    className="bg-white p-3 rounded-lg border border-slate-200 space-y-1"
                  >
                    <div className="text-lg font-bold font-mono tabular-nums text-indigo-700">
                      {count} Qs
                    </div>
                    <div className="text-[11px] text-slate-600 leading-snug">
                      {category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW AND GENERATE */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Step 6: Review Configuration & Generate Examination
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirm your examination parameters below. The countdown timer will begin as
                soon as the validated examination is created.
              </p>
            </div>

            <div>
              <label
                htmlFor="custom-exam-title"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Examination Title (Optional)
              </label>
              <input
                id="custom-exam-title"
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Leave blank for automatic subject & week title"
                className="w-full max-w-xl px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800">
                  Selected Subjects, Documents & Independent Weeks
                </div>
                <ul className="space-y-2 text-xs text-slate-700">
                  {activeSelections.map((sel) => (
                    <li
                      key={sel.documentId}
                      className="p-2.5 bg-white rounded-lg border border-slate-200"
                    >
                      <div className="font-bold text-indigo-700">{sel.subject}</div>
                      <div className="font-medium text-slate-900">{sel.documentTitle}</div>
                      <div className="font-mono text-slate-600 mt-0.5">
                        Selected Weeks: Week {sel.selectedWeeks.join(', Week ')}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Assessment Parameters & Grounding Status
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                  <div className="p-2.5 sm:p-3 bg-white rounded-lg border border-slate-200 min-w-0">
                    <div className="text-[11px] sm:text-xs text-slate-500">Number of Questions</div>
                    <div className="text-sm sm:text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                      {questionCount} Questions
                    </div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white rounded-lg border border-slate-200 min-w-0">
                    <div className="text-[11px] sm:text-xs text-slate-500">Timed Duration</div>
                    <div className="text-sm sm:text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                      {durationMinutes} Minutes
                    </div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white rounded-lg border border-slate-200 min-w-0">
                    <div className="text-[11px] sm:text-xs text-slate-500">Cognitive Difficulty</div>
                    <div className="text-xs sm:text-sm font-bold text-indigo-700 mt-0.5 break-words">
                      {difficulty}
                    </div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white rounded-lg border border-slate-200 min-w-0">
                    <div className="text-[11px] sm:text-xs text-slate-500">Source Content Status</div>
                    <div className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 break-words">
                      Verified ({selectedPassages.length} Passages)
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Fresh Question Guarantee:</strong> Every new exam started for a subject generates a brand new, non-repeating set of questions and rotated options from your uploaded study materials.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls - Responsive Stack on Mobile / Android */}
        <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 sm:flex-initial justify-center px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Previous Step</span>
              </button>
            )}
            {step === 6 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 sm:flex-initial justify-center px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Edit Selections
              </button>
            )}
          </div>

          {step < 6 ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={!canProceedFromCurrentStep()}
                onClick={() => setStep((s) => s + 1)}
                className="w-full sm:w-auto justify-center px-5 py-3 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Step {step + 1}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateExam}
              className="w-full sm:w-auto justify-center px-6 py-3.5 sm:py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin shrink-0" />
                  <span>Generating {questionCount} Validated Questions...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>Generate Examination ({questionCount} Questions)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
