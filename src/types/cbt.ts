export type SubjectCategory =
  | 'Mathematics'
  | 'Basic Science'
  | 'English Language'
  | 'English Studies'
  | 'Social Studies'
  | 'Social & Citizenship Studies'
  | 'Civic Education'
  | 'Computer Studies'
  | 'Digital Technology'
  | 'Agricultural Science'
  | 'Horticulture & Crop Production'
  | 'Business Studies'
  | 'Home Economics'
  | 'Christian Religious Studies'
  | 'Physical & Health Education'
  | 'Cultural & Creative Arts'
  | 'Cultural & Creative Art'
  | 'Basic Technology'
  | 'French'
  | 'Yoruba'
  | 'Nigerian History'
  | 'History'
  | 'Music'
  | string;

export type OptionId = 'A' | 'B' | 'C' | 'D';

export type UserRole = 'student' | 'admin';

export type CognitiveCategory =
  | 'Recall and precise knowledge'
  | 'Conceptual understanding'
  | 'Application'
  | 'Analysis'
  | 'Multi-step reasoning and misconception detection';

export type DifficultyLevel =
  | 'Foundation'
  | 'Standard'
  | 'Advanced practice'
  | 'High difficulty'
  | 'Expert challenge';

export type DocumentProcessingStatus = 'uploading' | 'extracting' | 'ready' | 'needs_review' | 'error';

export type QuestionReviewStatus = 'draft' | 'approved' | 'rejected' | 'archived';

export type QuestionBankStatus = 'Draft' | 'Pending Validation' | 'Approved' | 'Needs Review' | 'Rejected' | 'Archived';

export type QuestionNavState =
  | 'not_visited'
  | 'unvisited'
  | 'visited_unanswered'
  | 'answered'
  | 'marked_for_review'
  | 'answered_and_marked';

export type ExamGradingMode = 'practice' | 'formal';

export type QuestionSelectionStrategy = 'random_all' | 'random_selected_weeks' | 'weak_areas';

export interface AuthUserAccount {
  id: string;
  studentName: string;
  email: string;
  role?: UserRole;
  passwordHash: string;
  passwordSalt: string;
  gradeLevel: string;
  schoolTerm: string;
  verifiedAt: string;
  createdAt: string;
  lastLoginAt: string;
  unlockedAchievements?: UnlockedAchievementRecord[];
  masteredQuestionIds?: string[];
  dailyCheckInDates?: string[];
  dailyRemindersEnabled?: boolean;
  dailyReminderTime?: string;
  soundEffectsEnabled?: boolean;
}

export interface PendingAuthChallenge {
  email: string;
  studentName: string;
  role?: UserRole;
  passwordHash: string;
  passwordSalt: string;
  mode: 'signup' | 'login' | 'reset';
  code: string;
  expiresAtMs: number;
  attempts: number;
}

export interface WeekSection {
  id: string;
  documentId?: string;
  weekNumber: number; // 1 to 12
  rawHeading?: string;
  detectedHeading?: string;
  lessonTitle: string;
  keyTopics?: string[];
  extractedText?: string;
  content: string;
  preview?: string;
  pageReference: string;
  confidence?: 'high' | 'medium' | 'needs_review';
  isConfirmed?: boolean;
  wordCount: number;
  passageCount: number;
}

export type WeeklySection = WeekSection;

export interface SourcePassage {
  id: string;
  documentId: string;
  subject: SubjectCategory;
  weekNumber: number; // 1 to 12
  sectionHeading: string;
  lessonTitle?: string;
  pageReference: string;
  statement?: string;
  content?: string;
  keyFacts?: string[];
  conceptTerm?: string;
  definitionOrProcess?: string;
  contextualDetail?: string;
  numericFact?: string | null;
}

export interface ExtractedPassage {
  id: string;
  documentId: string;
  subject: string;
  weekNumber: number;
  sectionHeading: string;
  lessonTitle: string;
  pageReference: string;
  content: string;
  keyFacts: string[];
}

export interface StudyDocument {
  id: string;
  title: string;
  subject: SubjectCategory;
  classTerm: string;
  description: string;
  originalFilename: string;
  fileType: 'PDF' | 'DOCX' | 'TXT' | 'MD' | string;
  fileSizeBytes: number;
  uploadDate: string;
  lastUpdated: string;
  processingStatus: DocumentProcessingStatus;
  extractionStatus: 'complete' | 'partial' | 'partial_ocr' | 'failed';
  errorMessage?: string;
  storagePath: string;
  rawText: string;
  weeks: WeekSection[];
  passages: any[];
}

export interface QuestionOption {
  id: OptionId;
  text: string;
}

export type DistractorExplanations = {
  A: string;
  B: string;
  C: string;
  D: string;
};

export interface QuestionExplanation {
  correctRationale: string;
  distractorExplanations: DistractorExplanations;
  conceptToReview: string;
  supportingExcerpt: string;
}

