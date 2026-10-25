import React from 'react';

export interface ClassicIconProps {
  className?: string;
  size?: number;
}

/**
 * Gilded Academic Crest & Laurel Medallion — Welcome & Academic Excellence
 */
export const CrestOfExcellenceIcon: React.FC<ClassicIconProps> = ({ className = '', size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="crestGold" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="45%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <linearGradient id="crestNavy" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#312E81" />
        <stop offset="50%" stopColor="#1E1B4B" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>
    </defs>
    {/* Outer Laurel Ring */}
    <circle cx="32" cy="32" r="29" stroke="url(#crestGold)" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.75" />
    <path
      d="M14 44C9 36 10 23 17 15M50 44C55 36 54 23 47 15"
      stroke="url(#crestGold)"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Heraldic Shield */}
    <path
      d="M32 8L50 15V31C50 43.5 41.8 52.4 32 56C22.2 52.4 14 43.5 14 31V15L32 8Z"
      fill="url(#crestNavy)"
      stroke="url(#crestGold)"
      strokeWidth="2.4"
    />
    {/* Inner Filigree */}
    <path
      d="M32 12L46 17.5V30.5C46 40.5 39.5 48 32 51.2C24.5 48 18 40.5 18 30.5V17.5L32 12Z"
      stroke="#FDE68A"
      strokeWidth="0.9"
      strokeOpacity="0.45"
    />
    {/* Central Star & Open Book */}
    <path
      d="M23 33C26 31.5 29.5 31.5 32 33C34.5 31.5 38 31.5 41 33V41C38 39.5 34.5 39.5 32 41C29.5 39.5 26 39.5 23 41V33Z"
      fill="#FEF3C7"
      stroke="url(#crestGold)"
      strokeWidth="1.4"
    />
    <path
      d="M32 17L34.3 22.1L39.8 22.7L35.6 26.3L36.8 31.7L32 28.8L27.2 31.7L28.4 26.3L24.2 22.7L29.7 22.1L32 17Z"
      fill="url(#crestGold)"
    />
  </svg>
);

/**
 * Codex & Quill Emblem — Subjects, Weekly Lessons & Personal Revision Deck
 */
