import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AuthUserAccount,
  ExamAttempt,
  GenerationBatchJob,
  OptionId,
  QuestionBankItem,
  StudentProfile,
  StudyDocument,
  ValidatedQuestion,
} from '../types/cbt';
import {
  detectWeeklySections,
  evaluateQuestionBankValidation,
  filterPassagesBySelection,
  gradeExaminationAttempt,
  stripAnswerKeyForClient,
  synthesizeGroundedQuestionsFromPassages,
} from '../lib/cbtLogic';
import { hashPasswordWithSalt } from '../lib/security';
import { GRADE_7_CURRICULUM_DOCUMENTS, SeedCurriculumDoc } from './seedCurriculum';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PUBLIC_ASSETS_DIR = path.resolve(process.cwd(), 'public', 'assets', 'aistudio');
const DB_FILE_PATH = path.join(DATA_DIR, 'scholarcbt_db.json');
const CURRENT_DB_VERSION = 15;

export interface DatabaseSchema {
  version: number;
  serverSecret?: string;
  users?: Record<string, AuthUserAccount>;
  profile: StudentProfile;
  documents: StudyDocument[];
  questionBank: QuestionBankItem[];
  generationJobs: GenerationBatchJob[];
  attempts: ExamAttempt[];
  answerKeys: Record<string, ValidatedQuestion[]>;
}

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function materializeSeedDocument(seed: SeedCurriculumDoc, nowIso: string): StudyDocument {
  const destPath = path.join(UPLOADS_DIR, seed.originalFilename);
  const publicPdfPath = path.join(PUBLIC_ASSETS_DIR, seed.originalFilename);

  if (fs.existsSync(publicPdfPath)) {
    try {
      fs.copyFileSync(publicPdfPath, destPath);
    } catch {
      fs.writeFileSync(destPath, seed.rawText, 'utf-8');
    }
  } else {
    fs.writeFileSync(destPath, seed.rawText, 'utf-8');
  }

  const stats = fs.statSync(destPath);
  const { weeks, passages } = detectWeeklySections(seed.id, seed.subject, seed.rawText, false);

  return {
    id: seed.id,
    title: seed.title,
    subject: seed.subject,
    classTerm: seed.classTerm,
    description: seed.description,
    originalFilename: seed.originalFilename,
    fileType: seed.fileType || 'PDF',
    fileSizeBytes: stats.size,
    uploadDate: nowIso,
    lastUpdated: nowIso,
    processingStatus: 'ready',
    extractionStatus: 'complete',
    storagePath: seed.storagePath || destPath,
    rawText: seed.rawText,
    weeks,
    passages,
  };
}

export function buildQuestionBankForDocument(
  doc: StudyDocument,
  existingStemsMap?: Map<string, string>,
  requestedPerDoc: number = 50
): QuestionBankItem[] {
  const nowIso = new Date().toISOString();
  const titleLookup: Record<string, string> = { [doc.id]: doc.title };
  const synthesized = synthesizeGroundedQuestionsFromPassages(
    doc.passages,
    titleLookup,
    requestedPerDoc,
    'High difficulty',
    { seed: 42, iteration: 1 }
  );

  const stemMap = existingStemsMap || new Map<string, string>();
  const items: QuestionBankItem[] = [];

  for (const q of synthesized) {
    const bankId = `qb-${doc.id}-${q.id}`;
    const report = evaluateQuestionBankValidation({ ...q, id: bankId }, stemMap);
    const normStem = q.questionText.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!stemMap.has(normStem)) {
      stemMap.set(normStem, bankId);
    }
    items.push({
      ...q,
      id: bankId,
      bankStatus: report.overallValid ? 'Approved' : 'Needs Review',
      validationReport: report,
      createdAt: nowIso,
      updatedAt: nowIso,
      approvedBy: report.overallValid ? 'Automated 12-Point Quality Validator' : undefined,
      usageCount: 0,
      tags: [`Week ${q.weekNumber}`, doc.subject],
    });
  }

  return items;
}

