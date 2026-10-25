import React, { useMemo, useState } from 'react';
import {
  BadgeCategory,
  BadgeRarity,
  ExamAttempt,
  MainNavSection,
  StudentBadgeProgress,
  StudentProfile,
} from '../types/cbt';
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_RARITIES,
  evaluateStudentBadges,
} from '../lib/badgeSystem';
import { BadgeArtwork } from './BadgeArtwork';
import {
  Award,
  CheckCircle2,
  Filter,
  Lock,
  Play,
  Sparkles,
  X,
} from 'lucide-react';

interface AchievementsViewProps {
  profile: StudentProfile;
  attempts: ExamAttempt[];
  onNavigate: (nav: MainNavSection) => void;
  onOpenDailyCheckIn?: () => void;
  onCelebrateBadge?: (badge: StudentBadgeProgress) => void;
}

const RARITY_STYLES: Record<
  BadgeRarity,
  {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    cardHighlight: string;
  }
> = {
  Common: {
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-200',
    cardHighlight: 'border-slate-200',
  },
  Uncommon: {
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    cardHighlight: 'border-slate-300',
  },
  Rare: {
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-900',
    badgeBorder: 'border-blue-200',
    cardHighlight: 'border-blue-200',
  },
  Epic: {
    badgeBg: 'bg-amber-100/80',
    badgeText: 'text-amber-950',
    badgeBorder: 'border-amber-300',
    cardHighlight: 'border-amber-300',
  },
  Legendary: {
    badgeBg: 'bg-[#0F172A]',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/40',
    cardHighlight: 'border-[#1E3A8A]',
  },
};

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  profile,
  attempts,
  onNavigate,
  onOpenDailyCheckIn,
  onCelebrateBadge,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | BadgeCategory>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<'ALL' | BadgeRarity>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');
  const [activeBadgeDetail, setActiveBadgeDetail] = useState<StudentBadgeProgress | null>(null);

  const badgeProgressList = useMemo(
    () =>
      evaluateStudentBadges(attempts, {
        hasLoggedIn: true,
        firstLoginAt: profile.firstLoginAt,
        persistedUnlocks: profile.unlockedAchievements,
      }),
    [attempts, profile.firstLoginAt, profile.unlockedAchievements]
  );

  const unlockedCount = badgeProgressList.filter((b) => b.unlocked).length;
  const totalCount = badgeProgressList.length;
  const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Next closest milestone
  const nextMilestone = useMemo(() => {
    const locked = badgeProgressList
      .filter((b) => !b.unlocked)
      .sort((a, b) => b.progressPercentage - a.progressPercentage);
    return locked[0] || null;
  }, [badgeProgressList]);

  const filteredBadges = useMemo(() => {
    return badgeProgressList.filter((item) => {
      if (selectedCategory !== 'ALL' && item.badge.category !== selectedCategory) return false;
      if (selectedRarity !== 'ALL' && item.badge.rarity !== selectedRarity) return false;
      if (statusFilter === 'UNLOCKED' && !item.unlocked) return false;
      if (statusFilter === 'LOCKED' && item.unlocked) return false;
      return true;
    });
  }, [badgeProgressList, selectedCategory, selectedRarity, statusFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1E3A8A]">
              <Award className="h-4 w-4" />
              <span>Academic Achievement Collection</span>
            </div>
            <h1 className="cbt-page-heading">Achievements & Mastery Badges</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Earn custom-illustrated academic emblems by completing practice sessions, maintaining study consistency, and mastering Grade 7 subjects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Unlocked Collection</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {unlockedCount} / {totalCount}
                </span>
                <span className="text-xs font-semibold text-[#1D4ED8]">({completionPct}%)</span>
              </div>
            </div>

            {onOpenDailyCheckIn && (
              <button
                type="button"
                onClick={onOpenDailyCheckIn}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-950 transition-colors hover:bg-amber-100 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>Daily Check-In & Quotes</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('start_exam')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A8A] cursor-pointer"
            >
              <Play className="h-4 w-4" />
              <span>Start Practice Session</span>
            </button>
          </div>
        </div>

        {/* Next Milestone Strip */}
        {nextMilestone && (
          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <BadgeArtwork
                badgeId={nextMilestone.badge.id}
                rarity={nextMilestone.badge.rarity}
                unlocked={false}
                size="sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
                    Closest Next Unlock
                  </span>
                  <span className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    {nextMilestone.badge.rarity}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {nextMilestone.badge.title} —{' '}
                  <span className="font-normal text-slate-600">
                    {nextMilestone.badge.unlockRequirementText}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:w-56">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#1D4ED8] transition-all duration-300"
                  style={{ width: `${nextMilestone.progressPercentage}%` }}
                />
              </div>
              <span className="font-mono text-xs font-bold text-slate-700">
                {nextMilestone.currentValue}/{nextMilestone.badge.targetValue}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Filter Controls */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Achievement Categories">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Categories ({badgeProgressList.length})
            </button>
            {ACHIEVEMENT_CATEGORIES.map((category) => {
              const count = badgeProgressList.filter((b) => b.badge.category === category).length;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Rarity Filter */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Rarity Filter">
            <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Filter className="h-3.5 w-3.5" /> Rarity:
            </span>
            <button
              type="button"
              onClick={() => setSelectedRarity('ALL')}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                selectedRarity === 'ALL'
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Rarities
            </button>
            {ACHIEVEMENT_RARITIES.map((rarity) => (
              <button
                key={rarity}
                type="button"
                onClick={() => setSelectedRarity(rarity)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  selectedRarity === rarity
                    ? 'bg-[#1E3A8A] text-white'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {rarity}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 self-start">
            {(
              [
                { id: 'ALL', label: `All (${totalCount})` },
                { id: 'UNLOCKED', label: `Unlocked (${unlockedCount})` },
                { id: 'LOCKED', label: `Locked (${totalCount - unlockedCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Achievement Grid */}
      {filteredBadges.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-base font-semibold text-slate-800">
            No achievements match the selected filters.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try resetting the category, rarity, or unlock status filter above.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setSelectedRarity('ALL');
              setStatusFilter('ALL');
            }}
            className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBadges.map((item) => {
            const { badge, unlocked, unlockedAt, currentValue, progressPercentage } = item;
            const rStyle = RARITY_STYLES[badge.rarity];

            return (
              <button
                key={badge.id}
                type="button"
                onClick={() => setActiveBadgeDetail(item)}
                className={`group flex flex-col justify-between rounded-xl border p-5 text-left transition-all cursor-pointer ${
                  unlocked
                    ? `bg-white ${rStyle.cardHighlight} hover:border-[#1D4ED8] shadow-2xs`
                    : 'border-slate-200 bg-slate-50/75 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <BadgeArtwork
                        badgeId={badge.id}
                        rarity={badge.rarity}
                        unlocked={unlocked}
                        size="md"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${rStyle.badgeBg} ${rStyle.badgeText} ${rStyle.badgeBorder}`}
                          >
                            {badge.rarity}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {badge.category}
                          </span>
                        </div>
                        <h3 className="mt-1 text-base font-bold text-slate-900 group-hover:text-[#1E3A8A]">
                          {badge.title}
                        </h3>
                      </div>
                    </div>

                    {unlocked ? (
                      <span
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#15803D]"
                        title="Unlocked"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    ) : (
                      <span
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-500"
                        title="Locked"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-200/80 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      {unlocked ? 'Completed' : 'Progress'}
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {currentValue} / {badge.targetValue} {badge.unitLabel}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        unlocked ? 'bg-[#15803D]' : 'bg-[#1D4ED8]'
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{badge.unlockRequirementText}</span>
                    {unlocked && unlockedAt && (
                      <span className="shrink-0 font-mono text-emerald-800 font-semibold ml-2">
                        {new Date(unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Achievement Detail Modal */}
      {activeBadgeDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs cbt-modal-backdrop"
          onClick={() => setActiveBadgeDetail(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl cbt-modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    RARITY_STYLES[activeBadgeDetail.badge.rarity].badgeBg
                  } ${RARITY_STYLES[activeBadgeDetail.badge.rarity].badgeText} ${
                    RARITY_STYLES[activeBadgeDetail.badge.rarity].badgeBorder
                  }`}
                >
                  {activeBadgeDetail.badge.rarity} Rarity
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {activeBadgeDetail.badge.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveBadgeDetail(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Close detail modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center text-center">
              <BadgeArtwork
                badgeId={activeBadgeDetail.badge.id}
                rarity={activeBadgeDetail.badge.rarity}
                unlocked={activeBadgeDetail.unlocked}
                size="xl"
                className={activeBadgeDetail.unlocked ? 'cbt-badge-emblem-enter' : ''}
              />
              <h2
                id="achievement-detail-title"
                className="mt-4 text-xl font-bold text-slate-900"
              >
                {activeBadgeDetail.badge.title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                {activeBadgeDetail.badge.description}
              </p>
            </div>

            <div className="mt-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </span>
                {activeBadgeDetail.unlocked ? (
                  <span className="inline-flex items-center gap-1 font-bold text-[#15803D]">
                    <Sparkles className="h-3.5 w-3.5" /> Unlocked
                    {activeBadgeDetail.unlockedAt
                      ? ` on ${new Date(activeBadgeDetail.unlockedAt).toLocaleDateString()}`
                      : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                    <Lock className="h-3.5 w-3.5" /> Locked ({activeBadgeDetail.progressPercentage}%)
                  </span>
                )}
              </div>

              <div className="border-t border-slate-200 pt-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {activeBadgeDetail.unlocked
                    ? 'Why You Earned This Badge'
                    : 'Progress & Eligibility'}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {activeBadgeDetail.earnedReason ||
                    activeBadgeDetail.badge.unlockRequirementText}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Unlock Requirement
                </div>
                <p className="mt-1 text-xs font-medium text-slate-700">
                  {activeBadgeDetail.badge.unlockRequirementText}
                </p>
                {activeBadgeDetail.badge.awardingTrigger && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Verification rule: {activeBadgeDetail.badge.awardingTrigger}
                  </p>
                )}
              </div>

              <div className="border-t border-slate-200 pt-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Current Progress</span>
                  <span className="font-mono tabular-nums">
                    {activeBadgeDetail.currentValue} / {activeBadgeDetail.badge.targetValue}{' '}
                    {activeBadgeDetail.badge.unitLabel}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      activeBadgeDetail.unlocked ? 'bg-[#15803D]' : 'bg-[#1D4ED8]'
                    }`}
                    style={{ width: `${activeBadgeDetail.progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              {activeBadgeDetail.unlocked && onCelebrateBadge && (
                <button
                  type="button"
                  onClick={() => {
                    const target = activeBadgeDetail;
                    setActiveBadgeDetail(null);
                    onCelebrateBadge(target);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Celebrate Milestone & Fanfare</span>
                </button>
              )}
              {!activeBadgeDetail.unlocked && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveBadgeDetail(null);
                    onNavigate('start_exam');
                  }}
                  className="rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A] cursor-pointer"
                >
                  Practise Now to Unlock
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveBadgeDetail(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
