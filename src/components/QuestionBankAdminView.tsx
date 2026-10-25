import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Download,
  Edit3,
  FileCheck,
  Filter,
  Layers,
  Play,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
  Archive,
  AlertTriangle,
} from 'lucide-react';
import {
  DifficultyLevel,
  ExamAttempt,
  GenerationBatchJob,
  OptionId,
  QuestionBankItem,
  QuestionBankStatus,
  StudyDocument,
} from '../types/cbt';
import { MathText } from './MathText';
import { DEMO_PRACTICE_QUESTIONS } from '../lib/walkthroughLogic';
import {
  generateCohortAttemptsCsv,
  generateItemDifficultyCsv,
} from '../lib/masteryLogic';

interface QuestionBankAdminViewProps {
  documents: StudyDocument[];
  questionBank: QuestionBankItem[];
  attempts: ExamAttempt[];
  generationJobs: GenerationBatchJob[];
  onQuestionBankUpdated: (
    nextBank: QuestionBankItem[],
    nextJobs?: GenerationBatchJob[]
  ) => void;
  onStartExamWithDoc: (documentId: string) => void;
  onNavigateToUpload: () => void;
}

const STATUS_OPTIONS: Array<'ALL' | QuestionBankStatus> = [
  'ALL',
  'Approved',
  'Needs Review',
  'Draft',
  'Pending Validation',
  'Rejected',
  'Archived',
];