function buildQuestionBankFromDocuments(documents: StudyDocument[]): {
  questionBank: QuestionBankItem[];
  generationJobs: GenerationBatchJob[];
} {
  const nowIso = new Date().toISOString();
  const stemMap = new Map<string, string>();
  const questionBank: QuestionBankItem[] = [];
  const generationJobs: GenerationBatchJob[] = [];

  for (const doc of documents) {
    const items = buildQuestionBankForDocument(doc, stemMap, 50);
    questionBank.push(...items);
    const approvedCount = items.filter((i) => i.bankStatus === 'Approved').length;
    generationJobs.push({
      id: `job-seed-${doc.id}`,
      subject: doc.subject,
      documentId: doc.id,
      documentTitle: doc.title,
      weeks: doc.weeks.map((w) => w.weekNumber),
      requestedCount: 50,
      generatedCount: items.length,
      approvedCount,
      status: 'completed',
      createdAt: nowIso,
    });
  }

  return { questionBank, generationJobs };
}

/**
 * Saves all questions from a completed exam into the Question Bank AND generates a brand-new set
 * of 50 MCQs from the uploaded subject document(s) tested in that exam, saving them to the Question Bank.
 */
export function saveExamQuestionsAndGenerateNext50MCQs(
  db: DatabaseSchema,
  attempt: ExamAttempt,
  examQuestions: ValidatedQuestion[]
): { savedFromExamCount: number; newlyGeneratedCount: number } {
  const nowIso = new Date().toISOString();
  const stemMap = new Map<string, string>();
  const existingAvoidStems = new Set<string>();

  for (const item of db.questionBank) {
    const norm = item.questionText.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    stemMap.set(norm, item.id);
    existingAvoidStems.add(item.questionText.toLowerCase().trim());
  }

  let savedFromExamCount = 0;

  // 1. Save every question from the finished exam into db.questionBank if not already stored
  for (let idx = 0; idx < examQuestions.length; idx++) {
    const q = examQuestions[idx];
    const normStem = q.questionText.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const existingId = stemMap.get(normStem);
    if (existingId) {
      const found = db.questionBank.find((b) => b.id === existingId);
      if (found) {
        found.usageCount = (found.usageCount || 0) + 1;
        found.updatedAt = nowIso;
      }
      continue;
    }

    const bankId = `qb-exam-${attempt.id}-${idx + 1}`;
    const report = evaluateQuestionBankValidation({ ...q, id: bankId }, stemMap);
    stemMap.set(normStem, bankId);
    existingAvoidStems.add(q.questionText.toLowerCase().trim());

    db.questionBank.unshift({
      ...q,
      id: bankId,
      bankStatus: 'Approved',
      validationReport: report,
      createdAt: nowIso,
      updatedAt: nowIso,
      approvedBy: 'Post-Exam Question Bank Archiver',
      usageCount: 1,
      tags: [`Week ${q.weekNumber}`, q.subject, 'Exam Archive'],
    });
    savedFromExamCount++;
  }

  // 2. Generate a fresh set of 50 new MCQs from the subject document(s) tested in this exam
  const selections = attempt.config.selections || [];
  let targetPassages = filterPassagesBySelection(db.documents, selections);
  if (targetPassages.length === 0 && selections.length > 0) {
    const docIds = new Set(selections.map((s) => s.documentId));
    for (const d of db.documents) {
      if (docIds.has(d.id)) {
        targetPassages.push(...d.passages);
      }
    }
  }
  if (targetPassages.length === 0 && db.documents.length > 0) {
    targetPassages = db.documents[0].passages;
  }

  let newlyGeneratedCount = 0;
  if (targetPassages.length > 0) {
    const titleLookup: Record<string, string> = {};
    for (const d of db.documents) {
      titleLookup[d.id] = d.title;
    }

    const nextIteration = (db.generationJobs?.length || 0) + (db.attempts?.length || 0) + 2;
    const nextSeed = Date.now() % 100000;

    const new50Questions = synthesizeGroundedQuestionsFromPassages(
      targetPassages,
      titleLookup,
      50,
      attempt.config.difficulty || 'High difficulty',
      {
        iteration: nextIteration,
        seed: nextSeed,
        avoidStems: existingAvoidStems,
        shuffleQuestions: true,
        shuffleOptions: true,
      }
    );

    const newBankItems: QuestionBankItem[] = [];
    for (let i = 0; i < new50Questions.length; i++) {
      const nq = new50Questions[i];
      const bankId = `qb-autogen-${attempt.id}-${i + 1}`;
      const report = evaluateQuestionBankValidation({ ...nq, id: bankId }, stemMap);
      const normStem = nq.questionText.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      stemMap.set(normStem, bankId);
      existingAvoidStems.add(nq.questionText.toLowerCase().trim());

      newBankItems.push({
        ...nq,
        id: bankId,
        bankStatus: 'Approved',
        validationReport: report,
        createdAt: nowIso,
        updatedAt: nowIso,
        approvedBy: 'Post-Exam 50-MCQ Auto-Generator',
        usageCount: 0,
        tags: [`Week ${nq.weekNumber}`, nq.subject, 'Auto-Generated 50 Batch'],
      });
    }

    db.questionBank.unshift(...newBankItems);
    newlyGeneratedCount = newBankItems.length;

    const primaryDoc =
      db.documents.find((d) => d.id === selections[0]?.documentId) || db.documents[0];
    const weeksList = Array.from(new Set(targetPassages.map((p) => p.weekNumber))).sort(
      (a, b) => a - b
    );

    if (!Array.isArray(db.generationJobs)) {
      db.generationJobs = [];
    }
    db.generationJobs.unshift({
      id: `job-postexam-${attempt.id}`,
      subject: primaryDoc?.subject || 'Multi-Subject',
      documentId: primaryDoc?.id || 'doc-multi',
      documentTitle: primaryDoc?.title || 'Uploaded Subject Curriculum',
      weeks: weeksList,
      requestedCount: 50,
      generatedCount: newlyGeneratedCount,
      approvedCount: newlyGeneratedCount,
      status: 'completed',
      createdAt: nowIso,
    });
  }

  return { savedFromExamCount, newlyGeneratedCount };
}

