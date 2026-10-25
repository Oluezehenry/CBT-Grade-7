import React, { useEffect, useState } from 'react';
import { Award, Flame, Quote, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { BadgeRarity, StudentBadgeProgress } from '../types/cbt';
import { BadgeArtwork } from './BadgeArtwork';
import {
  MotivationalQuote,
  getDailyMotivationalQuote,
  playMilestoneCelebrationFanfare,
} from '../lib/dailyEngagementLogic';

export interface MilestoneCelebrationPayload {
  type: 'badge' | 'streak';
  title: string;
  subtitle: string;
  description: string;
  rarity: BadgeRarity;
  badgeProgress?: StudentBadgeProgress;
  streakDays?: number;
  quote?: MotivationalQuote;
}

interface MilestoneCelebrationModalProps {
  milestone: MilestoneCelebrationPayload | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClose: () => void;
  onViewAllAchievements?: () => void;
}

export const MilestoneCelebrationModal: React.FC<MilestoneCelebrationModalProps> = ({
  milestone,
  soundEnabled,
  onToggleSound,
  onClose,
  onViewAllAchievements,
}) => {
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (!milestone) return;
    if (soundEnabled) {
      playMilestoneCelebrationFanfare(
        milestone.type === 'streak' ? 'streak' : milestone.rarity
      );
    }
  }, [milestone, soundEnabled, burstKey]);

  if (!milestone) return null;

  const quote = milestone.quote || getDailyMotivationalQuote();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Milestone Achieved: ${milestone.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-[#0F172A] text-white shadow-2xl">
        {/* Artistic SVG Sunburst & Constellation Backdrop */}
        <div
          key={burstKey}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 flex justify-center opacity-35"
        >
          <svg
            viewBox="0 0 400 400"
            className="h-96 w-96 animate-[spin_28s_linear_infinite] motion-reduce:animate-none"
          >
            <defs>
              <radialGradient id="milestoneGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.65" />
                <stop offset="45%" stopColor="#38BDF8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="200" cy="200" r="185" fill="url(#milestoneGlow)" />
            {Array.from({ length: 16 }).map((_, idx) => {
              const angle = idx * 22.5;
              return (
                <g key={idx} transform={`rotate(${angle} 200 200)`}>
                  <polygon
                    points="200,18 194,95 206,95"
                    fill={idx % 2 === 0 ? '#FBBF24' : '#38BDF8'}
                    opacity={idx % 2 === 0 ? '0.45' : '0.28'}
                  />
                </g>
              );
            })}
            <circle
              cx="200"
              cy="200"
              r="128"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              opacity="0.6"
            />
            <circle
              cx="200"
              cy="200"
              r="152"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1"
              strokeDasharray="3 9"
              opacity="0.45"
            />
          </svg>
        </div>

        {/* Top Control Bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-4">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>{milestone.subtitle}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute milestone fanfare' : 'Enable milestone fanfare'}
              className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-amber-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-400" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close milestone celebration"
              className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Centerpiece Artwork & Milestone Details */}
        <div className="relative z-10 px-6 pt-3 pb-6 text-center space-y-5">
          <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
            {/* Orbiting Enamel Crest Frame */}
            <svg
              viewBox="0 0 140 140"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <circle
                cx="70"
                cy="70"
                r="64"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="10 5"
                opacity="0.7"
              />
              <polygon
                points="70,4 74,14 66,14"
                fill="#FBBF24"
              />
              <polygon
                points="70,136 74,126 66,126"
                fill="#FBBF24"
              />
              <polygon
                points="4,70 14,74 14,66"
                fill="#38BDF8"
              />
              <polygon
                points="136,70 126,74 126,66"
                fill="#38BDF8"
              />
            </svg>

            {milestone.badgeProgress ? (
              <div className="relative z-10 transform transition-transform duration-300 scale-110">
                <BadgeArtwork
                  badgeId={milestone.badgeProgress.badge.id}
                  rarity={milestone.badgeProgress.badge.rarity}
                  unlocked={true}
                  size="lg"
                />
              </div>
            ) : (
              /* Custom Illustrated SVG Streak Flame Medallion */
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 shadow-lg">
                <svg viewBox="0 0 80 80" className="h-16 w-16" aria-hidden="true">
                  <defs>
                    <linearGradient id="flameOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FEF08A" />
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#DC2626" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M40 8 C48 22, 64 28, 62 48 C60 63, 49 72, 40 72 C31 72, 20 63, 18 48 C16 33, 28 24, 33 16 C35 24, 38 26, 40 8 Z"
                    fill="url(#flameOuter)"
                    stroke="#FEF9C3"
                    strokeWidth="2"
                  />
                  <path
                    d="M40 28 C44 36, 51 41, 50 52 C49 60, 44 65, 40 65 C36 65, 31 60, 30 52 C29 44, 35 37, 40 28 Z"
                    fill="#FEF9C3"
                  />
                </svg>
                {typeof milestone.streakDays === 'number' && (
                  <span className="absolute -bottom-2 rounded-md border border-amber-200 bg-slate-950 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                    {milestone.streakDays}d Streak
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {milestone.title}
            </h2>
            <p className="mx-auto max-w-md text-xs sm:text-sm text-slate-300 leading-relaxed">
              {milestone.description}
            </p>
          </div>

          {/* Curated Motivational Quote Card */}
          <div className="rounded-xl border border-slate-700/90 bg-slate-900/90 p-4 text-left space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-sky-400">
              <span className="inline-flex items-center gap-1.5">
                <Quote className="h-3.5 w-3.5" />
                <span>Scholarly Wisdom · {quote.theme}</span>
              </span>
              <span className="font-mono text-slate-400">Daily Inspiration</span>
            </div>
            <blockquote className="text-xs sm:text-sm italic text-slate-100 leading-relaxed">
              &ldquo;{quote.quote}&rdquo;
            </blockquote>
            <div className="text-xs text-slate-400">
              — <strong className="text-white">{quote.author}</strong>, {quote.role}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setBurstKey((k) => k + 1);
                playMilestoneCelebrationFanfare(
                  milestone.type === 'streak' ? 'streak' : milestone.rarity
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5 text-amber-400" />
              <span>Replay Fanfare</span>
            </button>

            <div className="flex items-center gap-2">
              {onViewAllAchievements && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewAllAchievements();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5 text-sky-400" />
                  <span>View Badges</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                <Flame className="h-3.5 w-3.5" />
                <span>Continue Studying</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
