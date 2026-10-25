import React from 'react';

interface ScholarCBTLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showSubtitle?: boolean;
  theme?: 'dark' | 'light';
  className?: string;
}

export const ScholarCBTLogo: React.FC<ScholarCBTLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showSubtitle = false,
  theme = 'dark',
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size];

  const wordmarkClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl sm:text-3xl',
  }[size];

  const primaryText = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const accentText = theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600';
  const subText = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Custom Geometric Academic Crest Emblem */}
      <div
        className={`${iconDimensions} relative shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-950 p-0.5 shadow-sm ring-1 ring-white/15 flex items-center justify-center`}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="scholarShieldGrad" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="55%" stopColor="#312E81" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
            <linearGradient id="scholarGoldGrad" x1="18" y1="10" x2="46" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Outer Crest Shield */}
          <path
            d="M32 5L54 13.5V30.5C54 44.2 44.6 54.4 32 59C19.4 54.4 10 44.2 10 30.5V13.5L32 5Z"
            fill="url(#scholarShieldGrad)"
            stroke="url(#scholarGoldGrad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Inner Shield Facet */}
          <path
            d="M32 9.5L49.5 16.3V30.2C49.5 41.3 41.9 49.8 32 53.8C22.1 49.8 14.5 41.3 14.5 30.2V16.3L32 9.5Z"
            stroke="#818CF8"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />

          {/* Academic Mortarboard / Diamond Crown at Top */}
          <path
            d="M32 13L45 19L32 25L19 19L32 13Z"
            fill="url(#scholarGoldGrad)"
          />
          <path
            d="M45 19V25.5"
            stroke="#FDE68A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="45" cy="26.5" r="1.6" fill="#FBBF24" />

          {/* Open Illuminated Textbook Pages */}
          <path
            d="M18 30.5C22.5 29.5 27.5 30.8 32 33.5C36.5 30.8 41.5 29.5 46 30.5V43.5C41.5 42.5 36.5 43.8 32 46.5C27.5 43.8 22.5 42.5 18 43.5V30.5Z"
            fill="#F8FAFC"
          />
          <path
            d="M32 33.5V46.5"
            stroke="#4F46E5"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Subtle Page Lines */}
          <path
            d="M21.5 34.5H28.5M21.5 38.2H27.5M35.5 34.5H42.5M36.5 38.2H42.5"
            stroke="#6366F1"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <div className={`${wordmarkClasses} font-extrabold tracking-tight font-display ${primaryText}`}>
            Scholar<span className={accentText}>CBT</span>
          </div>
          {showSubtitle && (
            <span className={`text-[11px] font-medium tracking-wide mt-0.5 ${subText}`}>
              Grade 7 Assessment Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
};
