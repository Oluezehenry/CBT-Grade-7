import { MainNavSection, SubjectCategory } from '../types/cbt';

export interface WalkthroughStepDefinition {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  targetNav: MainNavSection;
  targetSelector?: string;
  durationReadSeconds: number;
  description: string;
  keyTakeaways: string[];
  interactiveType:
    | 'welcome_overview'
    | 'subject_selector'
    | 'week_scope_simulator'
    | 'exam_interface_sandbox'
    | 'results_review_preview'
    | 'session_recovery_demo'
    | 'achievements_preview';
}

export interface DemoPracticeQuestion {
  id: string;
  subject: SubjectCategory;
  weekNumber: number;
  questionText: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctOptionId: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  conceptToReview: string;
}

export interface WalkthroughState {
  hasSeenIntro: boolean;
  completedStepIds: string[];
  lastStepIndex: number;
  completedAt: string | null;
  bannerDismissed?: boolean;
}

export type WalkthroughProgressState = WalkthroughState;

/**
 * 7 focused onboarding steps that demonstrate the real Grade 7 CBT workflow
 * without disrupting active examinations or fabricating functionality.
 */
export const STUDENT_WALKTHROUGH_STEPS: WalkthroughStepDefinition[] = [
  {
    id: 'step-welcome',
    stepNumber: 1,
    title: 'Welcome to ScholarCBT',
    subtitle: 'Curriculum-aligned Grade 7 practice, daily streaks, and motivational wisdom',
    targetNav: 'dashboard',
    targetSelector: '[data-walkthrough="home-primary-actions"]',
    durationReadSeconds: 20,
    description:
      'ScholarCBT prepares you for Grade 7 examinations using verified questions from your Weekly Lesson Notes across all 15 subjects, paired with automatic login motivational quotes and a daily study streak.',
    keyTakeaways: [
      'Your Home screen prioritises resuming unfinished sessions and launching new Grade 7 practice papers without clutter.',
      'Every login automatically delivers a fresh Motivational Quote and daily practice reminder to both the platform and your device system notifications.',
      'Check in daily via the top Streak & Alerts bar to build consecutive study streaks and unlock milestone fanfare.',
    ],
    interactiveType: 'welcome_overview',
  },
  {
    id: 'step-subjects-weeks',
    stepNumber: 2,
    title: 'Subjects & Revision Deck',
    subtitle: 'Explore 15 Grade 7 subjects, Weekly Lesson Notes, and your Personal Revision Deck',
    targetNav: 'dashboard',
    targetSelector: '[data-walkthrough="subject-selection-panel"]',
    durationReadSeconds: 25,
    description:
      'Select any of your 15 Grade 7 subjects—such as Mathematics, Basic Science, or English Studies—to inspect question pools, read lesson notes, or review previously missed questions in your Personal Revision Deck.',
    keyTakeaways: [
      'Each subject row displays the exact number of curriculum weeks and verified CBT questions ready for practice.',
      'Open "Subjects & Notes" to read structured weekly lesson notes before testing yourself.',
      'Use the "Personal Revision Deck" tab in Subjects & Notes to review missed questions from past exams and click "Mark as Mastered" once understood.',
    ],
    interactiveType: 'subject_selector',
  },
  {
    id: 'step-exam-coverage',
    stepNumber: 3,
    title: 'Scope & Weak-Topic Revision',
    subtitle: 'Practise a single week, custom weeks, full term, or 1-click Weak-Topic Revision',
    targetNav: 'start_exam',
    targetSelector: '[data-walkthrough="exam-coverage-selector"]',
    durationReadSeconds: 25,
    description:
      'Customise your examination scope for targeted study: choose a single instructional week, combine multiple weeks, or launch a 1-click Targeted Weak-Topic Practice session.',
    keyTakeaways: [
      'Single Week or Custom Weeks: Ideal for revising specific lessons you just covered in class.',
      'Full Term Syllabus (Weeks 1–12): Samples questions proportionally across every instructional week.',
      'Targeted Weak-Topic Revision: Automatically detects weeks where your accuracy is below 70% and lets you launch a focused practice paper with one click.',
    ],
    interactiveType: 'week_scope_simulator',
  },
  {
    id: 'step-start-exam',
    stepNumber: 4,
    title: 'Active CBT & Keyboard Shortcuts',
    subtitle: 'Answer questions with fast keyboard shortcuts, live timer, and question palette',
    targetNav: 'start_exam',
    targetSelector: '[data-walkthrough="launch-exam-summary"]',
    durationReadSeconds: 30,
    description:
      'During an examination, the interface enters a distraction-free CBT mode with crisp mathematical notation, a live countdown timer, colour-coded Question Palette, and tactile keyboard shortcuts.',
    keyTakeaways: [
      'Press A, B, C, or D (or 1–4) on your keyboard to select an option immediately, or click any option card.',
      'Use Left/Right Arrow keys (← / →) to move between questions and press F to flag or unflag a question for review.',
      'No badge popups or notifications ever interrupt an active examination—all rewards wait until after you submit.',
    ],
    interactiveType: 'exam_interface_sandbox',
  },
  {
    id: 'step-submit-review',
    stepNumber: 5,
    title: 'Official Result Slip & Reports',
    subtitle: 'Review explanations, WAEC-style grade letters, and print official transcripts',
    targetNav: 'history',
    targetSelector: '[data-walkthrough="recent-attempts-panel"]',
    durationReadSeconds: 25,
    description:
      'Only completed examinations appear in your Exam History. After submitting, you receive an instant diagnostic breakdown with step-by-step explanations, grade letters (A1–F9), and printable academic slips.',
    keyTakeaways: [
      'Inspect every question with step-by-step explanations grounded in your Grade 7 lesson notes.',
      'Print or save a formal "Official Examination Result Slip" for any paper, or a "Cumulative Term Report Card" in Performance Analytics.',
      'Spot weak instructional weeks immediately and click "Practise Weak Weeks" to turn weak areas into strengths.',
    ],
    interactiveType: 'results_review_preview',
  },
  {
    id: 'step-continue-later',
    stepNumber: 6,
    title: 'Auto-Save & Offline Recovery',
    subtitle: 'Dual persistence on server and device so you never lose your place',
    targetNav: 'dashboard',
    targetSelector: '[data-walkthrough="unfinished-exam-banner"]',
    durationReadSeconds: 20,
    description:
      'Every answer selection and navigation step is saved continuously to both the server and your device (IndexedDB). If you close the browser or go offline, you can resume seamlessly.',
    keyTakeaways: [
      'The top bar of the exam screen displays your real-time save state ("Saved" or "Saved locally — awaiting sync").',
      'Whenever an unfinished session exists, a prominent "Continue Examination" card appears first on your Home screen.',
      'Resuming restores your exact question order, selected options, flagged items, and remaining countdown time.',
    ],
    interactiveType: 'session_recovery_demo',
  },
  {
    id: 'step-explore-achievements',
    stepNumber: 7,
    title: 'Badges, Fanfare & System Alerts',
    subtitle: 'Unlock 20 collectible emblems, celebratory sound fanfare, and OS reminders',
    targetNav: 'achievements',
    targetSelector: '[data-walkthrough="nav-achievements"]',
    durationReadSeconds: 25,
    description:
      'Earn custom-illustrated academic badges across 7 categories and 5 rarity tiers, celebrate milestones with an artistic sunburst modal and Web Audio fanfare, and stay consistent with daily OS notifications.',
    keyTakeaways: [
      'Achievements live in their own dedicated navigation section so your Home screen stays focused on exam practice.',
      'Unlocking a badge or streak milestone triggers an artistic celebration modal with a synthesized musical fanfare.',
      'Device System Notifications and Platform Alerts keep you inspired with daily practice reminders and quotes from great thinkers.',
    ],
    interactiveType: 'achievements_preview',
  },
];

