/**
 * Statisches Poster: isometrische Bodenschutzplatten in Produktoptik (dunkle Platte, längliche Noppen in versetzten Reihen).
 * Dient als Fallback und während des Ladens der 3D-Szene.
 */
function Noppen({ rows = 9, cols = 12 }: { rows?: number; cols?: number }) {
  // Noppen im isometrischen Raster der Deckfläche (Parallelogramm 0,90 → 180,0 → 360,90 → 180,180)
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5 + (r % 2 ? 0.5 : 0)) / (cols + 0.5); // entlang der Länge
      const v = (r + 0.5) / rows; // entlang der Breite
      const x = 180 * u + 180 * v;
      const y = 90 - 90 * u + 90 * v;
      out.push(<polygon key={`${r}-${c}`} points={`${x - 9},${y + 4.5} ${x + 4},${y - 2} ${x + 9},${y + 0.5} ${x - 4},${y + 7}`} fill="#3F474C" />);
    }
  }
  return <>{out}</>;
}

export function HeroPoster({ className = '' }: { className?: string }) {
  const plate = (x: number, y: number, opacity = 1, i = 0) => (
    <g key={`${x}-${y}`} transform={`translate(${x},${y})`} opacity={opacity} className="float-slow" style={{ animationDelay: `${i * -1.3}s` }}>
      <polygon points="0,90 180,0 360,90 180,180" fill="#2C3134" />
      <polygon points="0,90 180,180 180,214 0,124" fill="#181C1E" />
      <polygon points="180,180 360,90 360,124 180,214" fill="#22272A" />
      <Noppen />
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
        {plate(-300, -60, 0.35, 5)}
        {plate(180, -110, 0.5, 4)}
        {plate(0, 0, 1, 0)}
        {plate(180, 90, 1, 1)}
        {plate(-180, 90, 1, 2)}
        {plate(0, 180, 1, 3)}
      </g>
    </svg>
  );
}
