import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  Edit3,
  FileText,
  Play,
  Plus,
  Save,
} from 'lucide-react';
import { ExamAttempt, StudentProfile, StudyDocument, WeeklySection } from '../types/cbt';
import { saveOfflineSubjectReserve } from '../lib/offlineEngine';
import { MathText } from './MathText';
import { buildPersonalRevisionDeck } from '../lib/masteryLogic';
import { CrestOfExcellenceIcon, ScholarCodexIcon } from './ClassicAcademicIcons';

interface SubjectsLessonsViewProps {
  documents: StudyDocument[];
  attempts?: ExamAttempt[];
  profile?: StudentProfile | null;
  initialDocumentId: string | null;
  onDocumentsUpdated: (docs: StudyDocument[]) => void;
  onStartExamWithDocument: (documentId: string, selectedWeeks?: number[]) => void;
  onToggleMasteredQuestion?: (questionId: string) => void;
}

export const SubjectsLessonsView: React.FC<SubjectsLessonsViewProps> = ({
  documents,
  attempts = [],
  profile,
  initialDocumentId,
  onDocumentsUpdated,
  onStartExamWithDocument,
  onToggleMasteredQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<'lessons' | 'revision_deck'>('lessons');
  const [deckFilter, setDeckFilter] = useState<'unmastered' | 'bookmarked' | 'missed' | 'all'>(
    'unmastered'
  );
  const [deckSubjectFilter, setDeckSubjectFilter] = useState<string>('ALL');

  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDocumentId || documents[0]?.id || ''
  );
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [draftWeeks, setDraftWeeks] = useState<WeeklySection[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const revisionDeck = useMemo(
    () => buildPersonalRevisionDeck(attempts, profile?.masteredQuestionIds || []),
    [attempts, profile?.masteredQuestionIds]
  );

  const filteredDeck = useMemo(() => {
    return revisionDeck.filter((item) => {
      if (deckSubjectFilter !== 'ALL' && item.subject !== deckSubjectFilter) return false;
      if (deckFilter === 'unmastered') return !item.isMastered;
      if (deckFilter === 'bookmarked') return item.reasons.includes('marked_for_review');
      if (deckFilter === 'missed')
        return item.reasons.includes('incorrect') || item.reasons.includes('unanswered');
      return true;
    });
  }, [revisionDeck, deckFilter, deckSubjectFilter]);

  useEffect(() => {
    if (initialDocumentId && documents.some((d) => d.id === initialDocumentId)) {
      setSelectedDocId(initialDocumentId);
    } else if (!selectedDocId && documents[0]) {
      setSelectedDocId(documents[0].id);
    }
  }, [initialDocumentId, documents, selectedDocId]);

  const currentDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  useEffect(() => {
    if (currentDoc) {
      setDraftWeeks(currentDoc.weeks.map((w) => ({ ...w })));
      setEditingWeekId(null);
    }
  }, [currentDoc]);

  if (!currentDoc) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
        <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">
          No Study Documents Available
        </h2>
        <p className="text-xs text-slate-500">
          Upload a PDF, DOCX, or TXT document first to inspect and verify Week 1–6 lessons.
        </p>
      </div>
    );
  }

  const detectedWeekNumbers = new Set(draftWeeks.map((w) => w.weekNumber));
  const maxWeekInDoc = Math.max(6, ...draftWeeks.map((w) => w.weekNumber));
  const expectedWeekRange = Array.from({ length: maxWeekInDoc }, (_, i) => i + 1);
  const missingWeeks = expectedWeekRange.filter((n) => !detectedWeekNumbers.has(n));

  const persistWeeksToBackend = async (updatedWeeks: WeeklySection[], message: string) => {
    setIsSaving(true);
    setSaveBanner(null);
    try {
      const response = await fetch(`/api/documents/${currentDoc.id}/weeks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks: updatedWeeks }),
      });
      const data = await response.json();
      if (response.ok) {
        onDocumentsUpdated(data.documents);
        setSaveBanner(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSingleWeek = (weekId: string) => {
    const updated = draftWeeks.map((w) =>
      w.id === weekId ? { ...w, isConfirmed: true, confidence: 'high' as const } : w
    );
    setDraftWeeks(updated);
    setEditingWeekId(null);
    persistWeeksToBackend(updated, 'Week boundary and lesson content confirmed and saved.');
  };

  const handleConfirmAllWeeks = () => {
    const updated = draftWeeks.map((w) => ({
      ...w,
      isConfirmed: true,
      confidence: 'high' as const,
    }));
    setDraftWeeks(updated);
    persistWeeksToBackend(
      updated,
      `All ${updated.length} detected weekly sections confirmed for ${currentDoc.title}.`
    );
  };

  const handleAddManualWeek = (weekNum: number) => {
    const newSection: WeeklySection = {
      id: `${currentDoc.id}-wk-${weekNum}`,
      documentId: currentDoc.id,
      weekNumber: weekNum,
      detectedHeading: `Week ${weekNum} (Manual Mapping)`,
      lessonTitle: `${currentDoc.subject} Week ${weekNum} Lesson`,
      content: `Enter verified Week ${weekNum} lesson notes here...`,
      preview: `Enter verified Week ${weekNum} lesson notes here...`,
      pageReference: 'Manual Entry',
      confidence: 'needs_review',
      isConfirmed: false,
      wordCount: 7,
      passageCount: 1,
    };
    const next = [...draftWeeks, newSection].sort((a, b) => a.weekNumber - b.weekNumber);
    setDraftWeeks(next);
    setEditingWeekId(newSection.id);
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadOffline = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/offline/reserve/${encodeURIComponent(currentDoc.subject)}`);
      if (!res.ok) throw new Error('Failed to fetch offline reserve.');
      const reserve = await res.json();
      await saveOfflineSubjectReserve(reserve);
      setSaveBanner(`${currentDoc.subject} subject downloaded for offline use.`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setIsDownloading(false);
    }
  };

  const unmasteredCount = revisionDeck.filter((i) => !i.isMastered).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subjects, Weekly Lessons & Personal Revision Deck
          </h1>
          <p className="text-sm text-slate-600">
            Inspect Week 1–{maxWeekInDoc} curriculum notes or review your personal deck of bookmarked and missed examination questions.
          </p>
          {downloadError && <p className="text-xs text-red-600 mt-1">{downloadError}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadOffline}
            disabled={isDownloading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isDownloading ? 'Downloading...' : 'Download for Offline'}
          </button>
          <button
            type="button"
            onClick={() => onStartExamWithDocument(currentDoc.id)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Create Exam from This Document
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs: Curriculum Lesson Notes vs Personal Revision Deck */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'lessons'
              ? 'bg-[#0F172A] text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Curriculum Lesson Notes ({documents.length} Subjects)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('revision_deck')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'revision_deck'
              ? 'bg-[#0F172A] text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Personal Revision Deck</span>
          <span
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
              activeTab === 'revision_deck'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-800'
            }`}
          >
            {unmasteredCount} active / {revisionDeck.length} total
          </span>
        </button>
      </div>

      {activeTab === 'revision_deck' ? (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ScholarCodexIcon size={40} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900">
                  Bookmarked & Missed-Question Revision Deck
                </h2>
                <p className="text-xs text-slate-500">
                  Questions you marked for review or answered incorrectly in completed exams appear here automatically. Mark items as Mastered once consolidated.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter revision deck by subject"
                value={deckSubjectFilter}
                onChange={(e) => setDeckSubjectFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg"
              >
                <option value="ALL">All Subjects</option>
                {Array.from(new Set(revisionDeck.map((i) => i.subject))).map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'unmastered', label: `To Revise (${unmasteredCount})` },
                    {
                      id: 'bookmarked',
                      label: `Bookmarked (${
                        revisionDeck.filter((i) => i.reasons.includes('marked_for_review')).length
                      })`,
                    },
                    {
                      id: 'missed',
                      label: `Missed (${
                        revisionDeck.filter(
                          (i) =>
                            i.reasons.includes('incorrect') || i.reasons.includes('unanswered')
                        ).length
                      })`,
                    },
                    { id: 'all', label: `All (${revisionDeck.length})` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDeckFilter(t.id)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      deckFilter === t.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredDeck.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
              <Bookmark className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-900">
                No Revision Cards in This View
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {revisionDeck.length === 0
                  ? 'Complete an examination or bookmark questions with "Mark for Review" during a paper to populate your personal revision deck.'
                  : 'All questions matching this filter have been marked as Mastered.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeck.map((card) => {
                const matchingDoc = documents.find((d) => d.subject === card.subject);
                return (
                  <div
                    key={card.id}
                    className={`bg-white rounded-xl border p-5 sm:p-6 space-y-4 ${
                      card.isMastered ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-indigo-700">{card.subject}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-slate-700">
                          Week {card.weekNumber}
                        </span>
                        {card.reasons.includes('marked_for_review') && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                            Bookmarked for Review
                          </span>
                        )}
                        {(card.reasons.includes('incorrect') ||
                          card.reasons.includes('unanswered')) && (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-900 font-semibold">
                            Missed in Exam
                          </span>
                        )}
                        {card.isMastered && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold">
                            Mastered
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {matchingDoc && (
                          <button
                            type="button"
                            onClick={() =>
                              onStartExamWithDocument(matchingDoc.id, [card.weekNumber])
                            }
                            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Practise Week {card.weekNumber}</span>
                          </button>
                        )}
                        {onToggleMasteredQuestion && (
                          <button
                            type="button"
                            onClick={() => onToggleMasteredQuestion(card.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                              card.isMastered
                                ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {card.isMastered ? 'Unmark Mastered' : 'Mark as Mastered'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                      <MathText text={card.questionText} />
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {card.options.map((opt) => {
                        const isCorrect = opt.id === card.correctAnswer;
                        const isStudent = opt.id === card.studentAnswer;
                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-lg border flex items-start gap-2 ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                                : isStudent
                                ? 'bg-red-50 border-red-300 text-red-950'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="font-mono font-bold">{opt.id}.</span>
                            <span className="flex-1">
                              <MathText text={opt.text} />
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="font-bold text-emerald-800">
                        Verified Explanation (Option {card.correctAnswer}):
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        <MathText text={card.whyCorrectSupported} />
                      </p>
                      <div className="text-[11px] text-slate-500 pt-1">
                        Concept: <strong className="text-slate-800">{card.conceptToRevisit}</strong> · Source: {card.sourceDocumentTitle} ({card.sectionHeading})
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Document Selector Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <label
                  htmlFor="week-map-doc-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Select Stored Document to Inspect or Edit Week Mappings
                </label>
            <select
              id="week-map-doc-select"
              value={currentDoc.id}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.subject}] {d.title} — (Weeks{' '}
                  {d.weeks.map((w) => w.weekNumber).join(', ')})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end">
            <button
              type="button"
              onClick={handleConfirmAllWeeks}
              disabled={isSaving}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Confirm All Detected Weeks ({draftWeeks.length})</span>
            </button>
          </div>
        </div>

        {/* Week Coverage Strip (Unboxed Typographic Metadata) */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Week 1–{maxWeekInDoc} Coverage:</span>
            {expectedWeekRange.map((wkNum, idx) => {
              const found = draftWeeks.find((w) => w.weekNumber === wkNum);
              return (
                <React.Fragment key={wkNum}>
                  {idx > 0 && (
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                  )}
                  <span
                    className={`font-mono text-xs font-semibold ${
                      found
                        ? found.isConfirmed
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                        : 'text-slate-400'
                    }`}
                  >
                    Wk {wkNum}: {found ? (found.isConfirmed ? 'Verified' : 'Review') : 'Absent'}
                  </span>
                </React.Fragment>
              );
            })}
          </div>

          {missingWeeks.length > 0 && (
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                Weeks {missingWeeks.join(', ')} are not in this source document (not fabricated).
              </span>
            </div>
          )}
        </div>
      </div>

      {saveBanner && (
        <div
          role="status"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-900 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveBanner}</span>
        </div>
      )}

      {/* Week Cards List */}
      <div className="space-y-4">
        {draftWeeks.map((week) => {
          const isEditing = editingWeekId === week.id;
          return (
            <div
              key={week.id}
              className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-indigo-700">
                      WEEK {week.weekNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Detected Heading: &ldquo;{week.detectedHeading}&rdquo;</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{week.pageReference}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {week.wordCount} words ({week.passageCount} passages)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold inline-flex items-center gap-1 ${
                        week.isConfirmed
                          ? 'text-emerald-700'
                          : week.confidence === 'high'
                          ? 'text-indigo-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {week.isConfirmed && <Check className="w-3.5 h-3.5" />}
                      <span>
                        {week.isConfirmed
                          ? 'Confirmed'
                          : week.confidence === 'high'
                          ? 'High Confidence'
                          : 'Needs Student Confirmation'}
                      </span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {week.lessonTitle}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingWeekId(isEditing ? null : week.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Close Editor' : 'Edit Mapping'}</span>
                  </button>

                  {!week.isConfirmed && (
                    <button
                      type="button"
                      onClick={() => handleConfirmSingleWeek(week.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Week {week.weekNumber}</span>
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Week Number (1–12)
                      </label>
                      <select
                        value={week.weekNumber}
                        onChange={(e) => {
                          const newWk = Number(e.target.value);
                          setDraftWeeks((prev) =>
                            prev.map((item) =>
                              item.id === week.id ? { ...item, weekNumber: newWk } : item
                            )
                          );
                        }}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <option key={n} value={n}>
                            Week {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Lesson Title
                      </label>
                      <input
                        type="text"
                        value={week.lessonTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftWeeks((prev) =>
                            prev.map((item) =>
                              item.id === week.id ? { ...item, lessonTitle: val } : item
                            )
                          );
                        }}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Source Page / Section Reference
                      </label>
                      <input
                        type="text"
                        value={week.pageReference}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftWeeks((prev) =>
                            prev.map((item) =>
                              item.id === week.id ? { ...item, pageReference: val } : item
                            )
                          );
                        }}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Extracted Week {week.weekNumber} Lesson Content
                    </label>
                    <textarea
                      rows={6}
                      value={week.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftWeeks((prev) =>
                          prev.map((item) =>
                            item.id === week.id ? { ...item, content: val } : item
                          )
                        );
                      }}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white border border-slate-300 rounded-lg leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingWeekId(null)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmSingleWeek(week.id)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save & Confirm Week {week.weekNumber}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  <MathText text={week.content || week.extractedText || ''} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Optional Add Missing Week Section if student wants to manually map one */}
      {missingWeeks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>
                Unmapped Weeks in {currentDoc.title}: Weeks {missingWeeks.join(', ')}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              ScholarCBT never invents content for weeks absent from your uploaded file. If your
              document has an unlabeled section for one of these weeks, you can map it manually:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {missingWeeks.map((wkNum) => (
              <button
                key={wkNum}
                type="button"
                onClick={() => handleAddManualWeek(wkNum)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Week {wkNum}</span>
              </button>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
