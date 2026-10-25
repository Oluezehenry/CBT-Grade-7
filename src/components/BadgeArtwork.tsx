import React from 'react';
import { BadgeRarity } from '../types/cbt';

interface BadgeArtworkProps {
  badgeId: string;
  rarity: BadgeRarity;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const RARITY_PALETTE: Record<
  BadgeRarity,
  {
    outerStroke: string;
    rimStart: string;
    rimMid: string;
    rimEnd: string;
    enamelStart: string;
    enamelEnd: string;
    symbolPrimary: string;
    symbolSecondary: string;
    accentDot: string;
  }
> = {
  Common: {
    outerStroke: '#78350F',
    rimStart: '#F59E0B',
    rimMid: '#D97706',
    rimEnd: '#78350F',
    enamelStart: '#1E293B',
    enamelEnd: '#0F172A',
    symbolPrimary: '#FEF3C7',
    symbolSecondary: '#F59E0B',
    accentDot: '#FBBF24',
  },
  Uncommon: {
    outerStroke: '#334155',
    rimStart: '#F1F5F9',
    rimMid: '#94A3B8',
    rimEnd: '#475569',
    enamelStart: '#0F172A',
    enamelEnd: '#1E3A8A',
    symbolPrimary: '#F8FAFC',
    symbolSecondary: '#93C5FD',
    accentDot: '#E2E8F0',
  },
  Rare: {
    outerStroke: '#1E3A8A',
    rimStart: '#93C5FD',
    rimMid: '#3B82F6',
    rimEnd: '#1D4ED8',
    enamelStart: '#0F172A',
    enamelEnd: '#172554',
    symbolPrimary: '#EFF6FF',
    symbolSecondary: '#FBBF24',
    accentDot: '#93C5FD',
  },
  Epic: {
    outerStroke: '#78350F',
    rimStart: '#FDE68A',
    rimMid: '#F59E0B',
    rimEnd: '#92400E',
    enamelStart: '#1E1B4B',
    enamelEnd: '#0F172A',
    symbolPrimary: '#FEF3C7',
    symbolSecondary: '#F59E0B',
    accentDot: '#FDE68A',
  },
  Legendary: {
    outerStroke: '#1E3A8A',
    rimStart: '#FEF08A',
    rimMid: '#38BDF8',
    rimEnd: '#1D4ED8',
    enamelStart: '#090D16',
    enamelEnd: '#1E3A8A',
    symbolPrimary: '#FFFFFF',
    symbolSecondary: '#FACC15',
    accentDot: '#38BDF8',
  },
};

const LOCKED_PALETTE = {
  outerStroke: '#CBD5E1',
  rimStart: '#E2E8F0',
  rimMid: '#CBD5E1',
  rimEnd: '#94A3B8',
  enamelStart: '#F1F5F9',
  enamelEnd: '#E2E8F0',
  symbolPrimary: '#64748B',
  symbolSecondary: '#94A3B8',
  accentDot: '#CBD5E1',
};

/**
 * Original, multi-layered SVG badge collection with 5 rarity-tier silhouettes,
 * metallic rim gradients, deep enamel cores, and 23 distinct academic/scientific emblems.
 */
export const BadgeArtwork: React.FC<BadgeArtworkProps> = ({
  badgeId,
  rarity,
  unlocked,
  size = 'md',
  className = '',
}) => {
  const palette = unlocked ? RARITY_PALETTE[rarity] : LOCKED_PALETTE;
  const gradPrefix = `badge-${badgeId}-${unlocked ? 'u' : 'l'}`;

  const dimensions =
    size === 'sm'
      ? 'w-11 h-11'
      : size === 'lg'
      ? 'w-20 h-20'
      : size === 'xl'
      ? 'w-28 h-28'
      : 'w-14 h-14';

  const renderOuterSilhouette = () => {
    switch (rarity) {
      case 'Legendary':
        return (
          <>
            {/* 12-Point Sovereign Starburst + Octagonal Inner Bevel */}
            <polygon
              points="50,3 61,16 78,10 79,27 95,33 87,49 95,66 79,72 78,89 61,83 50,97 39,83 22,89 21,72 5,66 13,49 5,33 21,27 22,10 39,16"
              fill={`url(#${gradPrefix}-rim)`}
              stroke={palette.outerStroke}
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="35.5"
              fill={`url(#${gradPrefix}-enamel)`}
              stroke={palette.symbolSecondary}
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="31"
              fill="none"
              stroke={palette.symbolPrimary}
              strokeWidth="0.9"
              strokeDasharray="3 2"
              opacity="0.7"
            />
          </>
        );
      case 'Epic':
        return (
          <>
            {/* Ornate Hexagonal Crest with Crowned Bevel */}
            <polygon
              points="50,4 89,23 89,75 50,96 11,75 11,23"
              fill={`url(#${gradPrefix}-rim)`}
              stroke={palette.outerStroke}
              strokeWidth="2.2"
            />
            <polygon
              points="50,11.5 82,27.5 82,70.5 50,88.5 18,70.5 18,27.5"
              fill={`url(#${gradPrefix}-enamel)`}
              stroke={palette.symbolSecondary}
              strokeWidth="1.5"
            />
            <polygon
              points="50,16 77,30 77,68 50,83 23,68 23,30"
              fill="none"
              stroke={palette.symbolPrimary}
              strokeWidth="0.7"
              opacity="0.35"
            />
          </>
        );
      case 'Rare':
        return (
          <>
            {/* Heraldic Academic Escutcheon Shield */}
            <path
              d="M50 5 L86 17 L86 52 C86 74 70 88 50 95 C30 88 14 74 14 52 L14 17 Z"
              fill={`url(#${gradPrefix}-rim)`}
              stroke={palette.outerStroke}
              strokeWidth="2.2"
            />
            <path
              d="M50 12.5 L79 22.5 L79 51 C79 69 65 81 50 88 C35 81 21 69 21 51 L21 22.5 Z"
              fill={`url(#${gradPrefix}-enamel)`}
              stroke={palette.symbolSecondary}
              strokeWidth="1.4"
            />
          </>
        );
      case 'Uncommon':
        return (
          <>
            {/* Octagonal Precision Medallion */}
            <polygon
              points="32,7 68,7 93,32 93,68 68,93 32,93 7,68 7,32"
              fill={`url(#${gradPrefix}-rim)`}
              stroke={palette.outerStroke}
              strokeWidth="2"
            />
            <polygon
              points="35,14.5 65,14.5 85.5,35 85.5,65 65,85.5 35,85.5 14.5,65 14.5,35"
              fill={`url(#${gradPrefix}-enamel)`}
              stroke={palette.symbolSecondary}
              strokeWidth="1.3"
            />
          </>
        );
      default:
        return (
          <>
            {/* Classic Enamel Seal */}
            <circle
              cx="50"
              cy="50"
              r="43"
              fill={`url(#${gradPrefix}-rim)`}
              stroke={palette.outerStroke}
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="35"
              fill={`url(#${gradPrefix}-enamel)`}
              stroke={palette.symbolSecondary}
              strokeWidth="1.3"
            />
          </>
        );
    }
  };

  /**
   * 23 individually illustrated center motifs — one unique emblem per achievement ID.
   */
  const renderCenterMotif = () => {
    switch (badgeId) {
      case 'first_login':
        // 1. Compass Rose & Portal Key
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none">
            <circle cx="50" cy="50" r="21" strokeOpacity="0.35" strokeDasharray="2 2" />
            <polygon
              points="50,23 55.5,44.5 77,50 55.5,55.5 50,77 44.5,55.5 23,50 44.5,44.5"
              fill={palette.symbolSecondary}
              fillOpacity="0.3"
            />
            <circle cx="50" cy="50" r="5.5" fill={palette.symbolPrimary} />
          </g>
        );

      case 'first_practice':
        // 2. Scholar's Quill & Open Folio
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2.1" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M28 65 L50 60 L72 65 L72 39 L50 34 L28 39 Z"
              fill={palette.symbolSecondary}
              fillOpacity="0.22"
            />
            <line x1="50" y1="34" x2="50" y2="60" />
            <path d="M40 53 L67 25 C68 35 61 44 48 51 Z" fill={palette.symbolPrimary} />
            <line x1="36" y1="57" x2="45" y2="48" />
          </g>
        );

      case 'first_cbt':
        // 3. Classical Pediment & Verified Check Seal
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon
              points="50,24 72,35 28,35"
              fill={palette.symbolSecondary}
              fillOpacity="0.35"
            />
            <line x1="33" y1="35" x2="33" y2="46" />
            <line x1="67" y1="35" x2="67" y2="46" />
            <path d="M37 56 L47 66 L65 45" strokeWidth="3.2" />
          </g>
        );

