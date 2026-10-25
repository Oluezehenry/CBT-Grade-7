# ScholarCBT Grade 7 — Clean Per-User Exam History & Academic Mastery Suite

This plan removes all pre-seeded examination history so every new candidate starts with a clean slate (`0` attempts) that updates strictly when they take an examination, and implements all five academic mastery, revision, reporting, and teacher analytics enhancements.

## User Review & Critical Decisions

> [!IMPORTANT]
> All requested capabilities are included in this plan with zero feature loss:
> - **Clean Slate for New Users**: New student accounts and fresh database initializations begin with zero pre-populated examination attempts (`attempts: []`). Examination history, performance metrics, and exam-based badges populate exclusively from examinations actually taken by that student.
> - **All 5 Platform Enhancements Included**: Weak-Topic Revision Mode, Printable Candidate Result Slip & Term Report Card, Personal Revision Deck for Flagged/Missed Questions, Active Exam Keyboard Shortcut Legend, and Teacher Cohort CSV/JSON Export.

- **Confirmed Decision 1 — Strict Per-Student Attempt Isolation**: Every examination attempt is scoped to the authenticated student's `studentId`. New users see an empty history state until they start or submit their first examination.
- **Confirmed Decision 2 — End-to-End Academic Mastery Loop**: Completed examinations automatically feed weak-week detection, the personal revision deck, printable result slips, and teacher item-difficulty exports.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms ScholarCBT Grade 7 into a closed-loop assessment and revision system where a student's real examination history drives targeted weak-week practice, personal question revision decks, official printable result slips, rapid keyboard-driven test taking, and teacher cohort reporting.
- **Target Audience / Persona**: Grade 7 (JSS 1) students preparing for term examinations and subject teachers/assessment coordinators monitoring item difficulty and class performance.
- **Key Value**: Eliminates synthetic seed history so student analytics reflect 100% genuine progress, while turning every completed paper into actionable study steps.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Clean First-Time Candidate Experience**:
     - A new user signs up or logs in and sees `0 Completed Papers` on the Home screen and an encouraging zero-state in **Exam History** and **Performance Analytics**.
     - Only the `First Login` badge is eligible initially; all practice, accuracy, streak, and mastery badges unlock strictly as the student completes real examinations.
  2. **Targeted Weak-Topic Revision Mode ("Revise Weak Weeks")**:
     - After completing at least one examination, the platform analyzes accuracy by `(subject, weekNumber)`.
     - Any syllabus week with accuracy below `60%` is surfaced in **Performance Analytics** and **Exam Result Review** with a one-click **"Revise Weak Weeks"** button that opens the Examination Setup pre-configured with that subject and those exact weak weeks in targeted mode.
  3. **Printable Candidate Result Slip & Term Report Card**:
     - On **Exam Result Review** and **Performance Analytics**, clicking **"Print Official Result Slip"** renders a structured, print-optimized Grade 7 CBT Result Slip featuring candidate details, paper metadata, tabular score breakdown, cognitive taxonomy performance, subject-by-subject mastery table, and official coordinator signature lines.
  4. **Bookmark & Missed-Question Personal Revision Deck**:
     - Within **Subjects & Notes**, a dedicated **"Personal Revision Deck"** tab collects questions the student either **Marked for Review** or **Answered Incorrectly** in their completed exams.
     - Each card displays the question stem (with KaTeX math rendering), the student's previous choice vs. the verified correct option, the full pedagogical explanation, the source lesson week reference, and a **"Mark as Mastered"** toggle.
  5. **Keyboard Shortcut Legend in Active Examinations**:
     - During an active examination on desktop/tablet, a compact **`? Shortcuts`** button in the examination footer toggles a non-intrusive keyboard legend (`A`–`D` or `1`–`4` to select an option, `←`/`→` to navigate questions, `M` to mark for review) without obscuring question content.
  6. **Teacher Cohort & Item Difficulty Export (CSV / JSON)**:
     - In **Question Bank & Admin**, teachers can export **Candidate Attempt Summaries (CSV/JSON)** and **Question Item Difficulty & Distractor Analytics (CSV)** with a single click for school record-keeping.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Authoritative academic CBT interface with high-contrast examination surfaces, crisp 1px structural borders (`#E2E8F0`), and zero visual clutter.
  - *Color Palette & Mood*: Deep Oxford Navy (`#0F172A`) and Royal Academic Blue (`#1E3A8A` / `#1D4ED8`) on clean Alabaster (`#F8FAFC`) and pure white (`#FFFFFF`) surfaces, paired with semantic status indicators (`#15803D` Nominal/Passed, `#B45309` Needs Revision/Flagged, `#B91C1C` Critical/Incorrect).
  - *Typography & Hierarchy*: Clean sans-serif examination typography with KaTeX mathematical typesetting and strict `font-mono tabular-nums` alignment for all scores, percentages, timers, and item statistics.
  - *Print Stylesheet*: Dedicated `@media print` rules hide navigation sidebars and action toolbars so printing produces a clean single-page academic transcript.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Per-Student Attempt Filtering & Zero Seed Attempts**:
  - *Chosen Approach*: Initialize the database with `attempts: []` and `answerKeys: {}` (bumping the schema version so existing pre-seeded baseline attempts are cleared), and filter `/api/state` and client attempt views by the authenticated student's `studentId` (while allowing admin/teacher accounts to inspect cohort-wide attempts in the Admin view).
  - *Why*: Ensures every new student starts with an authentic zero-attempt record and only sees examinations they have personally taken.