function createInitialDatabase(): DatabaseSchema {
  ensureDirectories();
  const nowIso = new Date().toISOString();

  const documents: StudyDocument[] = GRADE_7_CURRICULUM_DOCUMENTS.map((seed) =>
    materializeSeedDocument(seed, nowIso)
  );

  const { questionBank, generationJobs } = buildQuestionBankFromDocuments(documents);

  const defaultHashed = hashPasswordWithSalt('ScholarGrade7!');
  const initialDb: DatabaseSchema = {
    version: CURRENT_DB_VERSION,
    serverSecret: crypto.randomBytes(32).toString('hex'),
    users: {
      'chizobaolueze@gmail.com': {
        id: 'student-grade7-primary',
        studentName: 'Chizoba Olueze',
        email: 'chizobaolueze@gmail.com',
        role: 'student',
        passwordHash: defaultHashed.hash,
        passwordSalt: defaultHashed.salt,
        gradeLevel: 'Grade 7 (JSS 1)',
        schoolTerm: 'First Term · 2026/2027 Academic Session',
        verifiedAt: nowIso,
        createdAt: nowIso,
        lastLoginAt: nowIso,
        unlockedAchievements: [],
        masteredQuestionIds: [],
      },
      'teacher@scholarcbt.edu': {
        id: 'admin-teacher-primary',
        studentName: 'Mrs. Adebayo (Assessment Coordinator)',
        email: 'teacher@scholarcbt.edu',
        role: 'admin',
        passwordHash: defaultHashed.hash,
        passwordSalt: defaultHashed.salt,
        gradeLevel: 'Grade 7 Assessment Coordinator',
        schoolTerm: 'First Term · 2026/2027 Academic Session',
        verifiedAt: nowIso,
        createdAt: nowIso,
        lastLoginAt: nowIso,
        unlockedAchievements: [],
        masteredQuestionIds: [],
      },
    },
    profile: {
      id: 'student-grade7-primary',
      studentName: 'Chizoba Olueze',
      email: 'chizobaolueze@gmail.com',
      role: 'student',
      gradeLevel: 'Grade 7 (JSS 1)',
      schoolTerm: 'First Term · 2026/2027 Academic Session',
      defaultQuestionCount: 50,
      defaultDurationMinutes: 60,
      defaultDifficulty: 'High difficulty',
      autoAdvanceOnSelect: false,
      highContrastMode: false,
      examCoverageMode: 'full_subject',
      marksPerQuestion: 1,
      negativeMarkingPenalty: 0,
      passMarkPercentage: 50,
      shuffleQuestions: true,
      shuffleOptions: true,
      allowAnswerChange: true,
      navigationMode: 'free',
      timeoutBehaviour: 'auto_submit',
      enablePostExamReview: true,
      enableSourceDisclosure: true,
      offlineReserveSize: 60,
      unlockedAchievements: [],
      masteredQuestionIds: [],
    },
    documents,
    questionBank,
    generationJobs,
    attempts: [],
    answerKeys: {},
  };

  saveDatabase(initialDb);
  return initialDb;
}