export const DEMO_PRACTICE_QUESTIONS: DemoPracticeQuestion[] = [
  {
    id: 'demo-q-math',
    subject: 'Mathematics',
    weekNumber: 1,
    questionText:
      'Solve the linear equation $2x + 5 = 13$ and evaluate $x^2 + \\frac{12}{x}$ in simplest form.',
    options: [
      { id: 'A', text: '$x = 4$ and $x^2 + \\frac{12}{x} = 19$' },
      { id: 'B', text: '$x = 4$ and $x^2 + \\frac{12}{x} = 16$' },
      { id: 'C', text: '$x = 9$ and $x^2 + \\frac{12}{x} = 81$' },
      { id: 'D', text: '$x = 3$ and $x^2 + \\frac{12}{x} = 13$' },
    ],
    correctOptionId: 'A',
    explanation:
      'Subtract $5$ from both sides of $2x + 5 = 13$ to obtain $2x = 8$, so $x = 4$. Substituting $x = 4$ into $x^2 + \\frac{12}{x}$ gives $4^2 + \\frac{12}{4} = 16 + 3 = 19$.',
    conceptToReview: 'Week 1: Linear Equations & Algebraic Substitution',
  },
  {
    id: 'demo-q-science',
    subject: 'Basic Science',
    weekNumber: 2,
    questionText:
      'Which organelle present in a green plant cell is responsible for Rigid Structural Support, and which organelle captures light energy for Photosynthesis?',
    options: [
      {
        id: 'A',
        text: 'Cellulose cell wall provides rigid structural support, while chloroplasts capture light energy for photosynthesis.',
      },
      {
        id: 'B',
        text: 'Plasma membrane provides rigid structural support, while mitochondria capture light energy for photosynthesis.',
      },
      {
        id: 'C',
        text: 'Cytoplasm provides rigid structural support, while the nucleus captures light energy for photosynthesis.',
      },
      {
        id: 'D',
        text: 'Vacuole sap provides rigid structural support, while ribosomes capture light energy for photosynthesis.',
      },
    ],
    correctOptionId: 'A',
    explanation:
      'Plant cells possess a non-living cellulose cell wall that maintains a fixed, rigid shape, and chloroplasts containing chlorophyll to trap solar energy during photosynthesis.',
    conceptToReview: 'Week 2: Plant and Animal Cell Organelles',
  },
  {
    id: 'demo-q-english',
    subject: 'English Language',
    weekNumber: 3,
    questionText:
      'Identify the grammatical function of the underlined word in the sentence: "The diligent Grade 7 scholars solved the challenging questions accurately."',
    options: [
      {
        id: 'A',
        text: '"Accurately" functions as an adverb of manner modifying the transitive verb "solved".',
      },
      {
        id: 'B',
        text: '"Accurately" functions as a descriptive adjective modifying the noun "questions".',
      },
      {
        id: 'C',
        text: '"Accurately" functions as a coordinating conjunction linking the subject and object.',
      },
      {
        id: 'D',
        text: '"Accurately" functions as a relative pronoun introducing a subordinate clause.',
      },
    ],
    correctOptionId: 'A',
    explanation:
      'An adverb of manner tells us how an action was performed. Here, "accurately" modifies the verb "solved" by describing how the scholars solved the questions.',
    conceptToReview: 'Week 3: Parts of Speech — Adverbs of Manner',
  },
];

