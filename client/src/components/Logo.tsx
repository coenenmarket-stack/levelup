export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-label="Level Up Life" fill="none">
      <defs>
        <linearGradient id="lvl-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(158 70% 52%)" />
          <stop offset="100%" stopColor="hsl(43 88% 60%)" />
        </linearGradient>
      </defs>
      {/* Shield outline */}
      <path d="M16 3 L28 7 V15 C28 22 22 27 16 29 C10 27 4 22 4 15 V7 Z"
        stroke="url(#lvl-g)" strokeWidth="2" fill="hsl(158 70% 48% / 0.06)" />
      {/* Up arrow / chevron */}
      <path d="M10 19 L16 11 L22 19" stroke="url(#lvl-g)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="22.5" r="1.6" fill="hsl(43 88% 60%)" />
    </svg>
  );
}