export interface QuestionValidationChecklist {
  singleCorrectOption: boolean;
  fourDistinctOptions: boolean;
  grammaticalParallelism: boolean;
  balancedOptionLength: boolean;
  noAllOrNoneOfTheAbove: boolean;
  noTrickNegatives: boolean;
  clearQuestionStem: boolean;
  curriculumAligned: boolean;
  grade7Appropriate: boolean;
  completeExplanation: boolean;
  validTopicAndWeekTag: boolean;
  noDuplicateFound: boolean;
  overallValid: boolean;
  issues: string[];
}

export interface QuestionValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  note: string;
}

export interface QuestionValidationReport {
  overallValid: boolean;
  passedCount: number;
  totalChecks: number;
  scoreOutOf12?: number;
  checks: QuestionValidationCheck[];
  issues?: string[];
  duplicateOfQuestionId?: string | null;
}

export interface ValidatedQuestion {
  id: string;
  questionNumber?: number;
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  subject: SubjectCategory;
  weekNumber: number;
  sectionHeading: string;
  pageReference: string;
  supportingExcerpt: string;
  cognitiveCategory: CognitiveCategory;
  difficultyLevel: DifficultyLevel;
  questionText: string;
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption];
  correctOptionId: OptionId;
  explanation: any;
  distractorFeedback?: DistractorExplanations;
  distractorRationales?: DistractorExplanations;
  conceptToRevisit?: string;
  validationStatus?: 'validated' | 'needs_review';
  malformedLatexFlag?: boolean;
  malformedLatexNote?: string;
}

export interface QuestionBankItem extends ValidatedQuestion {
  bankStatus: QuestionBankStatus;
  validationReport?: QuestionValidationReport;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  usageCount: number;
  tags?: string[];
  topicTitle?: string;
  subtopicTitle?: string;
  learningObjective?: string;
  bloomsLevel?: string;
  estimatedTimeSeconds?: number;
}

export interface ExamQuestion {
  id: string;
  questionNumber?: number;
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  subject: SubjectCategory;
  weekNumber: number;
  topicTitle?: string;
  subtopicTitle?: string;
  learningObjective?: string;
  bloomsLevel?: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | string;
  estimatedTimeSeconds?: number;
  tags?: string[];
  reviewStatus?: QuestionReviewStatus;
  bankStatus?: QuestionBankStatus;
  validationReport?: QuestionValidationReport;
  generationBatchId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedBy?: string;
  usageCount?: number;
  sectionHeading: string;
  pageReference: string;
  supportingExcerpt?: string;
  cognitiveCategory: CognitiveCategory;
  difficultyLevel: DifficultyLevel;
  questionText: string;
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption];
  correctOptionId: OptionId;
  explanation: any;
  distractorRationales?: DistractorExplanations;
  distractorFeedback?: DistractorExplanations;
  conceptToRevisit?: string;
  validationChecklist?: QuestionValidationChecklist;
  malformedLatexFlag?: boolean;
  malformedLatexNote?: string;
}

export interface GenerationBatchJob {
  id: string;
  documentId: string;
  documentTitle: string;
  subject: SubjectCategory;
  selectedWeeks?: number[];
  weeks?: number[];
  requestedCount: number;
  generatedCount: number;
  approvedCount: number;
  rejectedCount?: number;
  duplicateDroppedCount?: number;
  difficulty?: DifficultyLevel;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  logs?: string[];
}

export interface OfflineSubjectReserve {
  subject: string;
  documentId: string;
  documentTitle: string;
  downloadedAt: string;
  questionCount: number;
  questions: ValidatedQuestion[];
}

/**
 * Public client-facing question payload during an active examination.
 */
export type PublicExamQuestion = Omit<
  ExamQuestion,
  | 'correctOptionId'
  | 'explanation'
  | 'sourceDocumentId'
  | 'sourceDocumentTitle'
  | 'weekNumber'
  | 'sectionHeading'
  | 'pageReference'
>;

export interface ExamSourceSelection {
  documentId: string;
  subject: SubjectCategory;
  documentTitle: string;
  selectedWeeks: number[]; // subset of [1..12]
}

export type DocumentWeekSelection = ExamSourceSelection;

export interface ExamConfiguration {
  id: string;
  title: string;
  selections: ExamSourceSelection[];
  questionCount: number;
  durationMinutes: 15 | 30 | 45 | 60 | 75 | 90 | 120;
  difficulty: DifficultyLevel;
  coverageMode?: 'full_subject' | 'targeted';
  gradingMode?: ExamGradingMode;
  selectionStrategy?: QuestionSelectionStrategy;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  allowAnswerChange?: boolean;
  navigationMode?: 'free' | 'sequential';
  timeoutBehaviour?: 'auto_submit' | 'strict_lock';
  enablePostExamReview?: boolean;
  enableSourceDisclosure?: boolean;
  marksPerQuestion?: number;
  negativeMarkingPenalty?: number;
  passMarkPercentage?: number;
  isRetryPractice?: boolean;
  parentAttemptId?: string;
  createdAt: string;
}