export function createInitialWalkthroughState(): WalkthroughState {
  return {
    hasSeenIntro: false,
    completedStepIds: [],
    lastStepIndex: 0,
    completedAt: null,
  };
}

export function markWalkthroughStepCompleted(
  state: WalkthroughState,
  stepId: string,
  nowIso = new Date().toISOString()
): WalkthroughState {
  const existing = new Set(state.completedStepIds);
  existing.add(stepId);
  const completedStepIds = Array.from(existing);
  const allDone = STUDENT_WALKTHROUGH_STEPS.every((s) => existing.has(s.id));

  return {
    ...state,
    hasSeenIntro: true,
    completedStepIds,
    completedAt: allDone ? state.completedAt || nowIso : state.completedAt,
  };
}

export function markAllWalkthroughStepsCompleted(
  state: WalkthroughState,
  nowIso = new Date().toISOString()
): WalkthroughState {
  return {
    ...state,
    hasSeenIntro: true,
    completedStepIds: STUDENT_WALKTHROUGH_STEPS.map((s) => s.id),
    lastStepIndex: STUDENT_WALKTHROUGH_STEPS.length - 1,
    completedAt: nowIso,
  };
}

export function computeWalkthroughCompletionPercent(state: WalkthroughState): number {
  if (STUDENT_WALKTHROUGH_STEPS.length === 0) return 100;
  const validIds = new Set(STUDENT_WALKTHROUGH_STEPS.map((s) => s.id));
  const count = state.completedStepIds.filter((id) => validIds.has(id)).length;
  return Math.min(100, Math.round((count / STUDENT_WALKTHROUGH_STEPS.length) * 100));
}

export function simulateWeekScopeQuestionPool(
  selectedSubjectsCount: number,
  selectedWeeksPerSubject: number,
  strategy: 'random_all' | 'random_selected_weeks' | 'weak_areas'
): {
  availablePoolCount: number;
  examQuestionCount: number;
  questionsPerWeekAvg: number;
  strategySummary: string;
} {
  const safeSubjects = Math.max(1, Math.min(15, selectedSubjectsCount));
  const safeWeeks = Math.max(1, Math.min(12, selectedWeeksPerSubject));
  const totalSelectedWeekUnits = safeSubjects * safeWeeks;

  const availablePoolCount = totalSelectedWeekUnits * 6;
  const examQuestionCount = 50;
  const questionsPerWeekAvg = Math.max(
    1,
    Math.round((examQuestionCount / totalSelectedWeekUnits) * 10) / 10
  );

  let strategySummary =
    'Balanced Round-Robin: Every selected week contributes an equal share of questions.';
  if (strategy === 'weak_areas') {
    strategySummary =
      'Weak-Area Priority: 70% of questions target weeks where your previous accuracy was below 70%.';
  } else if (strategy === 'random_all') {
    strategySummary =
      'Full-Term Coverage: Questions are sampled across all 12 instructional weeks.';
  }

  return {
    availablePoolCount,
    examQuestionCount,
    questionsPerWeekAvg,
    strategySummary,
  };
}