export const QuestionBankAdminView: React.FC<QuestionBankAdminViewProps> = ({
  documents,
  questionBank,
  attempts,
  generationJobs,
  onQuestionBankUpdated,
  onStartExamWithDoc,
  onNavigateToUpload,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<number | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | QuestionBankStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<QuestionBankItem | null>(null);
  const [batchDocId, setBatchDocId] = useState<string>(documents[0]?.id || '');
  const [adminBanner, setAdminBanner] = useState<string | null>(null);

  // Isolated Student Preview Mode state (never writes to real student records)
  const [showStudentPreview, setShowStudentPreview] = useState<boolean>(false);
  const [previewIdx, setPreviewIdx] = useState<number>(0);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, OptionId>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState<boolean>(false);

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCohortCsv = () => {
    const csv = generateCohortAttemptsCsv(attempts);
    triggerDownload(csv, `scholarcbt-cohort-attempts-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    setAdminBanner('Exported Candidate Attempt Summaries (CSV).');
  };

  const handleExportItemDifficultyCsv = () => {
    const csv = generateItemDifficultyCsv(attempts, questionBank);
    triggerDownload(csv, `scholarcbt-item-difficulty-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    setAdminBanner('Exported Item Difficulty & Distractor Telemetry (CSV).');
  };

  const handleExportFullJson = () => {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalQuestions: questionBank.length,
        totalAttempts: attempts.length,
        attempts,
      },
      null,
      2
    );
    triggerDownload(payload, `scholarcbt-assessment-report-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    setAdminBanner('Exported Full Assessment Data (JSON).');
  };

  const selectedBatchDoc = useMemo(
    () => documents.find((d) => d.id === batchDocId) || documents[0],
    [documents, batchDocId]
  );

  // Batch generator state
  const [batchWeeks, setBatchWeeks] = useState<number[]>(() =>
    documents[0]?.weeks.map((w) => w.weekNumber) || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  );
  const [batchCount, setBatchCount] = useState<number>(50);
  const [batchDifficulty, setBatchDifficulty] = useState<DifficultyLevel>('High difficulty');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const subjects = useMemo(
    () => Array.from(new Set(documents.map((d) => d.subject))),
    [documents]
  );

  const maxWeekAcrossDocs = useMemo(() => {
    let maxWk = 10;
    for (const d of documents) {
      for (const w of d.weeks) {
        if (w.weekNumber > maxWk) maxWk = w.weekNumber;
      }
    }
    return Math.min(12, Math.max(6, maxWk));
  }, [documents]);

  const allWeekColumns = useMemo(
    () => Array.from({ length: maxWeekAcrossDocs }, (_, i) => i + 1),
    [maxWeekAcrossDocs]
  );

  const stats = useMemo(() => {
    const total = questionBank.length;
    const approved = questionBank.filter((q) => q.bankStatus === 'Approved').length;
    const needsReview = questionBank.filter(
      (q) => q.bankStatus === 'Needs Review' || q.bankStatus === 'Draft'
    ).length;
    const rejectedOrArchived = questionBank.filter(
      (q) => q.bankStatus === 'Rejected' || q.bankStatus === 'Archived'
    ).length;
    return { total, approved, needsReview, rejectedOrArchived };
  }, [questionBank]);

  // Subject x Week coverage matrix
  const coverageBySubject = useMemo(() => {
    return subjects.map((subj) => {
      const subjDocs = documents.filter((d) => d.subject === subj);
      const subjQuestions = questionBank.filter(
        (q) => q.subject === subj && q.bankStatus === 'Approved'
      );
      const weekCounts: Record<number, number> = {};
      for (let w = 1; w <= 12; w++) weekCounts[w] = 0;
      for (const q of subjQuestions) {
        if (q.weekNumber >= 1 && q.weekNumber <= 12) {
          weekCounts[q.weekNumber] = (weekCounts[q.weekNumber] || 0) + 1;
        }
      }
      return {
        subject: subj,
        primaryDocId: subjDocs[0]?.id || '',
        documentCount: subjDocs.length,
        totalApproved: subjQuestions.length,
        weekCounts,
      };
    });
  }, [documents, questionBank, subjects]);

  const misconceptionReport = useMemo(() => {
    const report: Record<string, {
      questionText: string;
      totalAttempts: number;
      distractors: Record<OptionId, number>;
    }> = {};

    for (const attempt of attempts) {
      if (!attempt.result || !attempt.result.distractorUsage) continue;

      for (const [questionId, distractorData] of Object.entries(attempt.result.distractorUsage)) {
        if (!report[questionId]) {
          const question = questionBank.find((q) => q.id === questionId);
          report[questionId] = {
            questionText: question ? question.questionText : 'Unknown Question',
            totalAttempts: 0,
            distractors: { A: 0, B: 0, C: 0, D: 0 },
          };
        }

        report[questionId].totalAttempts += 1;
        for (const [key, count] of Object.entries(distractorData)) {
          const optionId = key as OptionId;
          report[questionId].distractors[optionId] += (count as number);
        }
      }
    }
    return report;
  }, [attempts, questionBank]);

  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return questionBank.filter((item) => {
      if (selectedSubject !== 'ALL' && item.subject !== selectedSubject) return false;
      if (selectedWeek !== 'ALL' && item.weekNumber !== selectedWeek) return false;
      if (selectedStatus !== 'ALL' && item.bankStatus !== selectedStatus) return false;
      if (qLower) {
        const inStem = item.questionText.toLowerCase().includes(qLower);
        const inOpts = item.options.some((o) => o.text.toLowerCase().includes(qLower));
        const inTopic = (item.sectionHeading || '').toLowerCase().includes(qLower);
        return inStem || inOpts || inTopic;
      }
      return true;
    });
  }, [questionBank, searchQuery, selectedStatus, selectedSubject, selectedWeek]);

  const handleToggleBatchWeek = (wk: number) => {
    setBatchWeeks((prev) =>
      prev.includes(wk)
        ? prev.length > 1
          ? prev.filter((w) => w !== wk)
          : prev
        : [...prev, wk].sort((a, b) => a - b)
    );
  };

  const handleGenerateBatch = async () => {
    if (!batchDocId) return;
    setIsGeneratingBatch(true);
    setBatchFeedback(null);
    setBatchError(null);
    try {
      const res = await fetch('/api/question-bank/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: batchDocId,
          weeks: batchWeeks,
          count: batchCount,
          difficulty: batchDifficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate question batch.');
      }
      onQuestionBankUpdated(data.questionBank, data.generationJobs);
      setBatchFeedback(
        `Generated and validated ${data.createdItems?.length || batchCount} questions (${
          data.job?.approvedCount || 0
        } auto-approved via 12-point quality pipeline).`
      );
    } catch (err) {
      setBatchError(
        err instanceof Error ? err.message : 'Could not generate question batch.'
      );
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: QuestionBankStatus) => {
    try {
      const res = await fetch(`/api/question-bank/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankStatus: nextStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        onQuestionBankUpdated(data.questionBank);
      }
    } catch {
      // Optimistic local fallback
      onQuestionBankUpdated(
        questionBank.map((q) => (q.id === id ? { ...q, bankStatus: nextStatus } : q))
      );
    }
  };

  const handleBulkApproveFiltered = async () => {
    const targetIds = filteredQuestions
      .filter((q) => q.bankStatus !== 'Approved')
      .map((q) => q.id);
    if (targetIds.length === 0) return;

    try {
      const res = await fetch('/api/question-bank/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: targetIds,
          bankStatus: 'Approved',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onQuestionBankUpdated(data.questionBank);
      }
    } catch {
      // Ignore error
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        onQuestionBankUpdated(data.questionBank);
        setAdminBanner('Question bank CSV imported successfully.');
      } else {
        throw new Error('Import failed.');
      }
    } catch (err) {
      setAdminBanner(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  const handleFlagLatex = async (questionId: string, issues: string[]) => {
    const note = issues.join('; ') || 'Flagged for LaTeX mathematical review';
    try {
      const res = await fetch(`/api/question-bank/${questionId}/flag-latex`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (res.ok) {
        const data = await res.json();
        onQuestionBankUpdated(data.questionBank);
        setAdminBanner('Question flagged as Needs Review for LaTeX verification.');
      }
    } catch {
      onQuestionBankUpdated(
        questionBank.map((q) =>
          q.id === questionId
            ? { ...q, bankStatus: 'Needs Review', malformedLatexFlag: true, malformedLatexNote: note }
            : q
        )
      );
      setAdminBanner('Question flagged as Needs Review for LaTeX verification.');
    }
  };

  const handleSaveEditedQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/question-bank/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: editingItem.questionText,
          options: editingItem.options,
          correctOptionId: editingItem.correctOptionId,
          explanation: editingItem.explanation,
          weekNumber: editingItem.weekNumber,
          bankStatus: editingItem.bankStatus,
          tags: editingItem.tags,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onQuestionBankUpdated(data.questionBank);
        setEditingItem(null);
      }
    } catch {
      setEditingItem(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator & Teacher Question Bank Studio · 12-Point Quality Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Grade 7 Validated Question Bank & Assessment Control
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Every examination draws from approved, source-grounded questions verified for Grade 7
            clarity, parallel distraction, and zero meta-text or embedded option justifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCohortCsv}
            className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Candidate CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportItemDifficultyCsv}
            className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export Item Telemetry CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportFullJson}
            className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowStudentPreview((v) => !v);
              setPreviewIdx(0);
              setPreviewAnswers({});
              setPreviewSubmitted(false);
            }}
            className="px-4 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>
              {showStudentPreview ? 'Close Student Preview' : 'Student Preview Mode (Isolated)'}
            </span>
          </button>
          <button
            type="button"
            onClick={onNavigateToUpload}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-indigo-400" />
            <span>Upload New Subject File</span>
          </button>
        </div>
      </div>

      {adminBanner && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-950 flex items-center justify-between">
          <span>{adminBanner}</span>
          <button
            type="button"
            onClick={() => setAdminBanner(null)}
            className="text-blue-700 hover:text-blue-950 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Isolated Administrator Student Preview Mode Sandbox */}
      {showStudentPreview && (
        <section
          aria-label="Isolated Student Preview Mode"
          className="rounded-xl border-2 border-[#1E3A8A] bg-white p-6 shadow-xs space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
                <span>Isolated Student Preview Mode — Sample Data Only</span>
              </div>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                Experience the Student Examination Interface
              </h2>
              <p className="text-xs text-slate-500">
                This sandbox uses isolated in-memory sample questions and never modifies real student attempts, scores, or achievements.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewAnswers({});
                  setPreviewSubmitted(false);
                  setPreviewIdx(0);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Reset Preview
              </button>
              <button
                type="button"
                onClick={() => setShowStudentPreview(false)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Exit Preview
              </button>
            </div>
          </div>

          {(() => {
            const pQuestion = DEMO_PRACTICE_QUESTIONS[previewIdx];
            const selectedOpt = previewAnswers[pQuestion.id] || null;
            const correctTotal = DEMO_PRACTICE_QUESTIONS.filter(
              (q) => previewAnswers[q.id] === q.correctOptionId
            ).length;

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {DEMO_PRACTICE_QUESTIONS.map((q, idx) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setPreviewIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                          previewIdx === idx
                            ? 'bg-[#0F172A] text-white border-[#0F172A]'
                            : previewAnswers[q.id]
                            ? 'bg-emerald-50 text-[#15803D] border-emerald-300'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Q{idx + 1}: {q.subject}
                      </button>
                    ))}
                  </div>
                  {!previewSubmitted ? (
                    <button
                      type="button"
                      onClick={() => setPreviewSubmitted(true)}
                      className="rounded-lg bg-[#15803D] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
                    >
                      Grade Preview Paper
                    </button>
                  ) : (
                    <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-mono text-xs font-bold text-[#15803D]">
                      Preview Score: {correctTotal} / {DEMO_PRACTICE_QUESTIONS.length} (
                      {Math.round((correctTotal / DEMO_PRACTICE_QUESTIONS.length) * 100)}%)
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 space-y-4">
                  <div className="cbt-question-stem">
                    <MathText text={pQuestion.questionText} />
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {pQuestion.options.map((opt) => {
                      const isSel = selectedOpt === opt.id;
                      const isCorrect = opt.id === pQuestion.correctOptionId;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={previewSubmitted}
                          onClick={() =>
                            setPreviewAnswers((prev) => ({ ...prev, [pQuestion.id]: opt.id }))
                          }
                          className={`p-3.5 rounded-xl border-2 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                            previewSubmitted && isCorrect
                              ? 'border-[#15803D] bg-emerald-50'
                              : previewSubmitted && isSel && !isCorrect
                              ? 'border-[#B91C1C] bg-red-50'
                              : isSel
                              ? 'border-[#1D4ED8] bg-blue-50/70'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-900 font-mono text-xs font-bold text-white">
                            {opt.id}
                          </span>
                          <MathText text={opt.text} className="cbt-option-text" />
                        </button>
                      );
                    })}
                  </div>
                  {previewSubmitted && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-700">
                      <strong className="text-slate-900">Explanation: </strong>
                      <MathText text={pQuestion.explanation} />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Bank Items
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.total}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Across {subjects.length} subjects (Weeks 1–{maxWeekAcrossDocs})
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-5">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Approved & Exam-Ready
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-700 font-mono tabular-nums">
            {stats.approved}
          </div>
          <div className="mt-1 text-xs text-emerald-700">
            Passed 12/12 quality & grounding checks
          </div>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Needs Review / Draft
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-amber-700 font-mono tabular-nums">
            {stats.needsReview}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Awaiting teacher inspection or edit
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Batch Generation Jobs
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {generationJobs.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Automated & teacher-triggered batches
          </div>
        </div>
      </div>

      {/* Subject & Week Coverage Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Question Bank Coverage by Subject & Academic Week (Weeks 1–{maxWeekAcrossDocs})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Click any subject to filter the Question Bank or launch a strictly isolated subject examination
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <th className="py-3 pr-4 font-semibold">Subject</th>
                {allWeekColumns.map((wk) => (
                  <th key={wk} className="py-3 px-1.5 font-semibold text-center">
                    Wk {wk}
                  </th>
                ))}
                <th className="py-3 px-3 font-semibold text-right">Approved Total</th>
                <th className="py-3 pl-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coverageBySubject.map((row) => (
                <tr key={row.subject} className="hover:bg-slate-50">
                  <td className="py-3 pr-4 font-bold text-slate-900">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSubject(
                          selectedSubject === row.subject ? 'ALL' : row.subject
                        )
                      }
                      className="text-left hover:text-indigo-600 cursor-pointer flex items-center gap-2"
                    >
                      <span>{row.subject}</span>
                      <span className="px-2 py-0.5 text-[11px] rounded bg-slate-100 text-slate-600 font-medium">
                        {row.documentCount} doc{row.documentCount === 1 ? '' : 's'}
                      </span>
                    </button>
                  </td>
                  {allWeekColumns.map((wk) => (
                    <td
                      key={wk}
                      className="py-3 px-1.5 text-center font-mono tabular-nums text-slate-700"
                    >
                      <span
                        className={`inline-block min-w-[1.75rem] px-1 py-0.5 rounded font-semibold ${
                          row.weekCounts[wk] >= 5
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : row.weekCounts[wk] > 0
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {row.weekCounts[wk] || 0}
                      </span>
                    </td>
                  ))}
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {row.totalApproved} Qs
                  </td>
                  <td className="py-3 pl-4 text-right">
                    {row.primaryDocId && (
                      <button
                        type="button"
                        onClick={() => onStartExamWithDoc(row.primaryDocId)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Practice Subject</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Question Generation Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Batch Question Generator & 12-Point Validator</span>
            </h2>
            <p className="text-xs text-slate-500">
              Generate additional examination questions strictly grounded in a specific uploaded document and weeks
            </p>
          </div>
        </div>

        {batchFeedback && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{batchFeedback}</span>
          </div>
        )}
        {batchError && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
            {batchError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label
              htmlFor="batch-doc-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Source Document
            </label>
            <select
              id="batch-doc-select"
              value={batchDocId}
              onChange={(e) => {
                const nextId = e.target.value;
                setBatchDocId(nextId);
                const found = documents.find((d) => d.id === nextId);
                if (found) {
                  setBatchWeeks(found.weeks.map((w) => w.weekNumber));
                }
              }}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            >
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  [{doc.subject}] {doc.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="batch-count-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Batch Size
            </label>
            <select
              id="batch-count-select"
              value={batchCount}
              onChange={(e) => setBatchCount(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value={10}>10 Questions</option>
              <option value={20}>20 Questions</option>
              <option value={30}>30 Questions</option>
              <option value={50}>50 Questions (Standard Batch)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="batch-difficulty-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Difficulty Standard
            </label>
            <select
              id="batch-difficulty-select"
              value={batchDifficulty}
              onChange={(e) => setBatchDifficulty(e.target.value as DifficultyLevel)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="Advanced practice">Advanced practice</option>
              <option value="High difficulty">High difficulty</option>
              <option value="Expert challenge">Expert challenge</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 mr-1">Target Weeks:</span>
            {(selectedBatchDoc?.weeks.map((w) => w.weekNumber) || allWeekColumns).map((wk) => {
              const active = batchWeeks.includes(wk);
              return (
                <button
                  key={wk}
                  type="button"
                  onClick={() => handleToggleBatchWeek(wk)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Week {wk}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleGenerateBatch}
            disabled={isGeneratingBatch || !batchDocId}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isGeneratingBatch
                ? 'Synthesizing & Validating Batch...'
                : `Generate & Validate ${batchCount} Questions`}
            </span>
          </button>
        </div>
      </div>

      {/* Misconception Mapping */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Common Student Misconceptions (Distractor Usage)</span>
        </h2>
        <div className="space-y-3">
          {Object.entries(misconceptionReport)
            .sort((a, b) => b[1].totalAttempts - a[1].totalAttempts)
            .slice(0, 5)
            .map(([qId, report]) => (
              <div key={qId} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-sm font-semibold">{report.questionText}</div>
                <div className="text-xs text-slate-600 mt-1">
                  Appeared in {report.totalAttempts} attempts. Common distractor picks:
                </div>
                <div className="flex gap-4 mt-2">
                  {(['A', 'B', 'C', 'D'] as OptionId[]).map((optId) => (
                    <div key={optId} className="text-xs">
                      {optId}: <span className="font-bold">{report.distractors[optId]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Question Bank Browser & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>
                Question Bank Inspector ({filteredQuestions.length} matching questions)
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Inspect stems, parallel options A–D, 12-point validation reports, and approve or edit items
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </label>
            <button
              type="button"
              onClick={handleBulkApproveFiltered}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve All Filtered</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="qb-filter-subject"
              className="block text-xs font-semibold text-slate-600 mb-1"
            >
              Filter by Subject
            </label>
            <select
              id="qb-filter-subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="ALL">All Subjects ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="qb-filter-week"
              className="block text-xs font-semibold text-slate-600 mb-1"
            >
              Filter by Week
            </label>
            <select
              id="qb-filter-week"
              value={String(selectedWeek)}
              onChange={(e) =>
                setSelectedWeek(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="ALL">All Weeks (Weeks 1–{maxWeekAcrossDocs})</option>
              {allWeekColumns.map((wk) => (
                <option key={wk} value={wk}>
                  Week {wk}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="qb-filter-status"
              className="block text-xs font-semibold text-slate-600 mb-1"
            >
              Bank Status
            </label>
            <select
              id="qb-filter-status"
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as 'ALL' | QuestionBankStatus)
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st === 'ALL' ? 'All Statuses' : st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="qb-search-input"
              className="block text-xs font-semibold text-slate-600 mb-1"
            >
              Search Question or Option
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="qb-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stem, option, topic..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Question Cards List (paginated to top 40 for fast rendering) */}
        <div className="space-y-4">
          {filteredQuestions.slice(0, 40).map((item, idx) => {
            const report = item.validationReport;
            const isExpanded = expandedReportId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">
                      #{idx + 1}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold">
                      {item.subject}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-semibold">
                      Week {item.weekNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md font-semibold border ${
                        item.bankStatus === 'Approved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.bankStatus === 'Rejected' || item.bankStatus === 'Archived'
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {item.bankStatus}
                    </span>
                    {report && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedReportId(isExpanded ? null : item.id)
                        }
                        className="px-2.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {report.passedCount}/{report.totalChecks} Quality Checks
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.bankStatus !== 'Approved' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, 'Approved')}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...item })}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    {item.bankStatus !== 'Rejected' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, 'Rejected')}
                        className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Reject</span>
                      </button>
                    )}
                    {item.bankStatus !== 'Archived' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, 'Archived')}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Archive className="w-3 h-3" />
                        <span>Archive</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Stem */}
                <div className="cbt-question-stem">
                  <MathText
                    text={item.questionText}
                    showAdminLatexWarning={true}
                    onFlagMalformedLatex={(issues) => handleFlagLatex(item.id, issues)}
                  />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.options.map((opt) => {
                    const isCorrect = opt.id === item.correctOptionId;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                          isCorrect
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-slate-300 text-slate-700'
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span className="leading-relaxed">
                          <MathText
                            text={opt.text}
                            showAdminLatexWarning={true}
                            onFlagMalformedLatex={(issues) => handleFlagLatex(item.id, issues)}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Expandable 12-Point Quality Report */}
                {isExpanded && report && (
                  <div className="mt-3 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-800">
                      12-Point Automated Question Validation Report ({report.passedCount}/
                      {report.totalChecks} Passed)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {report.checks.map((chk) => (
                        <div
                          key={chk.id}
                          className={`p-2 rounded border text-xs flex items-start gap-2 ${
                            chk.passed
                              ? 'bg-white border-emerald-200 text-slate-800'
                              : 'bg-red-50 border-red-200 text-red-900'
                          }`}
                        >
                          {chk.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-semibold">{chk.label}</div>
                            <div className="text-[11px] text-slate-500">{chk.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Question Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditedQuestion}
            className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Question Bank Item ({editingItem.subject} · Week {editingItem.weekNumber})
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Question Stem (Supports KaTeX $...$ and $$...$$)
              </label>
              <textarea
                rows={3}
                value={editingItem.questionText}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, questionText: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800">
                <span className="font-bold text-slate-500 uppercase mr-2">Live Math Preview:</span>
                <MathText text={editingItem.questionText} showAdminLatexWarning={true} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {editingItem.options.map((opt, oIdx) => (
                <div key={opt.id}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Option {opt.id}
                  </label>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => {
                      const nextOpts = [...editingItem.options] as QuestionBankItem['options'];
                      nextOpts[oIdx] = { ...opt, text: e.target.value };
                      setEditingItem({ ...editingItem, options: nextOpts });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correct Option
                </label>
                <select
                  value={editingItem.correctOptionId}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      correctOptionId: e.target.value as OptionId,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  {(['A', 'B', 'C', 'D'] as OptionId[]).map((id) => (
                    <option key={id} value={id}>
                      Option {id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editingItem.bankStatus}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      bankStatus: e.target.value as QuestionBankStatus,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  {STATUS_OPTIONS.filter((s) => s !== 'ALL').map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={editingItem.tags?.join(', ') || ''}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  })
                }
                placeholder="Hard, Conceptual, Diagram-based"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Save & Re-Validate (12 Checks)
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
