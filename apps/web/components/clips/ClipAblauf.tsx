import { ClipFrame } from './ClipFrame';

/** Mini-Clip 01 (8 s): Handy macht Foto, Zahlen zählen hoch, Umschlag fliegt zu Marios Posteingang, Haken „Freigeben“. */
export function ClipAblauf({ className = '', caption }: { className?: string; caption?: string }) {
  return (
    <ClipFrame
      className={className}
      caption={caption}
      label="Animation: Ein Handy fotografiert den Boden, daraus werden 120 Quadratmeter, 46 Platten und 2 Paletten berechnet, ein Umschlag fliegt in Marios Posteingang und wird mit einem Haken freigegeben."
    >
      <svg viewBox="0 0 400 240" className="block h-auto w-full" aria-hidden focusable="false">
        {/* Boden */}
        <rect x="0" y="196" width="400" height="44" fill="#E6EDE3" />

        {/* Handy */}
        <g className="ca-phone">
          <rect x="34" y="56" width="68" height="124" rx="12" fill="#1E3A2F" />
          <rect x="41" y="68" width="54" height="94" rx="6" fill="#F6F3EC" />
          <rect x="47" y="112" width="42" height="44" rx="4" fill="#8FA68A" />
          <rect x="47" y="112" width="42" height="14" rx="3" fill="#B9C9B3" />
          <circle cx="68" cy="170" r="4" fill="#F0A85A" />
          <rect className="ca-flash" x="41" y="68" width="54" height="94" rx="6" fill="#FFFFFF" />
        </g>

        {/* Zahlenkarte */}
        <g className="ca-card">
          <rect x="128" y="66" width="140" height="104" rx="14" fill="#FFFFFF" stroke="#D9D4C7" />
          <text x="198" y="96" textAnchor="middle" fontFamily="Nunito, Nunito Sans, sans-serif" fontWeight="800" fontSize="22" fill="#1E3A2F" className="ca-n1">
            120 m²
          </text>
          <text x="198" y="124" textAnchor="middle" fontFamily="Nunito, Nunito Sans, sans-serif" fontWeight="800" fontSize="18" fill="#B9621C" className="ca-n2">
            46 Platten
          </text>
          <text x="198" y="150" textAnchor="middle" fontFamily="Nunito, Nunito Sans, sans-serif" fontWeight="800" fontSize="18" fill="#B9621C" className="ca-n3">
            2 Paletten
          </text>
        </g>

        {/* Posteingang */}
        <g>
          <rect x="300" y="132" width="72" height="44" rx="8" fill="#1E3A2F" />
          <rect x="306" y="124" width="60" height="12" rx="4" fill="#2A4D3F" />
          <text x="336" y="196" textAnchor="middle" fontFamily="Nunito Sans, sans-serif" fontWeight="700" fontSize="11" fill="#44524A">
            Marios Posteingang
          </text>
        </g>

        {/* Umschlag */}
        <g className="ca-mail">
          <rect x="-18" y="-12" width="36" height="24" rx="3" fill="#F0A85A" />
          <path d="M-18 -12 L0 2 L18 -12" fill="none" stroke="#1E3A2F" strokeWidth="2" />
        </g>

        {/* Haken Freigeben */}
        <g className="ca-check">
          <circle cx="336" cy="96" r="18" fill="#2F6B4F" />
          <path d="M326 96 L333 103 L347 89" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="ca-check-path" />
          <text x="336" y="72" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="12" fill="#2F6B4F">
            Freigeben
          </text>
        </g>

        {/* Pfeile */}
        <path d="M106 118 L124 118" stroke="#B9621C" strokeWidth="3" strokeLinecap="round" className="ca-arrow1" />
        <path d="M272 118 L292 118" stroke="#B9621C" strokeWidth="3" strokeLinecap="round" className="ca-arrow2" />
      </svg>
    </ClipFrame>
  );
}
