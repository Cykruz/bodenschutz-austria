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
      out.push(<polygon key={`${r}-${c}`} points={`${x - 9},${y + 4.5} ${x + 4},${y - 2} ${x + 9},${y + 0.5} ${x - 4},${y + 7}`} fill="#4E575D" />);
    }
  }
  return <>{out}</>;
}

export function HeroPoster({ className = '' }: { className?: string }) {
  // Palettenstapel wie zu Beginn der 3D-Szene: neun Platten knapp übereinander, leicht versetzt, rechts neben dem Text
  const plates = Array.from({ length: 9 }, (_, i) => {
    const jitter = ((i * 7919) % 13) - 6; // deterministischer kleiner Versatz
    return (
      <g key={i} transform={`translate(${jitter * 1.2},${-i * 8 + jitter * 0.3})`}>
        <polygon points="0,90 180,0 360,90 180,180" fill="#353C41" />
        <polygon points="0,90 180,180 180,189 0,99" fill="#1B1F22" />
        <polygon points="180,180 360,90 360,99 180,189" fill="#272C30" />
        {i === 8 && <Noppen />}
      </g>
    );
  });
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
      {/* Bodenscheibe wie in der Szene */}
      <ellipse cx="1080" cy="540" rx="400" ry="140" fill="#24463A" opacity="0.8" />
      {/* Positionierung und CSS-Animation getrennt halten: die Animation setzt transform und würde das Attribut überschreiben */}
      <g transform="translate(900,420)">
        <g className="float-slow" style={{ animationDuration: '9s' }}>{plates}</g>
      </g>
    </svg>
  );
}