- **Decision 2 — Derived + Persisted Revision Deck**:
  - *Chosen Approach*: Automatically derive revision cards from questions answered incorrectly or marked for review across the student's submitted attempts, while persisting `"Mastered"` dismissals in the student's profile (`masteredQuestionIds`).
  - *Why*: Requires zero manual data entry from the student while letting them clear items from their study queue once mastered.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ScholarCBT Client & Server Flow                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
       ┌───────────────────────────────┴───────────────────────────────┐
       ▼                                                               ▼
┌─────────────────────────────────────┐               ┌─────────────────────────────────────┐
│   Per-User Clean State (/api/state) │               │   Post-Exam Mastery & Export Engine │
│ ─────────────────────────────────── │               │ ─────────────────────────────────── │
│ • New DB / New User: attempts = []  │               │ • Weak-Week Detector (<60% acc)     │
│ • Scoped by authenticated studentId │               │ • Revision Deck Builder (Missed +   │
│ • Updates strictly on Exam Start /  │               │   Marked-for-Review + Mastered IDs) │
│   Checkpoint Save / Exam Submit     │               │ • Printable Result Slip & CSV/JSON  │
└─────────────────┬───────────────────┘               └─────────────────┬───────────────────┘
                  │                                                     │
                  └──────────────────────────┬──────────────────────────┘
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Interactive Student & Admin Views                    │
│ ──────────────────────────────────────────────────────────────────────────── │
│  [Home & History]      Zero-state for new users; updates after real exams    │
│  [Analytics & Review]  "Revise Weak Weeks" CTA + Printable CBT Result Slip   │
│  [Subjects & Notes]    "Personal Revision Deck" tab with rationale & mastery │
│  [Active Exam View]    Toggleable `? Keyboard Shortcuts` footer popover      │
│  [Question Bank Admin] Cohort Attempt Summary & Item Difficulty CSV/JSON     │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `DatabaseSchema` (`CURRENT_DB_VERSION = 13`): Initializes `attempts: []` and `answerKeys: {}` with zero pre-seeded baseline attempts; strips legacy `attempt-baseline-g7-01` records during migration.
  - `StudentProfile`: Adds optional `masteredQuestionIds?: string[]` to track questions the student has reviewed and marked as mastered in their Revision Deck.
  - `WeakTopicSummary`: Computed per `(documentId, subject, weekNumber)` from the student's submitted attempts, tracking `attemptedCount`, `correctCount`, and `accuracyPercentage`.
- **Interactive Component & State Mapping**:
  - **Weak-Week Revision Trigger**: Clicking `"Revise Weak Weeks"` in Analytics or Result Review invokes `onStartSubjectPractice(documentId, weakWeeks)`, which opens `ExamConfigWizard` pre-populated with that subject and its weak weeks in `'targeted'` mode.
  - **Revision Deck Filtering & Mastery**: Students can filter their Revision Deck by subject or reason (`Incorrect Answer` vs. `Marked for Review`), inspect the full solution and Week reference, and toggle `"Mark as Mastered"` (persisted via `PUT /api/profile`).
  - **Printable Result Slip**: Clicking `"Print Result Slip"` triggers a dedicated print header/sheet layout and `window.print()` (with an in-page preview toggle so it works seamlessly inside sandboxed iframes as well).
  - **Admin Cohort & Item Analytics Export**: Generates RFC-4180 compliant CSV and structured JSON downloads directly in the browser from real attempt and question-bank telemetry.