export const ScholarCodexIcon: React.FC<ClassicIconProps> = ({ className = '', size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="codexEmerald" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="50%" stopColor="#059669" />
        <stop offset="100%" stopColor="#064E3B" />
      </linearGradient>
      <linearGradient id="codexGold" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#codexEmerald)" stroke="url(#codexGold)" strokeWidth="2.2" />
    <circle cx="32" cy="32" r="24" stroke="#A7F3D0" strokeWidth="0.9" strokeDasharray="2 2" opacity="0.6" />
    {/* Open Illuminated Tome */}
    <path
      d="M16 23C21 21 27 21.5 32 24.5C37 21.5 43 21 48 23V43C43 41 37 41.5 32 44.5C27 41.5 21 41 16 43V23Z"
      fill="#FFFBEB"
      stroke="url(#codexGold)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M32 24.5V44.5" stroke="#B45309" strokeWidth="1.6" />
    {/* Script Lines */}
    <path d="M20 28H28M20 32H28M20 36H26M36 28H44M36 32H44M36 36H42" stroke="#065F46" strokeWidth="1.5" strokeLinecap="round" />
    {/* Gilded Feather Quill */}
    <path
      d="M46 13C40 15 35 21 33 28L30 37L39 34C45 31 49 24 46 13Z"
      fill="url(#codexGold)"
      stroke="#78350F"
      strokeWidth="1.2"
    />
  </svg>
);

/**
 * Astrolabe & Precision Target Compass — Exam Scope & Weak-Topic Revision
 */
export const AstrolabeTargetIcon: React.FC<ClassicIconProps> = ({ className = '', size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="astroCrimson" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FB7185" />
        <stop offset="50%" stopColor="#E11D48" />
        <stop offset="100%" stopColor="#881337" />
      </linearGradient>
      <linearGradient id="astroBrass" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="50%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#astroCrimson)" stroke="url(#astroBrass)" strokeWidth="2.4" />
    <circle cx="32" cy="32" r="21" stroke="#FFE4E6" strokeWidth="1.3" strokeOpacity="0.6" />
    <circle cx="32" cy="32" r="13" stroke="url(#astroBrass)" strokeWidth="1.8" />
    {/* Cardinal Crosshairs */}
    <path d="M32 6V16M32 48V58M6 32H16M48 32H58" stroke="url(#astroBrass)" strokeWidth="2.2" strokeLinecap="round" />
    {/* Compass Rose Star */}
    <path
      d="M32 15L36 28L49 32L36 36L32 49L28 36L15 32L28 28L32 15Z"
      fill="#FFF1F2"
      stroke="url(#astroBrass)"
      strokeWidth="1.5"
    />
    <circle cx="32" cy="32" r="4" fill="url(#astroBrass)" />
  </svg>
);

/**
 * Tactile Mechanical Key & Chronometer — Active CBT & Keyboard Shortcuts
 */
export const ChronometerKeyIcon: React.FC<ClassicIconProps> = ({ className = '', size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="chronoIndigo" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="55%" stopColor="#4338CA" />
        <stop offset="100%" stopColor="#1E1B4B" />
      </linearGradient>
      <linearGradient id="chronoGold" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#chronoIndigo)" stroke="url(#chronoGold)" strokeWidth="2.4" />
    <rect x="11" y="11" width="42" height="42" rx="12" stroke="#C7D2FE" strokeWidth="1" strokeOpacity="0.45" />
    {/* Keycap Tiles A B C D */}
    <rect x="15" y="16" width="14" height="14" rx="3.5" fill="#EEF2FF" stroke="url(#chronoGold)" strokeWidth="1.5" />
    <text x="22" y="26" textAnchor="middle" fill="#1E1B4B" fontSize="9" fontWeight="900" fontFamily="serif">A</text>
    <rect x="35" y="16" width="14" height="14" rx="3.5" fill="#EEF2FF" stroke="url(#chronoGold)" strokeWidth="1.5" />
    <text x="42" y="26" textAnchor="middle" fill="#1E1B4B" fontSize="9" fontWeight="900" fontFamily="serif">B</text>
    <rect x="15" y="34" width="14" height="14" rx="3.5" fill="#FEF3C7" stroke="url(#chronoGold)" strokeWidth="1.5" />
    <text x="22" y="44" textAnchor="middle" fill="#92400E" fontSize="9" fontWeight="900" fontFamily="serif">F</text>
    {/* Mini Chronometer */}
    <circle cx="42" cy="41" r="7.5" fill="#FEF3C7" stroke="url(#chronoGold)" strokeWidth="1.6" />
    <path d="M42 37V41L45 43" stroke="#92400E" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/**
 * Official Wax Seal & Transcript Scroll — Result Slip & Term Report Card
 */
export const RoyalTranscriptSealIcon: React.FC<ClassicIconProps> = ({ className = '', size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="scrollParchment" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="60%" stopColor="#FEF3C7" />
        <stop offset="100%" stopColor="#FDE68A" />
      </linearGradient>
      <linearGradient id="waxCrimson" x1="34" y1="34" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F43F5E" />
        <stop offset="50%" stopColor="#BE123C" />
        <stop offset="100%" stopColor="#881337" />
      </linearGradient>
      <linearGradient id="sealGold" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="50%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
    </defs>
    {/* Background Medallion */}
    <circle cx="32" cy="32" r="28" fill="#1E293B" stroke="url(#sealGold)" strokeWidth="2.2" />
    {/* Parchment Charter */}
    <rect x="16" y="12" width="28" height="38" rx="4" fill="url(#scrollParchment)" stroke="url(#sealGold)" strokeWidth="1.8" />
    <path d="M21 20H39M21 26H39M21 32H33M21 38H29" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
    {/* Hanging Ribbons */}
    <path d="M41 47L38 57L43 54L47 58L45 47" fill="#E11D48" stroke="#881337" strokeWidth="1" />
    {/* Wax Seal */}
    <circle cx="43" cy="42" r="9.5" fill="url(#waxCrimson)" stroke="url(#sealGold)" strokeWidth="2" />
    <path d="M40 42L42 44L46.5 39.5" stroke="#FEF08A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Eternal Torch & Sunburst Flame — Daily Streak, Check-In & Motivation
 */
export const EternalFlameMedallionIcon: React.FC<ClassicIconProps> = ({ className = '', size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="flameGold" x1="12" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="45%" stopColor="#F97316" />
        <stop offset="100%" stopColor="#9A3412" />
      </linearGradient>
      <linearGradient id="flameCore" x1="22" y1="14" x2="42" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="50%" stopColor="#FACC15" />
        <stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
    </defs>
    {/* Sunburst Halo */}
    <circle cx="32" cy="32" r="28" fill="#431407" stroke="url(#flameGold)" strokeWidth="2.4" />
    <circle cx="32" cy="32" r="23" stroke="#FDBA74" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
    {/* Sculpted Flame */}
    <path
      d="M32 10C32 10 46 21 44 35C42.5 44.5 35.5 50 32 51C28.5 50 21.5 44.5 20 35C18 21 32 10 32 10Z"
      fill="url(#flameGold)"
      stroke="#FEF08A"
      strokeWidth="1.5"
    />
    <path
      d="M32 21C32 21 39 28 38 36.5C37.2 42 33.8 45.5 32 46C30.2 45.5 26.8 42 26 36.5C25 28 32 21 32 21Z"
      fill="url(#flameCore)"
    />
    {/* Classical Brazier Base */}
    <path d="M22 51H42L39 55H25L22 51Z" fill="#FDE68A" stroke="#9A3412" strokeWidth="1.2" />
  </svg>
);

/**
 * Herald's Chime & System Bell — Device & Platform Notifications + Fanfare
 */
export const HeraldBellIcon: React.FC<ClassicIconProps> = ({ className = '', size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="bellBronze" x1="16" y1="10" x2="48" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <linearGradient id="bellRoyal" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4F46E5" />
        <stop offset="55%" stopColor="#312E81" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#bellRoyal)" stroke="url(#bellBronze)" strokeWidth="2.4" />
    {/* Acoustic Resonance Waves */}
    <path d="M14 24C11 28 11 35 14 39M50 24C53 28 53 35 50 39" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M18 27C16 30 16 34 18 37M46 27C48 30 48 34 46 37" stroke="#FDE68A" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
    {/* Sculpted Bell Dome */}
    <path
      d="M32 13C24.8 13 20 18.5 20 26.5V36L16 41H48L44 36V26.5C44 18.5 39.2 13 32 13Z"
      fill="url(#bellBronze)"
      stroke="#FFFBEB"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="32" cy="45" r="4" fill="#FDE68A" />
    <circle cx="32" cy="11" r="2.5" fill="#FDE68A" />
  </svg>
);

/**
 * Sovereign Aegis Shield — Auto-Save, Session Recovery & Offline Resilience
 */
export const SovereignAegisIcon: React.FC<ClassicIconProps> = ({ className = '', size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="aegisTeal" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2DD4BF" />
        <stop offset="50%" stopColor="#0D9488" />
        <stop offset="100%" stopColor="#115E59" />
      </linearGradient>
      <linearGradient id="aegisGold" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="#042F2E" stroke="url(#aegisGold)" strokeWidth="2.2" />
    <path
      d="M32 10L49 16.5V30.5C49 42.2 41.4 50.8 32 54.5C22.6 50.8 15 42.2 15 30.5V16.5L32 10Z"
      fill="url(#aegisTeal)"
      stroke="url(#aegisGold)"
      strokeWidth="2.2"
    />
    <path
      d="M24 32.5L29.5 38L41 25.5"
      stroke="#FFFBEB"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