let cachedDb: DatabaseSchema | null = null;

export function getDatabase(): DatabaseSchema {
  if (cachedDb) return cachedDb;
  ensureDirectories();
  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (
        parsed &&
        parsed.version >= 2 &&
        Array.isArray(parsed.documents) &&
        Array.isArray(parsed.attempts)
      ) {
        let needsSave = false;
        if (!parsed.serverSecret) {
          parsed.serverSecret = crypto.randomBytes(32).toString('hex');
          needsSave = true;
        }
        if (!parsed.users) {
          const defaultHashed = hashPasswordWithSalt('ScholarGrade7!');
          const nowIso = new Date().toISOString();
          parsed.users = {
            'chizobaolueze@gmail.com': {
              id: parsed.profile?.id || 'student-grade7-primary',
              studentName: parsed.profile?.studentName || 'Chizoba Olueze',
              email: 'chizobaolueze@gmail.com',
              role: 'student',
              passwordHash: defaultHashed.hash,
              passwordSalt: defaultHashed.salt,
              gradeLevel: parsed.profile?.gradeLevel || 'Grade 7 (JSS 1)',
              schoolTerm:
                parsed.profile?.schoolTerm || 'First Term · 2026/2027 Academic Session',
              verifiedAt: nowIso,
              createdAt: nowIso,
              lastLoginAt: nowIso,
            },
          };
          needsSave = true;
        }
        if (parsed.users && !parsed.users['teacher@scholarcbt.edu']) {
          const defaultHashed = hashPasswordWithSalt('ScholarGrade7!');
          const nowIso = new Date().toISOString();
          parsed.users['teacher@scholarcbt.edu'] = {
            id: 'admin-teacher-primary',
            studentName: 'Mrs. Adebayo (Assessment Coordinator)',
            email: 'teacher@scholarcbt.edu',
            role: 'admin',
            passwordHash: defaultHashed.hash,
            passwordSalt: defaultHashed.salt,
            gradeLevel: 'Grade 7 Assessment Coordinator',
            schoolTerm: 'First Term · 2026/2027 Academic Session',
            verifiedAt: nowIso,
            createdAt: nowIso,
            lastLoginAt: nowIso,
          };
          needsSave = true;
        }

        if (parsed.profile) {
          parsed.profile.role = parsed.profile.role ?? 'student';
          parsed.profile.examCoverageMode = parsed.profile.examCoverageMode ?? 'full_subject';
          parsed.profile.marksPerQuestion = parsed.profile.marksPerQuestion ?? 1;
          parsed.profile.negativeMarkingPenalty = parsed.profile.negativeMarkingPenalty ?? 0;
          parsed.profile.passMarkPercentage = parsed.profile.passMarkPercentage ?? 50;
          parsed.profile.shuffleQuestions = parsed.profile.shuffleQuestions ?? true;
          parsed.profile.shuffleOptions = parsed.profile.shuffleOptions ?? true;
          parsed.profile.allowAnswerChange = parsed.profile.allowAnswerChange ?? true;
          parsed.profile.navigationMode = parsed.profile.navigationMode ?? 'free';
          parsed.profile.timeoutBehaviour = parsed.profile.timeoutBehaviour ?? 'auto_submit';
          parsed.profile.enablePostExamReview = parsed.profile.enablePostExamReview ?? true;
          parsed.profile.enableSourceDisclosure = parsed.profile.enableSourceDisclosure ?? true;
          parsed.profile.offlineReserveSize = parsed.profile.offlineReserveSize ?? 60;
        }

        if (parsed.version < CURRENT_DB_VERSION || !Array.isArray(parsed.questionBank)) {
          const nowIso = new Date().toISOString();

          // Ensure all 15 St. Francis JSS 1 First Term PDFs are loaded
          parsed.documents = GRADE_7_CURRICULUM_DOCUMENTS.map((seed) =>
            materializeSeedDocument(seed, nowIso)
          );

          const builtBank = buildQuestionBankFromDocuments(parsed.documents);
          parsed.questionBank = builtBank.questionBank;
          parsed.generationJobs = builtBank.generationJobs;

          // Clear pre-seeded / legacy exam history so users start with 0 attempts
          parsed.attempts = [];
          parsed.answerKeys = {};
          if (parsed.profile) {
            parsed.profile.unlockedAchievements = [];
            parsed.profile.masteredQuestionIds = [];
            parsed.profile.dailyCheckInDates = [];
          }
          if (parsed.users) {
            for (const u of Object.values(parsed.users)) {
              u.unlockedAchievements = [];
              u.masteredQuestionIds = [];
              u.dailyCheckInDates = [];
            }
          }

          parsed.version = CURRENT_DB_VERSION;
          needsSave = true;
        }
        if (needsSave) {
          saveDatabase(parsed);
        }
        cachedDb = parsed;
        return cachedDb;
      }
    } catch (err) {
      console.error('Error reading scholarcbt_db.json, re-initializing:', err);
    }
  }
  cachedDb = createInitialDatabase();
  return cachedDb;
}

