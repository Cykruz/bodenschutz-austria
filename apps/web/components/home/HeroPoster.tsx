/** Statisches Poster (aus docs/design/Main.dc.html): isometrische Platten, dient als Fallback und während des Ladens der 3D-Szene. */
export function HeroPoster({ className = '' }: { className?: string }) {
  const plate = (x: number, y: number, orange = false, opacity = 1, i = 0) => (
    <g key={`${x}-${y}`} transform={`translate(${x},${y})`} opacity={opacity} className="float-slow" style={{ animationDelay: `${i * -1.3}s` }}>
      <polygon points="0,90 180,0 360,90 180,180" fill={orange ? '#D97B2A' : '#3A6B55'} />
      <polygon points="0,90 180,180 180,214 0,124" fill={orange ? '#8F4A12' : '#1A3328'} />
      <polygon points="180,180 360,90 360,124 180,214" fill={orange ? '#B9621C' : '#27493B'} />
      <path d="M45,90 L225,0 M90,112 L270,22 M135,135 L315,45" stroke={orange ? '#C26E24' : '#2C553F'} strokeWidth="3" />
    </g>
  );
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden focusable="false">
      <defs>
        <radialGradient id="hero-stage" cx="60%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#2F5A47" />
          <stop offset="60%" stopColor="#1E3A2F" />
          <stop offset="100%" stopColor="#15291F" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#hero-stage)" />
      <g transform="translate(760,250)" opacity="0.95">
        {plate(-300, -60, false, 0.35, 5)}
        {plate(180, -110, false, 0.5, 4)}
        {plate(0, 0, false, 1, 0)}
        {plate(180, 90, false, 1, 1)}
        {plate(-180, 90, false, 1, 2)}
        {plate(0, 180, true, 1, 3)}
      </g>
    </svg>
  );
}
