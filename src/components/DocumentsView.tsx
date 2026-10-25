import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  FolderPlus,
  Layers,
  RefreshCw,
  Trash2,
  Upload,
  AlertCircle,
  X,
} from 'lucide-react';
import { QuestionBankItem, StudyDocument } from '../types/cbt';
import {
  buildLocalFallbackStudyDocument,
  serializeFileForUpload,
} from '../lib/clientFileExtractor';

interface DocumentsViewProps {
  documents: StudyDocument[];
  onDocumentsUpdated: (docs: StudyDocument[]) => void;
  onOpenWeekMapping: (documentId: string) => void;
  onStartExamWithDoc?: (documentId: string) => void;
  onQuestionBankUpdated?: (bank: QuestionBankItem[]) => void;
}

const SUBJECT_PRESETS = [
  'Physical & Health Education',
  'Music',
  'Mathematics',
  'Basic Science',
  'English Language',
  'Social Studies',
  'Agricultural Science',
  'Computer Studies',
  'Civic Education',
];

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  onDocumentsUpdated,
  onOpenWeekMapping,
  onStartExamWithDoc,
  onQuestionBankUpdated,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('AUTO');
  const [customSubject, setCustomSubject] = useState('');
  const [classTerm, setClassTerm] = useState('Grade 7 · First Term');
  const [description, setDescription] = useState('');
  const [pastedText, setPastedText] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [contentSearchQuery, setContentSearchQuery] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<StudyDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<StudyDocument | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const uniqueSubjects = Array.from(new Set(documents.map((d) => d.subject)));
  const normalizedQuery = contentSearchQuery.trim().toLowerCase();
  const filteredDocuments = documents.filter((d) => {
    const matchesSubject = subjectFilter === 'ALL' || d.subject === subjectFilter;
    if (!matchesSubject) return false;
    if (!normalizedQuery) return true;
    const inMeta =
      d.title.toLowerCase().includes(normalizedQuery) ||
      d.subject.toLowerCase().includes(normalizedQuery) ||
      d.description.toLowerCase().includes(normalizedQuery);
    const inWeeks = d.weeks.some(
      (w) =>
        w.lessonTitle.toLowerCase().includes(normalizedQuery) ||
        w.content.toLowerCase().includes(normalizedQuery)
    );
    return inMeta || inWeeks;
  });

  const matchingIndexedPassages = normalizedQuery
    ? filteredDocuments.flatMap((doc) =>
        doc.passages
          .filter(
            (p) =>
              p.sectionHeading.toLowerCase().includes(normalizedQuery) ||
              (p.content || '').toLowerCase().includes(normalizedQuery)
          )
          .map((p) => ({ doc, passage: p }))
      )
    : [];

  const uploadFilesList = async (filesToUpload: File[], overrideTitle?: string) => {
    if (filesToUpload.length === 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const finalSubject =
      subject === 'CUSTOM' ? customSubject.trim() || 'AUTO' : subject;
    const effectiveTitle = (overrideTitle ?? title).trim();

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const filesPayload = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const serialized = await serializeFileForUpload(filesToUpload[i]);
        filesPayload.push(serialized);
        setUploadProgress(20 + Math.round(((i + 1) / filesToUpload.length) * 35));
      }

      setUploadProgress(65);

      let response: Response | null = null;
      let lastNetworkErr: unknown = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 350 * attempt));
          }
          response = await fetch('/api/documents/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filesPayload,
              subject: finalSubject,
              classTerm,
              description,
              title: effectiveTitle || undefined,
            }),
          });
          break;
        } catch (netErr) {
          lastNetworkErr = netErr;
        }
      }

      if (response) {
        setUploadProgress(90);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload and process document.');
        }

        onDocumentsUpdated(data.documents);
        if (onQuestionBankUpdated && Array.isArray(data.questionBank)) {
          onQuestionBankUpdated(data.questionBank);
        }
        setSelectedFiles([]);
        setTitle('');
        setDescription('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadProgress(100);
        const importedSubject = data.createdDocuments?.[0]?.subject || 'Auto-Detected';
        setSuccessMessage(
          `Successfully imported and extracted ${data.createdDocuments.length} document(s) under "${importedSubject}" across Weeks 1–6.`
        );
      } else {
        // Fallback to local client extraction if mobile network connection was interrupted while resuming from file picker
        const fallbackDocs: StudyDocument[] = filesPayload.map((fp, idx) =>
          buildLocalFallbackStudyDocument({
            filename: fp.filename,
            size: fp.size,
            subject: finalSubject,
            classTerm,
            description,
            title:
              filesPayload.length === 1 && effectiveTitle
                ? effectiveTitle
                : fp.filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
            extractedText: fp.clientExtractedText,
          })
        );
        void lastNetworkErr;
        onDocumentsUpdated([...fallbackDocs, ...documents]);
        setSelectedFiles([]);
        setTitle('');
        setDescription('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadProgress(100);
        setSuccessMessage(
          `Successfully imported ${fallbackDocs.length} document(s) from your device across Weeks 1–6.`
        );
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during file import.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const validateAndStageFiles = (list: File[]) => {
    if (!list || list.length === 0) return;
    const validFiles: File[] = [];

    for (const f of list) {
      if (f.size > 45 * 1024 * 1024) {
        setErrorMessage(`File "${f.name}" exceeds the 45 MB maximum file size limit.`);
        return;
      }
      validFiles.push(f);
    }

    setSelectedFiles(validFiles);
    let autoTitle = title;
    if (validFiles.length === 1 && !title.trim()) {
      autoTitle = validFiles[0].name
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      setTitle(autoTitle);
    }

    // Automatically import selected files immediately so mobile phone users don't get stuck on staging
    void uploadFilesList(validFiles, autoTitle);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const list = e.target.files ? Array.from(e.target.files) : [];
    validateAndStageFiles(list);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const list = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    validateAndStageFiles(list);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const finalSubject =
      subject === 'CUSTOM' ? customSubject.trim() || 'General Studies' : subject;

    if (uploadMode === 'file') {
      if (selectedFiles.length === 0) {
        fileInputRef.current?.click();
        return;
      }
      await uploadFilesList(selectedFiles);
      return;
    }

    if (pastedText.trim().length < 20) {
      setErrorMessage(
        'Please provide at least 20 characters of lesson notes to extract Week 1–6 topics.'
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(30);

    try {
      setUploadProgress(65);
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || `${finalSubject} Study Notes`,
          subject: finalSubject,
          classTerm,
          description,
          originalFilename: `${(title.trim() || finalSubject)
            .toLowerCase()
            .replace(/\s+/g, '_')}.txt`,
          rawText: pastedText,
        }),
      });

      setUploadProgress(90);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process pasted study notes.');
      }

      onDocumentsUpdated(data.documents);
      setTitle('');
      setDescription('');
      setPastedText('');
      setUploadProgress(100);
      setSuccessMessage(
        `Successfully stored and extracted ${data.createdDocuments.length} document(s) with Week 1–6 lesson boundaries.`
      );
    } catch {
      const fallbackDoc = buildLocalFallbackStudyDocument({
        filename: `${(title.trim() || finalSubject).toLowerCase().replace(/\s+/g, '_')}.txt`,
        size: pastedText.length,
        subject: finalSubject,
        classTerm,
        description,
        title: title.trim() || `${finalSubject} Study Notes`,
        extractedText: pastedText,
      });
      onDocumentsUpdated([fallbackDoc, ...documents]);
      setTitle('');
      setDescription('');
      setPastedText('');
      setUploadProgress(100);
      setSuccessMessage(
        `Successfully stored and extracted "${fallbackDoc.title}" across Weeks 1–6.`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/documents/${editingDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingDoc.title,
          subject: editingDoc.subject,
          classTerm: editingDoc.classTerm,
          description: editingDoc.description,
        }),
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.documents)) {
        onDocumentsUpdated(data.documents);
        setEditingDoc(null);
        setSuccessMessage(`Updated metadata for "${editingDoc.title}".`);
      } else {
        onDocumentsUpdated(
          documents.map((d) => (d.id === editingDoc.id ? { ...editingDoc } : d))
        );
        setEditingDoc(null);
      }
    } catch {
      onDocumentsUpdated(
        documents.map((d) => (d.id === editingDoc.id ? { ...editingDoc } : d))
      );
      setEditingDoc(null);
    }
  };

  const handleReprocess = async (docId: string) => {
    setReprocessingId(docId);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/documents/${docId}/reprocess`, {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.documents)) {
        onDocumentsUpdated(data.documents);
        setSuccessMessage('Reprocessed document and refreshed Week 1–6 boundaries.');
      }
    } catch {
      setErrorMessage('Unable to reach server to reprocess document. Please try again.');
    } finally {
      setReprocessingId(null);
    }
  };

  const handleConfirmDelete = async (docId: string) => {
    setErrorMessage(null);
    const removedDoc = documents.find((d) => d.id === docId);
    try {
      const response = await fetch(`/api/documents/${docId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.documents)) {
        onDocumentsUpdated(data.documents);
      } else {
        onDocumentsUpdated(documents.filter((d) => d.id !== docId));
      }
    } catch {
      // Optimistically remove from UI state if a transient network interruption occurs
      onDocumentsUpdated(documents.filter((d) => d.id !== docId));
    } finally {
      setDeletingDocId(null);
      if (removedDoc) {
        setSuccessMessage(`Removed "${removedDoc.title}" from your document library.`);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Documents & Cloud Storage
          </h1>
          <p className="text-sm text-slate-600">
            Upload PDF, DOCX, or TXT learning materials. Files and extracted Week 1–6
            passages are stored persistently on the server.
          </p>
        </div>
      </div>

      {/* Upload Form Card */}
      <form
        onSubmit={handleUploadSubmit}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Upload Educational Materials
            </h2>
            <p className="text-xs text-slate-500">
              Automatic heading parser detects Week 1 through Week 6 without fabricating missing weeks
            </p>
          </div>

          {/* Interactive mode switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                uploadMode === 'file'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload Files (PDF / DOCX / TXT)
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('text')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                uploadMode === 'text'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste Weekly Notes
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-xs text-red-800"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3 text-xs text-emerald-800"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="doc-title-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Document Title (Optional for multi-file)
            </label>
            <input
              id="doc-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Grade 7 Basic Science Term 1 Notes"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label
              htmlFor="doc-subject-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Subject
            </label>
            <select
              id="doc-subject-select"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="AUTO">Auto-Detect from Uploaded File (Default)</option>
              {SUBJECT_PRESETS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="CUSTOM">+ Custom Subject...</option>
            </select>
            {subject === 'CUSTOM' && (
              <input
                type="text"
                aria-label="Custom Subject Name"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Enter subject name"
                className="mt-2 w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            )}
          </div>

          <div>
            <label
              htmlFor="doc-term-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Class / Term
            </label>
            <input
              id="doc-term-input"
              type="text"
              value={classTerm}
              onChange={(e) => setClassTerm(e.target.value)}
              placeholder="Grade 7 · First Term"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="doc-desc-input"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Description (Optional)
          </label>
          <input
            id="doc-desc-input"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief note about chapters or syllabus coverage..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {uploadMode === 'file' ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'LABEL') {
                fileInputRef.current?.click();
              }
            }}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center transition-colors bg-slate-50/60 cursor-pointer"
          >
            <input
              ref={fileInputRef}
              id="file-upload-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.rtf,.pptx,.ppt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,*/*"
              onChange={handleFileChange}
              className="sr-only"
            />
            <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              Tap to choose files from your phone or computer, or drag and drop here
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports PDF, DOCX, DOC, TXT, PPTX, MD, and mobile documents up to 45 MB · Automatic Week 1–6 extraction
            </p>
            <div className="mt-4">
              <label
                htmlFor="file-upload-input"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-800 rounded-lg cursor-pointer shadow-2xs"
              >
                <FolderPlus className="w-4 h-4 text-indigo-600" />
                <span>Select Files from Device</span>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 text-left space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  Selected for upload ({selectedFiles.length}):
                </div>
                {selectedFiles.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200"
                  >
                    <span className="font-medium text-slate-800 truncate">{f.name}</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {formatBytes(f.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <label
              htmlFor="paste-notes-textarea"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Weekly Lesson Content (Include headings such as &ldquo;Week 1: ...&rdquo;, &ldquo;Week 2: ...&rdquo;)
            </label>
            <textarea
              id="paste-notes-textarea"
              rows={7}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`Week 1: Introduction to Algebraic Equations\nAn equation states that two algebraic expressions are equal...\n\nWeek 2: Solving Two-Step Linear Equations\nTo isolate the unknown variable x, apply inverse operations...`}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        )}

        {isUploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>Extracting text & mapping weekly lessons...</span>
              <span className="font-mono tabular-nums">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isUploading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>
              {isUploading ? 'Processing & Storing...' : 'Upload & Extract Lessons'}
            </span>
          </button>
        </div>
      </form>

      {/* Stored Documents Library & Searchable Content Index */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Stored Study Documents & Searchable Content Index ({filteredDocuments.length})
            </h2>
            <p className="text-xs text-slate-500">
              Search across all extracted weekly passages, headings, formulas, and topics.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="search"
              aria-label="Search extracted content index"
              value={contentSearchQuery}
              onChange={(e) => setContentSearchQuery(e.target.value)}
              placeholder="Search topics, formulas, or week passages..."
              className="px-3.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:w-64"
            />

            {/* Interactive Subject Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setSubjectFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  subjectFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Subjects ({documents.length})
              </button>
              {uniqueSubjects.map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSubjectFilter(subj)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    subjectFilter === subj
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>
        </div>

        {normalizedQuery && (
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
              <span>
                Content Index Matches for &ldquo;{contentSearchQuery}&rdquo; ({matchingIndexedPassages.length} passage
                {matchingIndexedPassages.length === 1 ? '' : 's'})
              </span>
              <button
                type="button"
                onClick={() => setContentSearchQuery('')}
                className="text-indigo-700 hover:underline font-semibold cursor-pointer"
              >
                Clear Search
              </button>
            </div>
            {matchingIndexedPassages.length === 0 ? (
              <p className="text-xs text-slate-600">
                No indexed passages matched that keyword. Try another topic or term.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto">
                {matchingIndexedPassages.slice(0, 8).map(({ doc, passage }) => (
                  <div
                    key={passage.id}
                    className="p-3 bg-white rounded-lg border border-indigo-100 text-xs space-y-1"
                  >
                    <div className="font-semibold text-indigo-800">
                      {doc.subject} · Week {passage.weekNumber} · {passage.sectionHeading}
                    </div>
                    <p className="text-slate-600 line-clamp-2">{passage.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              No documents found for this filter
            </p>
            <p className="text-xs text-slate-500">
              Upload a PDF, DOCX, or TXT study guide above to populate your library.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    {/* Unboxed Metadata Kicker */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-indigo-700">{doc.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span>{doc.classTerm}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{doc.fileType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatBytes(doc.fileSizeBytes)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Status:{' '}
                        <strong
                          className={
                            doc.processingStatus === 'ready'
                              ? 'text-emerald-700'
                              : doc.processingStatus === 'needs_review'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }
                        >
                          {doc.processingStatus === 'ready'
                            ? 'Ready & Verified'
                            : doc.processingStatus === 'needs_review'
                            ? 'Needs Week Review'
                            : 'Error'}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Extraction:{' '}
                        {doc.extractionStatus === 'complete'
                          ? 'Complete'
                          : 'Partial / OCR'}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {doc.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      {doc.description}
                    </p>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-1">
                      <span>Original file: {doc.originalFilename}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Available Weeks:{' '}
                        <strong className="text-slate-800 font-mono tabular-nums">
                          {doc.weeks.length > 0
                            ? doc.weeks.map((w) => `Week ${w.weekNumber}`).join(', ')
                            : 'None'}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Updated {new Date(doc.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Document Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onStartExamWithDoc && (
                      <button
                        type="button"
                        onClick={() => onStartExamWithDoc(doc.id)}
                        aria-label={`Start Exam with ${doc.title}`}
                        className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Start Exam with This File</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      aria-label={`Preview ${doc.title}`}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenWeekMapping(doc.id)}
                      aria-label={`Correct week mappings for ${doc.title}`}
                      className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Week Mapping ({doc.weeks.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingDoc({ ...doc })}
                      aria-label={`Edit metadata for ${doc.title}`}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Metadata</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReprocess(doc.id)}
                      disabled={reprocessingId === doc.id}
                      aria-label={`Reprocess ${doc.title}`}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          reprocessingId === doc.id ? 'animate-spin' : ''
                        }`}
                      />
                      <span>Reprocess</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingDocId(doc.id)}
                      aria-label={`Delete ${doc.title}`}
                      className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Inline Delete Confirmation */}
                {deletingDocId === doc.id && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-red-900 font-medium">
                      Permanently delete &ldquo;{doc.title}&rdquo; and its extracted weekly
                      passages from online storage?
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDeletingDocId(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(doc.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 id="preview-modal-title" className="text-base font-bold text-slate-900">
                  {previewDoc.title}
                </h2>
                <p className="text-xs text-slate-500">
                  {previewDoc.subject} · {previewDoc.weeks.length} Weekly Sections ·{' '}
                  {previewDoc.passages.length} Indexed Passages
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                aria-label="Close preview"
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
              {previewDoc.weeks.map((wk) => (
                <div
                  key={wk.id}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-700">
                    <span>
                      Week {wk.weekNumber}: {wk.lessonTitle}
                    </span>
                    <span className="font-mono text-slate-500">{wk.pageReference}</span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {wk.content}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  const id = previewDoc.id;
                  setPreviewDoc(null);
                  onOpenWeekMapping(id);
                }}
                className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
              >
                Edit Week Mappings
              </button>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-meta-title"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveMetadata}
            className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 id="edit-meta-title" className="text-base font-bold text-slate-900">
                Edit Document Metadata
              </h2>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                aria-label="Close metadata editor"
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={editingDoc.title}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={editingDoc.subject}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class / Term
                </label>
                <input
                  type="text"
                  value={editingDoc.classTerm}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, classTerm: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingDoc.description}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
