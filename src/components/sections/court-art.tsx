/** Decorative brass line-art of the court and courtyard (no photo needed). */
export function CourtArt() {
  return (
    <svg viewBox="0 0 400 480" className="h-auto w-full drop-shadow-2xl" role="img" aria-label="Illustration of a pickleball court beside a courtyard jacuzzi">
      <defs>
        <linearGradient id="court" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c4638" />
          <stop offset="1" stopColor="#17221c" />
        </linearGradient>
        <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c3a06a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#c3a06a" stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <rect x="20" y="20" width="360" height="440" rx="28" fill="url(#court)" stroke="#c3a06a" strokeOpacity=".35" />
      <g fill="none" stroke="#c3a06a" strokeWidth="2" strokeOpacity=".85">
        <rect x="70" y="60" width="180" height="330" rx="2" />
        <line x1="70" y1="225" x2="250" y2="225" strokeWidth="3" />
        <line x1="70" y1="170" x2="250" y2="170" />
        <line x1="70" y1="280" x2="250" y2="280" />
        <line x1="160" y1="60" x2="160" y2="170" />
        <line x1="160" y1="280" x2="160" y2="390" />
      </g>
      <circle cx="315" cy="330" r="44" fill="url(#pool)" stroke="#c3a06a" strokeOpacity=".8" strokeWidth="2" />
      <g fill="none" stroke="#f7f3ec" strokeOpacity=".5" strokeWidth="1.5" strokeLinecap="round">
        <path d="M292 322c7-6 14-6 21 0s14 6 21 0" />
        <path d="M292 338c7-6 14-6 21 0s14 6 21 0" />
      </g>
      <circle cx="205" cy="128" r="11" fill="#c3a06a" />
      <g fill="#1f3329">
        <circle cx="201" cy="124" r="1.6" />
        <circle cx="209" cy="125" r="1.6" />
        <circle cx="204" cy="132" r="1.6" />
      </g>
      <g fill="#c3a06a">
        {[90, 130, 170, 210, 250, 290, 330].map((x, i) => (
          <circle key={x} cx={x} cy={430 + (i % 2) * 6} r="3" opacity={0.5 + (i % 3) * 0.2} />
        ))}
      </g>
      <path d="M70 430 Q 200 452 350 430" fill="none" stroke="#c3a06a" strokeOpacity=".4" />
      <text x="315" y="400" textAnchor="middle" fill="#f7f3ec" fillOpacity=".55" fontSize="11" letterSpacing="3" fontFamily="sans-serif">
        JACUZZI
      </text>
    </svg>
  );
}