export interface StudentQuestionResponse {
  questionId: string;
  selectedOptionId: OptionId | null;
  markedForReview: boolean;
  visited: boolean;
  updatedAt: string;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'expired';

export interface QuestionReviewItem {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption];
  studentAnswer: OptionId | null;
  correctAnswer: OptionId;
  status: 'correct' | 'incorrect' | 'unanswered';
  whySelectedIncorrect: string | null;
  whyCorrectSupported: string;
  conceptToRevisit: string;
  subject: SubjectCategory;
  weekNumber: number;
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  sectionHeading: string;
  pageReference: string;
  supportingExcerpt: string;
  cognitiveCategory: CognitiveCategory;
  difficultyLevel: DifficultyLevel;
}

export interface BreakdownStat {
  label: string;
  subject?: SubjectCategory;
  weekNumber?: number;
  category?: CognitiveCategory;
  correct: number;
  total: number;
  percentage: number;
  totalQuestions?: number;
  correctCount?: number;
  incorrectCount?: number;
  unansweredCount?: number;
  accuracyPercentage?: number;
}

export type WeekPerformanceBreakdown = BreakdownStat;
export type SubjectPerformanceBreakdown = BreakdownStat;
export type CognitivePerformanceBreakdown = BreakdownStat;

export interface ExamResultSummary {
  attemptId: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  percentageScore: number;
  totalMarksEarned?: number;
  maxPossibleMarks?: number;
  marksPerQuestion?: number;
  negativeMarkingPenalty?: number;
  negativeMarksDeducted?: number;
  passMarkPercentage?: number;
  passed?: boolean;
  gradingMode?: ExamGradingMode;
  timeTakenSeconds: number;
  submittedAt: string;
  submissionTrigger: 'manual' | 'timer_expired';
  subjectBreakdown: BreakdownStat[];
  weekBreakdown: BreakdownStat[];
  cognitiveBreakdown: BreakdownStat[];
  reviews: QuestionReviewItem[];
  distractorUsage: Record<string, Record<OptionId, number>>;
}

export interface ExamAttempt {
  id: string;
  studentId?: string;
  config: ExamConfiguration;
  status: AttemptStatus;
  startedAt: string; // ISO timestamp from server
  deadlineAt: string; // ISO timestamp from server
  submittedAt?: string;
  lastSavedAt?: string;
  revision?: number;
  currentQuestionIndex: number;
  responses: Record<string, StudentQuestionResponse>;
  questions: PublicExamQuestion[];
  result?: ExamResultSummary;
  syncedOffline?: boolean;
  isOfflineAttempt?: boolean;
  syncStatus?: 'pending_sync' | 'synced' | 'failed';
  localSyncState?: 'saving' | 'saved' | 'saved_local' | 'save_failed';
}

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export type BadgeRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export type BadgeCategory =
  | 'Getting Started'
  | 'Consistency'
  | 'Accuracy'
  | 'Mastery'
  | 'Persistence'
  | 'Exploration'
  | 'Dedication';

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  unlockRequirementText: string;
  awardingTrigger?: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  tier: BadgeTier;
  iconName: string;
  targetValue: number;
  unitLabel: string;
}

export interface StudentBadgeProgress {
  badge: BadgeDefinition;
  unlocked: boolean;
  unlockedAt?: string;
  currentValue: number;
  progressPercentage: number;
  earnedReason?: string;
  triggerAttemptId?: string;
  triggerAttemptTitle?: string;
}

export interface UnlockedAchievementRecord {
  badgeId: string;
  unlockedAt: string;
  earnedReason?: string;
  triggerAttemptId?: string;
}

export interface StudentProfile {
  id: string;
  studentName: string;
  email?: string;
  role?: UserRole;
  gradeLevel: string;
  schoolTerm: string;
  defaultQuestionCount: number;
  defaultDurationMinutes: 15 | 30 | 45 | 60 | 75 | 90 | 120;
  defaultDifficulty: DifficultyLevel;
  examCoverageMode?: 'full_subject' | 'targeted';
  marksPerQuestion?: number;
  negativeMarkingPenalty?: number;
  passMarkPercentage?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  allowAnswerChange?: boolean;
  navigationMode?: 'free' | 'sequential';
  timeoutBehaviour?: 'auto_submit' | 'strict_lock';
  enablePostExamReview?: boolean;
  enableSourceDisclosure?: boolean;
  offlineReserveSize?: number;
  autoSaveIntervalSeconds?: number;
  showTimerWarnings?: boolean;
  autoAdvanceOnSelect: boolean;
  highContrastMode: boolean;
  firstLoginAt?: string;
  walkthroughCompletedAt?: string | null;
  unlockedAchievements?: UnlockedAchievementRecord[];
  masteredQuestionIds?: string[];
  dailyCheckInDates?: string[];
  dailyRemindersEnabled?: boolean;
  dailyReminderTime?: string;
  soundEffectsEnabled?: boolean;
  badges?: StudentBadgeProgress[];
}

export type MainNavSection =
  | 'dashboard'
  | 'subjects'
  | 'subjects_lessons'
  | 'documents'
  | 'question_bank'
  | 'start_exam'
  | 'active_exam'
  | 'results'
  | 'result_review'
  | 'history'
  | 'analytics'
  | 'achievements'
  | 'settings';
