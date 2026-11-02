import { ClipFrame } from './ClipFrame';

/** Mini-Clip 02 (9 s): Platten fallen nacheinander ein, LKW fährt drüber, Platten heben ab, Rasen bleibt grün. */
export function ClipPlatte({ className = '', caption, tone = 'sand' }: { className?: string; caption?: string; tone?: 'sand' | 'gruen' | 'white' }) {
  const plates = [60, 130, 200, 270];
  return (
    <ClipFrame
      className={className}
      caption={caption}
      tone={tone}
      label="Animation: Vier Bodenschutzplatten werden nacheinander auf eine Wiese gelegt, ein LKW fährt darüber, die Platten werden wieder aufgenommen und der Rasen darunter ist grün geblieben."
    >
      <svg viewBox="0 0 400 240" className="block h-auto w-full" aria-hidden focusable="false">
        {/* Wiese: matschig (Start) und grün (Ende) übereinander, Überblendung per Opacity */}
        <rect x="0" y="160" width="400" height="80" fill="#9C8B6E" />
        <rect x="0" y="160" width="400" height="80" fill="#6FA072" className="cp-grass" />
        {[20, 95, 170, 245, 320, 380].map((x) => (
          <path key={x} d={`M${x} 160 l4 -10 l4 10 M${x + 10} 160 l3 -7 l3 7`} stroke="#4E8A58" strokeWidth="2" fill="none" className="cp-grass" />
        ))}

        {/* Platten */}
        {plates.map((x, i) => (
          <g key={x} className={`cp-plate cp-plate-${i + 1}`} style={{ transformOrigin: `${x + 36}px 152px` }}>
            <rect x={x} y="140" width="72" height="20" rx="4" fill="#D97B2A" />
            <rect x={x} y="140" width="72" height="6" rx="3" fill="#F0A85A" />
            {[8, 24, 40, 56].map((dx) => (
              <rect key={dx} x={x + dx} y="148" width="9" height="8" rx="1.5" fill="#B9621C" />
            ))}
          </g>
        ))}

        {/* LKW */}
        <g className="cp-truck">
          <rect x="-150" y="80" width="96" height="52" rx="6" fill="#1E3A2F" />
          <rect x="-54" y="94" width="44" height="38" rx="6" fill="#2A4D3F" />
          <rect x="-46" y="100" width="22" height="16" rx="3" fill="#E6EDE3" />
          <circle cx="-126" cy="136" r="11" fill="#1F2A24" />
          <circle cx="-126" cy="136" r="5" fill="#F6F3EC" />
          <circle cx="-30" cy="136" r="11" fill="#1F2A24" />
          <circle cx="-30" cy="136" r="5" fill="#F6F3EC" />
          <text x="-102" y="112" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="14" fill="#F0A85A">
            40 t
          </text>
        </g>

        {/* Beschriftung der Phasen */}
        <g fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="14">
          <text x="24" y="36" fill="#1E3A2F" className="cp-l1">
            01 Verlegen
          </text>
          <text x="160" y="36" fill="#1E3A2F" className="cp-l2">
            02 Belasten
          </text>
          <text x="292" y="36" fill="#1E3A2F" className="cp-l3">
            03 Aufnehmen
          </text>
        </g>
      </svg>
    </ClipFrame>
  );
}
