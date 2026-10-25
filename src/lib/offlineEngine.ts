import {
  ExamAttempt,
  ExamConfiguration,
  ExamQuestion,
  PublicExamQuestion,
  StudyDocument,
} from '../types/cbt';
import {
  filterPassagesBySelection,
  gradeExaminationAttempt,
  stripAnswerKeyForClient,
  synthesizeGroundedQuestionsFromPassages,
} from './cbtLogic';

const IDB_NAME = 'scholars_cbt_offline_v2';
const IDB_VERSION = 2;
const STORE_PACKS = 'subject_packs';
const STORE_ATTEMPTS = 'offline_attempts';
const STORE_QUEUE = 'sync_queue';

const LS_ACTIVE_ATTEMPTS_KEY = 'scholars_cbt_recoverable_attempts_v2';

export interface OfflineSubjectPack {
  subject: string;
  documents: StudyDocument[];
  questionPool: ExamQuestion[];
  downloadedAt: string;
  sizeEstimateBytes: number;
}

export interface QueuedAttemptSubmission {
  attemptId: string;
  studentId?: string;
  attempt: ExamAttempt;
  fullQuestions: ExamQuestion[];
  queuedAt: string;
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PACKS)) {
        db.createObjectStore(STORE_PACKS, { keyPath: 'subject' });
      }
      if (!db.objectStoreNames.contains(STORE_ATTEMPTS)) {
        db.createObjectStore(STORE_ATTEMPTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'attemptId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

function readLocalMirrorAttempts(): Record<string, ExamAttempt> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(LS_ACTIVE_ATTEMPTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalMirrorAttempt(attempt: ExamAttempt): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const map = readLocalMirrorAttempts();
    if (attempt.status === 'submitted' || attempt.status === 'expired') {
      // Keep record Marked as submitted/expired so stale in_progress never revives
      map[attempt.id] = {
        ...attempt,
        lastSavedAt: attempt.lastSavedAt || new Date().toISOString(),
      };
    } else {
      map[attempt.id] = {
        ...attempt,
        lastSavedAt: attempt.lastSavedAt || new Date().toISOString(),
      };
    }
    // Prune older completed entries if > 20 to avoid quota issues
    const keys = Object.keys(map);
    if (keys.length > 20) {
      const completedKeys = keys.filter((k) => map[k].status !== 'in_progress');
      for (const ck of completedKeys.slice(0, keys.length - 20)) {
        delete map[ck];
      }
    }
    window.localStorage.setItem(LS_ACTIVE_ATTEMPTS_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export async function saveOfflineSubjectPack(
  subject: string,
  documents: StudyDocument[]
): Promise<OfflineSubjectPack> {
  const subjectDocs = documents.filter(
    (d) => d.subject === subject && d.processingStatus === 'ready'
  );
  if (subjectDocs.length === 0) {
    throw new Error(`No ready curriculum documents found for ${subject}.`);
  }

  const selections = subjectDocs.map((d) => ({
    documentId: d.id,
    subject: d.subject,
    documentTitle: d.title,
    selectedWeeks: d.weeks.map((w) => w.weekNumber),
  }));
  const passages = filterPassagesBySelection(subjectDocs, selections);
  const titleMap: Record<string, string> = {};
  for (const d of subjectDocs) {
    titleMap[d.id] = d.title;
  }

  const rawQuestions = synthesizeGroundedQuestionsFromPassages(
    passages,
    titleMap,
    100,
    'High difficulty',
    { shuffleQuestions: true, shuffleOptions: true, seed: Date.now() }
  );

  const questionPool: ExamQuestion[] = rawQuestions.map((vq) => ({
    id: vq.id,
    sourceDocumentId: vq.sourceDocumentId,
    sourceDocumentTitle: vq.sourceDocumentTitle,
    subject: vq.subject,
    weekNumber: vq.weekNumber,
    sectionHeading: vq.sectionHeading,
    pageReference: vq.pageReference,
    cognitiveCategory: vq.cognitiveCategory,
    difficultyLevel: vq.difficultyLevel,
    questionText: vq.questionText,
    options: vq.options,
    correctOptionId: vq.correctOptionId,
    explanation: {
      correctRationale: vq.explanation,
      distractorExplanations: vq.distractorFeedback,
      conceptToReview: vq.conceptToRevisit,
      supportingExcerpt: vq.supportingExcerpt,
    },
  }));

  const serialized = JSON.stringify({ subjectDocs, questionPool });
  const pack: OfflineSubjectPack = {
    subject,
    documents: subjectDocs,
    questionPool,
    downloadedAt: new Date().toISOString(),
    sizeEstimateBytes: serialized.length,
  };

  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PACKS, 'readwrite');
    tx.objectStore(STORE_PACKS).put(pack);
    tx.oncomplete = () => resolve(pack);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllOfflineSubjectPacks(): Promise<OfflineSubjectPack[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PACKS, 'readonly');
      const req = tx.objectStore(STORE_PACKS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteOfflineSubjectPack(subject: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PACKS, 'readwrite');
    tx.objectStore(STORE_PACKS).delete(subject);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function createOfflineExamAttempt(
  config: ExamConfiguration,
  fallbackDocs: StudyDocument[],
  studentId?: string
): Promise<{ attempt: ExamAttempt; fullQuestions: ExamQuestion[] }> {
  const packs = await getAllOfflineSubjectPacks();
  const packDocs: StudyDocument[] = [];
  for (const p of packs) {
    for (const d of p.documents) {
      if (!packDocs.some((existing) => existing.id === d.id)) {
        packDocs.push(d);
      }
    }
  }
  const allDocs = packDocs.length > 0 ? packDocs : fallbackDocs;
  const passages = filterPassagesBySelection(allDocs, config.selections);
  if (passages.length === 0) {
    throw new Error(
      'Selected weeks are not cached for offline use. Please download the Subject Pack while online.'
    );
  }

  const titleMap: Record<string, string> = {};
  for (const d of allDocs) {
    titleMap[d.id] = d.title;
  }

  const rawQuestions = synthesizeGroundedQuestionsFromPassages(
    passages,
    titleMap,
    config.questionCount,
    config.difficulty,
    {
      shuffleQuestions: config.shuffleQuestions !== false,
      shuffleOptions: config.shuffleOptions !== false,
      seed: Date.now(),
    }
  );

  const fullQuestions: ExamQuestion[] = rawQuestions.map((vq) => ({
    id: vq.id,
    sourceDocumentId: vq.sourceDocumentId,
    sourceDocumentTitle: vq.sourceDocumentTitle,
    subject: vq.subject,
    weekNumber: vq.weekNumber,
    sectionHeading: vq.sectionHeading,
    pageReference: vq.pageReference,
    cognitiveCategory: vq.cognitiveCategory,
    difficultyLevel: vq.difficultyLevel,
    questionText: vq.questionText,
    options: vq.options,
    correctOptionId: vq.correctOptionId,
    explanation: {
      correctRationale: vq.explanation,
      distractorExplanations: vq.distractorFeedback,
      conceptToReview: vq.conceptToRevisit,
      supportingExcerpt: vq.supportingExcerpt,
    },
  }));

  const publicQuestions: PublicExamQuestion[] = stripAnswerKeyForClient(rawQuestions);
  const now = Date.now();
  const startedAt = new Date(now).toISOString();
  const deadlineAt = new Date(now + config.durationMinutes * 60 * 1000).toISOString();

  const attempt: ExamAttempt = {
    id: `offline-att-${now}`,
    studentId,
    config,
    status: 'in_progress',
    startedAt,
    deadlineAt,
    lastSavedAt: startedAt,
    revision: 1,
    currentQuestionIndex: 0,
    responses: {},
    questions: publicQuestions,
    syncedOffline: true,
    localSyncState: 'saved_local',
  };

  await saveOfflineAttemptProgress(attempt, fullQuestions);
  return { attempt, fullQuestions };
}

/**
 * Persists an active or completed attempt to both localStorage mirror and IndexedDB.
 * Returns true if at least one local persistence layer succeeded.
 */
export async function saveOfflineAttemptProgress(
  attempt: ExamAttempt,
  fullQuestions?: ExamQuestion[]
): Promise<boolean> {
  const stampedAttempt: ExamAttempt = {
    ...attempt,
    lastSavedAt: attempt.lastSavedAt || new Date().toISOString(),
    revision: (attempt.revision || 0) + 1,
  };

  const mirrorOk = writeLocalMirrorAttempt(stampedAttempt);

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readwrite');
      const store = tx.objectStore(STORE_ATTEMPTS);
      const getReq = store.get(stampedAttempt.id);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        store.put({
          id: stampedAttempt.id,
          studentId: stampedAttempt.studentId || existing?.studentId,
          attempt: stampedAttempt,
          fullQuestions: fullQuestions || existing?.fullQuestions || [],
          updatedAt: stampedAttempt.lastSavedAt,
        });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    return mirrorOk;
  }
}

export async function getLocalRecoverableAttemptById(
  attemptId: string,
  studentId?: string
): Promise<ExamAttempt | null> {
  const mirror = readLocalMirrorAttempts()[attemptId];
  let idbAttempt: ExamAttempt | null = null;

  try {
    const db = await openOfflineDB();
    const record: any = await new Promise((resolve) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readonly');
      const req = tx.objectStore(STORE_ATTEMPTS).get(attemptId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (record?.attempt) {
      idbAttempt = record.attempt;
    }
  } catch {
    // Fallback to mirror
  }

  const candidate = pickNewestAttemptVersion(mirror || null, idbAttempt);
  if (!candidate) return null;

  // Enforce student ownership isolation when both studentIds are present
  if (studentId && candidate.studentId && candidate.studentId !== studentId) {
    return null;
  }
  return candidate;
}

export function pickNewestAttemptVersion(
  a: ExamAttempt | null,
  b: ExamAttempt | null
): ExamAttempt | null {
  if (!a) return b;
  if (!b) return a;

  // Completed status always wins over in_progress so completed attempts never reopen
  if (a.status !== 'in_progress' && b.status === 'in_progress') return a;
  if (b.status !== 'in_progress' && a.status === 'in_progress') return b;

  const revA = a.revision || 0;
  const revB = b.revision || 0;
  const respCountA = Object.keys(a.responses || {}).length;
  const respCountB = Object.keys(b.responses || {}).length;

  if (respCountA !== respCountB) {
    return respCountA > respCountB ? a : b;
  }
  if (revA !== revB) {
    return revA > revB ? a : b;
  }

  const timeA = a.lastSavedAt ? new Date(a.lastSavedAt).getTime() : 0;
  const timeB = b.lastSavedAt ? new Date(b.lastSavedAt).getTime() : 0;
  return timeA >= timeB ? a : b;
}

/**
 * Reconciles the server's attempts list with locally persisted attempt states for the current student.
 * Ensures that if the student refreshed or lost connectivity mid-exam, the latest responses and
 * currentQuestionIndex are restored, while submitted/expired attempts are never reopened.
 */
export async function reconcileRecoverableAttempts(
  serverAttempts: ExamAttempt[],
  studentId?: string
): Promise<ExamAttempt[]> {
  const mirrorMap = readLocalMirrorAttempts();
  const idbList: ExamAttempt[] = [];

  try {
    const db = await openOfflineDB();
    const rows: any[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readonly');
      const req = tx.objectStore(STORE_ATTEMPTS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    for (const r of rows) {
      if (r?.attempt) idbList.push(r.attempt);
    }
  } catch {
    // Ignore IDB failure
  }

  const localMap = new Map<string, ExamAttempt>();
  for (const att of Object.values(mirrorMap)) {
    if (!studentId || att.studentId === studentId) {
      localMap.set(att.id, att);
    }
  }
  for (const att of idbList) {
    if (!studentId || att.studentId === studentId) {
      const existing = localMap.get(att.id) || null;
      const newest = pickNewestAttemptVersion(existing, att);
      if (newest) localMap.set(att.id, newest);
    }
  }

  const mergedMap = new Map<string, ExamAttempt>();
  for (const sAtt of serverAttempts) {
    if (studentId && sAtt.studentId !== studentId) {
      continue;
    }
    const localVer = localMap.get(sAtt.id) || null;
    if (!localVer) {
      mergedMap.set(sAtt.id, sAtt);
    } else {
      // Server deadlineAt and startedAt are authoritative; merge newest responses & index if still in_progress
      if (sAtt.status !== 'in_progress') {
        mergedMap.set(sAtt.id, sAtt);
      } else if (localVer.status !== 'in_progress') {
        mergedMap.set(sAtt.id, localVer);
      } else {
        const newest = pickNewestAttemptVersion(sAtt, localVer)!;
        mergedMap.set(sAtt.id, {
          ...sAtt,
          currentQuestionIndex: newest.currentQuestionIndex,
          responses: { ...sAtt.responses, ...newest.responses },
          lastSavedAt: newest.lastSavedAt || sAtt.lastSavedAt,
          revision: Math.max(sAtt.revision || 0, newest.revision || 0),
          localSyncState: newest.localSyncState,
        });
      }
    }
  }

  // Also include purely offline attempts created while disconnected
  for (const [id, lAtt] of localMap.entries()) {
    if (!mergedMap.has(id) && id.startsWith('offline-att-')) {
      mergedMap.set(id, lAtt);
    }
  }

  return Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

export async function gradeOfflineExamAttempt(
  attemptId: string,
  trigger: 'manual' | 'timer_expired'
): Promise<ExamAttempt> {
  const db = await openOfflineDB();
  const record: { attempt: ExamAttempt; fullQuestions: ExamQuestion[] } | undefined =
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readonly');
      const req = tx.objectStore(STORE_ATTEMPTS).get(attemptId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  if (!record) {
    throw new Error('Offline attempt not found in local IndexedDB storage.');
  }

  const submittedAt = new Date().toISOString();
  const validatedQuestions = record.fullQuestions.map((fq) => ({
    id: fq.id,
    sourceDocumentId: fq.sourceDocumentId,
    sourceDocumentTitle: fq.sourceDocumentTitle,
    subject: fq.subject,
    weekNumber: fq.weekNumber,
    sectionHeading: fq.sectionHeading,
    pageReference: fq.pageReference,
    supportingExcerpt: fq.explanation.supportingExcerpt,
    cognitiveCategory: fq.cognitiveCategory,
    difficultyLevel: fq.difficultyLevel,
    questionText: fq.questionText,
    options: fq.options,
    correctOptionId: fq.correctOptionId,
    explanation: fq.explanation.correctRationale,
    distractorFeedback: fq.explanation.distractorExplanations,
    conceptToRevisit: fq.explanation.conceptToReview,
  }));

  const result = gradeExaminationAttempt(
    record.attempt,
    validatedQuestions,
    trigger,
    submittedAt
  );

  const completedAttempt: ExamAttempt = {
    ...record.attempt,
    status: trigger === 'timer_expired' ? 'expired' : 'submitted',
    submittedAt,
    lastSavedAt: submittedAt,
    result,
    syncedOffline: true,
    localSyncState: 'saved_local',
  };

  writeLocalMirrorAttempt(completedAttempt);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_ATTEMPTS, STORE_QUEUE], 'readwrite');
    tx.objectStore(STORE_ATTEMPTS).put({
      id: completedAttempt.id,
      studentId: completedAttempt.studentId,
      attempt: completedAttempt,
      fullQuestions: record.fullQuestions,
      updatedAt: submittedAt,
    });
    tx.objectStore(STORE_QUEUE).put({
      attemptId: completedAttempt.id,
      studentId: completedAttempt.studentId,
      attempt: completedAttempt,
      fullQuestions: record.fullQuestions,
      queuedAt: submittedAt,
    } satisfies QueuedAttemptSubmission);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return completedAttempt;
}

export async function getQueuedOfflineSubmissions(): Promise<QueuedAttemptSubmission[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const req = tx.objectStore(STORE_QUEUE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function clearQueuedOfflineSubmission(attemptId: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).delete(attemptId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


// --- Offline Subject Reserve & Pending Attempt Sync Helpers ---
import {
  DifficultyLevel,
  OfflineSubjectReserve,
  StudentProfile,
  ValidatedQuestion,
} from '../types/cbt';

const LS_RESERVES_KEY = 'scholars_cbt_offline_reserves_v2';

export async function getAllOfflineSubjectReserves(): Promise<OfflineSubjectReserve[]> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LS_RESERVES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // Ignore storage read error
  }
  return [];
}

export async function saveOfflineSubjectReserve(reserve: OfflineSubjectReserve): Promise<void> {
  try {
    const existing = await getAllOfflineSubjectReserves();
    const filtered = existing.filter(
      (r) => r.subject.toLowerCase() !== reserve.subject.toLowerCase()
    );
    filtered.unshift(reserve);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LS_RESERVES_KEY, JSON.stringify(filtered));
    }
  } catch {
    // Ignore storage quota error
  }
}

export async function createOfflineExamAttemptFromReserve(params: {
  subject: string;
  questionCount: number;
  durationMinutes: 15 | 30 | 45 | 60 | 75 | 90 | 120;
  difficulty: DifficultyLevel;
  profile: StudentProfile;
}): Promise<{ attempt: ExamAttempt; answerKey: ValidatedQuestion[] }> {
  const reserves = await getAllOfflineSubjectReserves();
  const match = reserves.find(
    (r) => r.subject.toLowerCase() === params.subject.toLowerCase()
  );
  if (!match || !Array.isArray(match.questions) || match.questions.length === 0) {
    throw new Error(`No offline reserve found on device for ${params.subject}.`);
  }

  const count = Math.min(params.questionCount, match.questions.length);
  const answerKey = match.questions.slice(0, count);
  const publicQuestions = stripAnswerKeyForClient(answerKey);
  const now = Date.now();
  const startedAt = new Date(now).toISOString();
  const deadlineAt = new Date(now + params.durationMinutes * 60 * 1000).toISOString();

  const attempt: ExamAttempt = {
    id: `offline-att-${now}`,
    studentId: params.profile.id,
    config: {
      id: `cfg-offline-${now}`,
      title: `${match.subject} — Offline CBT Practice (${count} Questions)`,
      selections: [
        {
          documentId: match.documentId,
          subject: match.subject,
          documentTitle: match.documentTitle,
          selectedWeeks: [1, 2, 3, 4, 5, 6],
        },
      ],
      questionCount: count,
      durationMinutes: params.durationMinutes,
      difficulty: params.difficulty,
      createdAt: startedAt,
    },
    status: 'in_progress',
    startedAt,
    deadlineAt,
    lastSavedAt: startedAt,
    revision: 1,
    currentQuestionIndex: 0,
    responses: {},
    questions: publicQuestions,
    syncedOffline: true,
    isOfflineAttempt: true,
    syncStatus: 'pending_sync',
    localSyncState: 'saved_local',
  };

  await saveOfflineAttemptProgress(attempt);
  return { attempt, answerKey };
}

export async function getAllOfflinePendingAttempts(): Promise<
  Array<{
    attemptId: string;
    attempt: ExamAttempt;
    answerKey?: ValidatedQuestion[];
    syncStatus: 'pending_sync' | 'synced';
  }>
> {
  const queued = await getQueuedOfflineSubmissions();
  return queued.map((q) => ({
    attemptId: q.attemptId,
    attempt: q.attempt,
    answerKey: q.fullQuestions as unknown as ValidatedQuestion[],
    syncStatus: 'pending_sync',
  }));
}

export async function syncPendingOfflineAttemptsWithServer(): Promise<{
  syncedCount: number;
}> {
  const queued = await getQueuedOfflineSubmissions();
  let syncedCount = 0;
  for (const item of queued) {
    try {
      const res = await fetch('/api/attempts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attempt: item.attempt,
          answerKey: item.fullQuestions,
        }),
      });
      if (res.ok) {
        await clearQueuedOfflineSubmission(item.attemptId);
        syncedCount++;
      }
    } catch {
      // Remain queued until next reconnect
    }
  }
  return { syncedCount };
}