export function saveDatabase(db: DatabaseSchema): void {
  ensureDirectories();
  cachedDb = db;
  const tempPath = `${DB_FILE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_FILE_PATH);
}

export function resetDatabaseToSeed(): DatabaseSchema {
  ensureDirectories();
  if (fs.existsSync(DB_FILE_PATH)) {
    fs.unlinkSync(DB_FILE_PATH);
  }
  cachedDb = null;
  return getDatabase();
}

export function getUploadsDir(): string {
  ensureDirectories();
  return UPLOADS_DIR;
}

export function getMisconceptionReport() {
  const db = getDatabase();
  const misconceptions: Record<
    string,
    {
      questionText: string;
      totalAttempts: number;
      distractors: Record<OptionId, number>;
    }
  > = {};

  for (const attempt of db.attempts) {
    if (!attempt.result || !attempt.result.distractorUsage) continue;

    for (const [questionId, distractorData] of Object.entries(attempt.result.distractorUsage)) {
      if (!misconceptions[questionId]) {
        const question = db.questionBank.find((q) => q.id === questionId);
        misconceptions[questionId] = {
          questionText: question ? question.questionText : 'Unknown Question',
          totalAttempts: 0,
          distractors: { A: 0, B: 0, C: 0, D: 0 },
        };
      }

      misconceptions[questionId].totalAttempts += 1;
      for (const [optionId, count] of Object.entries(distractorData)) {
        misconceptions[questionId].distractors[optionId as OptionId] += count;
      }
    }
  }

  return misconceptions;
}
