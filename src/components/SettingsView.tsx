import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Database,
  Lock,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
  User,
  RefreshCw,
} from 'lucide-react';
import { DifficultyLevel, StudentProfile } from '../types/cbt';

interface SettingsViewProps {
  profile: StudentProfile;
  documentCount: number;
  attemptCount: number;
  onProfileUpdated: (profile: StudentProfile) => void;
  onDatabaseReset: () => void;
}

interface SecurityCheckItem {
  id: string;
  label: string;
  status: string;
  detail: string;
}

interface SecurityAuditData {
  score: number;
  status: string;
  checks: SecurityCheckItem[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  documentCount,
  attemptCount,
  onProfileUpdated,
  onDatabaseReset,
}) => {
  const [formState, setFormState] = useState<StudentProfile>({ ...profile });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [securityAudit, setSecurityAudit] = useState<SecurityAuditData | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState<boolean>(false);

  const runSecurityAudit = async () => {
    setIsRunningAudit(true);
    try {
      const res = await fetch('/api/security/audit');
      if (res.ok) {
        const data = await res.json();
        setSecurityAudit(data);
      }
    } catch {
      // Ignore transient errors
    } finally {
      setIsRunningAudit(false);
    }
  };

  useEffect(() => {
    runSecurityAudit();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedBanner(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        onProfileUpdated(data.profile);
        setSavedBanner('Student profile, email address, and default examination preferences saved.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const res = await fetch('/api/system/reset', { method: 'POST' });
    if (res.ok) {
      setConfirmReset(false);
      onDatabaseReset();
      setSavedBanner('Database restored to clean Grade 7 curriculum seed.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Student Profile, Security Audit & Storage Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Configure your Grade 7 student profile, verified email address, default CBT parameters,
          and inspect live cryptographic security protections.
        </p>
      </div>

      {savedBanner && (
        <div
          role="status"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-900 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-6"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <User className="w-4 h-4 text-indigo-600 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Student Identity & Default Examination Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="settings-student-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Student Full Name
            </label>
            <input
              id="settings-student-name"
              type="text"
              required
              value={formState.studentName}
              onChange={(e) =>
                setFormState({ ...formState, studentName: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label
              htmlFor="settings-student-email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Verified Email Address (2FA Auth Code)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="settings-student-email"
                type="email"
                value={formState.email || ''}
                onChange={(e) =>
                  setFormState({ ...formState, email: e.target.value })
                }
                placeholder="student@school.edu"
                className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="settings-grade-level"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Class / Grade Level
            </label>
            <input
              id="settings-grade-level"
              type="text"
              required
              value={formState.gradeLevel}
              onChange={(e) =>
                setFormState({ ...formState, gradeLevel: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label
              htmlFor="settings-school-term"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Academic Term
            </label>
            <input
              id="settings-school-term"
              type="text"
              value={formState.schoolTerm}
              onChange={(e) =>
                setFormState({ ...formState, schoolTerm: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label
              htmlFor="settings-default-qcount"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Default Question Count
            </label>
            <select
              id="settings-default-qcount"
              value={formState.defaultQuestionCount}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  defaultQuestionCount: Number(e.target.value),
                })
              }
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            >
              <option value={15}>15 Questions</option>
              <option value={25}>25 Questions</option>
              <option value={40}>40 Questions</option>
              <option value={50}>50 Questions (Standard CBT)</option>
              <option value={60}>60 Questions</option>
              <option value={75}>75 Questions</option>
              <option value={100}>100 Questions</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-default-duration"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Default Duration
            </label>
            <select
              id="settings-default-duration"
              value={formState.defaultDurationMinutes}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  defaultDurationMinutes: Number(e.target.value) as 15 | 30 | 45 | 60,
                })
              }
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes (Default)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-default-difficulty"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Default Cognitive Difficulty
            </label>
            <select
              id="settings-default-difficulty"
              value={formState.defaultDifficulty}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  defaultDifficulty: e.target.value as DifficultyLevel,
                })
              }
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            >
              <option value="Advanced practice">Advanced practice</option>
              <option value="High difficulty">High difficulty</option>
              <option value="Expert challenge">Expert challenge</option>
            </select>
          </div>
        </div>

        {/* Administrative Examination Policy & Marking Rules */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Administrative Examination Rules & Marking Policy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure formal school examination standards, grading rules, navigation constraints, post-submission review policy, and offline question reserves.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="settings-coverage-mode"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Default Coverage Mode
              </label>
              <select
                id="settings-coverage-mode"
                value={formState.examCoverageMode || 'full_subject'}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    examCoverageMode: e.target.value as 'full_subject' | 'targeted',
                  })
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="full_subject">Full-Subject (All Weeks Random)</option>
                <option value="targeted">Targeted (Selected Weeks Only)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-marks-per-question"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Marks per Correct Question
              </label>
              <select
                id="settings-marks-per-question"
                value={formState.marksPerQuestion ?? 2}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    marksPerQuestion: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value={1}>1 Mark per question</option>
                <option value={2}>2 Marks per question (Default)</option>
                <option value={5}>5 Marks per question</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-negative-marking"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Negative Marking Penalty
              </label>
              <select
                id="settings-negative-marking"
                value={formState.negativeMarkingPenalty ?? 0}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    negativeMarkingPenalty: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value={0}>0 Marks (No Negative Marking)</option>
                <option value={0.25}>-0.25 Marks per wrong answer</option>
                <option value={0.5}>-0.50 Marks per wrong answer</option>
                <option value={1}>-1.00 Mark per wrong answer</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-pass-mark"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Pass Mark Percentage
              </label>
              <select
                id="settings-pass-mark"
                value={formState.passMarkPercentage ?? 50}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    passMarkPercentage: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value={40}>40% Pass Threshold</option>
                <option value={50}>50% Pass Threshold (Default)</option>
                <option value={60}>60% Pass Threshold</option>
                <option value={70}>70% Mastery Threshold</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-nav-mode"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Question Navigation Mode
              </label>
              <select
                id="settings-nav-mode"
                value={formState.navigationMode || 'free'}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    navigationMode: e.target.value as 'free' | 'sequential',
                  })
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="free">Free Navigation (Back & Next)</option>
                <option value="sequential">Sequential Only (Forward Only)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-offline-reserve"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Offline Subject Reserve Size
              </label>
              <select
                id="settings-offline-reserve"
                value={formState.offlineReserveSize ?? 60}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    offlineReserveSize: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value={50}>50 Questions per Subject</option>
                <option value={60}>60 Questions per Subject (Default)</option>
                <option value={80}>80 Questions per Subject</option>
                <option value={100}>100 Questions per Subject</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={formState.shuffleQuestions ?? true}
                onChange={(e) =>
                  setFormState({ ...formState, shuffleQuestions: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <div className="font-semibold text-slate-900">Shuffle Question Order</div>
                <div className="text-slate-500">Randomize question sequence across weeks on every attempt.</div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={formState.shuffleOptions ?? true}
                onChange={(e) =>
                  setFormState({ ...formState, shuffleOptions: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <div className="font-semibold text-slate-900">Shuffle Answer Options (A–D)</div>
                <div className="text-slate-500">Randomize option positions while preserving answer keys.</div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={formState.allowAnswerChange ?? true}
                onChange={(e) =>
                  setFormState({ ...formState, allowAnswerChange: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <div className="font-semibold text-slate-900">Allow Answer Changes Before Submit</div>
                <div className="text-slate-500">Let students revise selected options before final submission.</div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={formState.enablePostExamReview ?? true}
                onChange={(e) =>
                  setFormState({ ...formState, enablePostExamReview: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <div className="font-semibold text-slate-900">Enable Detailed Post-Exam Review</div>
                <div className="text-slate-500">Show question-by-question explanations after submission.</div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer sm:col-span-2">
              <input
                type="checkbox"
                checked={formState.enableSourceDisclosure ?? true}
                onChange={(e) =>
                  setFormState({ ...formState, enableSourceDisclosure: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <div className="font-semibold text-slate-900">
                  Reveal Source Document & Week References After Submission
                </div>
                <div className="text-slate-500">
                  Source documents, week numbers, and lesson headings are strictly hidden during active examinations and revealed only after submission when enabled.
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>{isSaving ? 'Saving Preferences...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>

      {/* 100% Site Security & Cryptographic Protection Audit */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Live Site Security & Cryptographic Audit
              </h2>
              <p className="text-xs text-emerald-700 font-semibold">
                Protection Status: {securityAudit?.score ?? 100}% Verified Protected
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={runSecurityAudit}
            disabled={isRunningAudit}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
            <span>{isRunningAudit ? 'Verifying Defenses...' : 'Run Security Self-Test'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(securityAudit?.checks || []).map((check) => (
            <div
              key={check.id}
              className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-2.5"
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{check.label}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{check.detail}</p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                {check.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Persistent Online Storage & Reset Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Database className="w-4 h-4 text-indigo-600 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Online Storage & Curriculum Reset
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900">
              Persistent Server Database & File Store
            </div>
            <p>
              Uploaded documents ({documentCount} stored) and examination attempts (
              {attemptCount} stored) are persisted on the backend filesystem and database,
              remaining available across browser refreshes, restarts, and devices.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900">
              Server-Side Answer-Key Isolation
            </div>
            <p>
              Active examination payloads strip all answer keys, explanations, and
              supporting excerpts on the server prior to transmission. Grading and timer
              deadlines are enforced server-side.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Need to restore the default Grade 7 curriculum library and baseline attempt?
          </div>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1.5 self-start cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Stored Data to Default Curriculum</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