      case 'day_streak_3':
        // 4. Bronze Brazier with Triple Spark
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinecap="round">
            <path
              d="M50 28 C58 36 60 44 54 51 C51 54 49 54 46 51 C40 44 42 36 50 28 Z"
              fill={palette.symbolSecondary}
              fillOpacity="0.4"
            />
            <path d="M38 55 L62 55 L56 71 L44 71 Z" fill={palette.symbolSecondary} fillOpacity="0.25" />
            <circle cx="38" cy="34" r="2" fill={palette.symbolPrimary} stroke="none" />
            <circle cx="50" cy="22" r="2.2" fill={palette.symbolPrimary} stroke="none" />
            <circle cx="62" cy="34" r="2" fill={palette.symbolPrimary} stroke="none" />
          </g>
        );

      case 'day_streak_7':
        // 5. Twin-Winged Silver Torch & 7-Star Arc
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinecap="round">
            <path
              d="M50 24 C60 34 63 43 55 52 C52 55 48 55 45 52 C37 43 40 34 50 24 Z"
              fill={palette.symbolSecondary}
              fillOpacity="0.45"
            />
            <path d="M31 44 C36 41 40 45 43 52" />
            <path d="M69 44 C64 41 60 45 57 52" />
            <path d="M43 54 L57 54 L53 74 L47 74 Z" fill={palette.symbolPrimary} fillOpacity="0.3" />
          </g>
        );

      case 'day_streak_14':
        // 6. Solar Sunburst Torch & Eternal Halo
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinecap="round">
            <circle cx="50" cy="42" r="16" stroke={palette.symbolSecondary} strokeDasharray="3 2" />
            <path
              d="M50 22 C62 33 64 44 55 53 C52 56 48 56 45 53 C36 44 38 33 50 22 Z"
              fill={palette.symbolSecondary}
              fillOpacity="0.5"
            />
            <path d="M50 31 C55 37 55 44 50 49 C45 44 45 37 50 31 Z" fill={palette.symbolPrimary} />
            <path d="M41 55 L59 55 L54 75 L46 75 Z" fill={palette.symbolSecondary} fillOpacity="0.35" />
          </g>
        );

      case 'streak_5':
        // 7. Concentric Astrolabe Target & Bullseye
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none">
            <circle cx="50" cy="50" r="20" strokeOpacity="0.55" />
            <circle cx="50" cy="50" r="12" fill={palette.symbolSecondary} fillOpacity="0.25" />
            <line x1="26" y1="50" x2="36" y2="50" />
            <line x1="64" y1="50" x2="74" y2="50" />
            <line x1="50" y1="26" x2="50" y2="36" />
            <line x1="50" y1="64" x2="50" y2="74" />
            <circle cx="50" cy="50" r="4.5" fill={palette.symbolPrimary} />
          </g>
        );

      case 'streak_10':
        // 8. Optical Precision Prism & Refracted Ray
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2.1" fill="none" strokeLinejoin="round">
            <polygon
              points="50,25 71,64 29,64"
              fill={palette.symbolSecondary}
              fillOpacity="0.38"
            />
            <polygon points="50,35 62,59 38,59" strokeOpacity="0.7" />
            <line x1="23" y1="47" x2="41" y2="44" strokeWidth="2.4" />
            <line x1="59" y1="44" x2="77" y2="38" stroke={palette.symbolSecondary} strokeWidth="2.2" />
            <line x1="59" y1="48" x2="77" y2="52" stroke={palette.symbolPrimary} strokeWidth="2.2" />
          </g>
        );

      case 'high_achiever':
        // 9. Five-Pointed Merit Star & Twin Laurel Fronds
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinejoin="round">
            <polygon
              points="50,24 56,39 72,40 60,50 64,66 50,57 36,66 40,50 28,40 44,39"
              fill={palette.symbolSecondary}
              fillOpacity="0.45"
            />
            <path d="M30 68 C36 73 64 73 70 68" strokeLinecap="round" />
          </g>
        );

      case 'error_free_attempt':
        // 10. Flawless Aegis Crest & Checkered Diamond
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2.1" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M50 24 L69 32 L69 50 C69 62 60 70 50 75 C40 70 31 62 31 50 L31 32 Z"
              fill={palette.symbolSecondary}
              fillOpacity="0.3"
            />
            <path d="M41 50 L47 56 L60 42" strokeWidth="3" />
          </g>
        );

      case 'perfect_grade':
        // 11. Sovereign Faceted Diamond & Imperial Laurels
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2.1" fill="none" strokeLinejoin="round">
            <polygon
              points="50,22 69,44 50,74 31,44"
              fill={palette.symbolSecondary}
              fillOpacity="0.48"
            />
            <polyline points="31,44 50,51 69,44" />
            <line x1="50" y1="22" x2="50" y2="74" />
            <path d="M25 56 C27 66 36 73 45 76" strokeLinecap="round" />
            <path d="M75 56 C73 66 64 73 55 76" strokeLinecap="round" />
          </g>
        );

      case 'subject_specialist':
        // 12. Atomic Orbital & Geometric Divider Compass
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinecap="round">
            <ellipse
              cx="50"
              cy="50"
              rx="22"
              ry="9"
              transform="rotate(-30 50 50)"
              stroke={palette.symbolSecondary}
            />
            <ellipse
              cx="50"
              cy="50"
              rx="22"
              ry="9"
              transform="rotate(30 50 50)"
            />
            <circle cx="50" cy="50" r="5" fill={palette.symbolPrimary} />
          </g>
        );

      case 'topic_master':
        // 13. Interlocking Tri-Hexagon Knowledge Signet
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinejoin="round">
            <polygon
              points="50,25 62,32 62,46 50,53 38,46 38,32"
              fill={palette.symbolSecondary}
              fillOpacity="0.4"
            />
            <polygon
              points="39,45 51,52 51,66 39,73 27,66 27,52"
              fill={palette.symbolPrimary}
              fillOpacity="0.2"
            />
            <polygon
              points="61,45 73,52 73,66 61,73 49,66 49,52"
              fill={palette.symbolPrimary}
              fillOpacity="0.2"
            />
          </g>
        );

      case 'week_mastery':
        // 14. Six-Spire Curriculum Crown
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2.2" fill="none" strokeLinejoin="round">
            <path
              d="M28 60 L32 36 L43 47 L50 28 L57 47 L68 36 L72 60 Z"
              fill={palette.symbolSecondary}
              fillOpacity="0.42"
            />
            <rect x="30" y="64" width="40" height="5" rx="2" fill={palette.symbolPrimary} />
          </g>
        );

      case 'speed_demon':
        // 15. Winged Velocity Chronometer
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2.1" fill="none" strokeLinecap="round">
            <circle cx="50" cy="53" r="18" fill={palette.symbolSecondary} fillOpacity="0.24" />
            <line x1="44" y1="28" x2="56" y2="28" strokeWidth="2.6" />
            <line x1="50" y1="28" x2="50" y2="35" />
            <polyline points="50,42 50,53 60,47" strokeWidth="2.6" />
            <line x1="25" y1="46" x2="31" y2="46" />
            <line x1="23" y1="53" x2="29" y2="53" />
          </g>
        );

      case 'comeback_learner':
        // 16. Rising Phoenix Wings & Ascent Arrow
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M27 56 C33 44 41 44 50 54 C59 44 67 44 73 56 C65 64 57 66 50 66 C43 66 35 64 27 56 Z"
              fill={palette.symbolSecondary}
              fillOpacity="0.32"
            />
            <path d="M50 62 L50 28" strokeWidth="2.6" />
            <polyline points="41,37 50,27 59,37" strokeWidth="2.6" />
          </g>
        );

      case 'retry_champion':
        // 17. Blacksmith Anvil & Resilient Hammer
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinejoin="round">
            <path
              d="M28 50 L70 50 C66 57 60 60 56 61 L62 70 L36 70 L42 61 C36 60 31 56 28 50 Z"
              fill={palette.symbolSecondary}
              fillOpacity="0.35"
            />
            <rect x="42" y="28" width="16" height="8" rx="1.5" fill={palette.symbolPrimary} />
            <line x1="50" y1="36" x2="50" y2="50" strokeWidth="2.5" />
          </g>
        );

      case 'mistake_corrector':
        // 18. Alchemist's Balance Scale & Equilibrium Star
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinecap="round">
            <line x1="50" y1="26" x2="50" y2="70" strokeWidth="2.4" />
            <line x1="32" y1="38" x2="68" y2="38" strokeWidth="2.2" />
            <polygon points="32,38 26,52 38,52" fill={palette.symbolSecondary} fillOpacity="0.35" />
            <polygon points="68,38 62,52 74,52" fill={palette.symbolSecondary} fillOpacity="0.35" />
            <line x1="40" y1="70" x2="60" y2="70" strokeWidth="2.6" />
          </g>
        );

      case 'subject_master':
        // 19. Tri-Ring Armillary Astrolabe
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none">
            <circle cx="50" cy="50" r="20" fill={palette.symbolSecondary} fillOpacity="0.2" />
            <ellipse cx="50" cy="50" rx="10" ry="20" />
            <ellipse cx="50" cy="50" rx="20" ry="8" />
            <circle cx="50" cy="50" r="3.5" fill={palette.symbolPrimary} />
          </g>
        );

      case 'full_syllabus_explorer':
        // 20. Celestial Meridian Globe on Pedestal
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinecap="round">
            <circle cx="50" cy="46" r="17" fill={palette.symbolSecondary} fillOpacity="0.3" />
            <ellipse cx="50" cy="46" rx="8" ry="17" />
            <line x1="33" y1="46" x2="67" y2="46" />
            <path d="M36 62 A 22 22 0 0 0 64 62" strokeWidth="2.2" />
            <line x1="50" y1="67" x2="50" y2="74" strokeWidth="2.4" />
            <line x1="41" y1="74" x2="59" y2="74" strokeWidth="2.6" />
          </g>
        );

      case 'practice_milestone':
        // 21. Ionic Fluted Pillar of Study
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinecap="round">
            <rect x="33" y="28" width="34" height="6" rx="2" fill={palette.symbolSecondary} fillOpacity="0.4" />
            <rect x="38" y="34" width="24" height="32" fill={palette.symbolSecondary} fillOpacity="0.2" />
            <line x1="44" y1="34" x2="44" y2="66" />
            <line x1="50" y1="34" x2="50" y2="66" />
            <line x1="56" y1="34" x2="56" y2="66" />
            <rect x="31" y="66" width="38" height="6" rx="1.5" fill={palette.symbolPrimary} />
          </g>
        );

      case 'revision_champion':
        // 22. Scholar's Beacon Lantern & Radiant Rays
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon
              points="40,34 60,34 64,62 36,62"
              fill={palette.symbolSecondary}
              fillOpacity="0.35"
            />
            <path d="M43 34 C43 27 57 27 57 34" />
            <circle cx="50" cy="48" r="5" fill={palette.symbolPrimary} />
            <line x1="34" y1="66" x2="66" y2="66" strokeWidth="2.6" />
            <line x1="27" y1="48" x2="32" y2="48" />
            <line x1="68" y1="48" x2="73" y2="48" />
          </g>
        );

      case 'marathon_scholar':
      default:
        // 23. Grand Archive Tome & Laureate Ribbon
        return (
          <g stroke={palette.symbolPrimary} strokeWidth="2.1" fill="none" strokeLinecap="round">
            <rect
              x="33"
              y="27"
              width="34"
              height="42"
              rx="3"
              fill={palette.symbolSecondary}
              fillOpacity="0.35"
            />
            <line x1="41" y1="27" x2="41" y2="69" />
            <line x1="47" y1="38" x2="61" y2="38" />
            <line x1="47" y1="46" x2="61" y2="46" />
            <line x1="47" y1="54" x2="56" y2="54" />
            <polygon points="52,69 52,78 56,74 60,78 60,69" fill={palette.symbolPrimary} />
          </g>
        );
    }
  };

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${dimensions} ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`${gradPrefix}-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.rimStart} />
            <stop offset="50%" stopColor={palette.rimMid} />
            <stop offset="100%" stopColor={palette.rimEnd} />
          </linearGradient>
          <linearGradient id={`${gradPrefix}-enamel`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.enamelStart} />
            <stop offset="100%" stopColor={palette.enamelEnd} />
          </linearGradient>
        </defs>

        {renderOuterSilhouette()}

        {/* Subtle Top Metallic Specular Highlight */}
        <path
          d="M 28 26 A 28 28 0 0 1 72 26"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={unlocked ? 0.35 : 0.15}
        />

        {renderCenterMotif()}

        {/* Top & Bottom Precision Rivets */}
        <circle cx="50" cy="14" r="1.6" fill={palette.accentDot} />
        <circle cx="50" cy="86" r="1.6" fill={palette.accentDot} />
      </svg>
    </div>
  );
};
