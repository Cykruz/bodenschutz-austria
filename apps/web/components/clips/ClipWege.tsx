import { ClipFrame } from './ClipFrame';

/** Mini-Clip 03 (10 s): Umschlag fällt in den Sortierer; Weg A Standardfall (automatisch vorbereitet), Weg B Prüffall (Mario entscheidet). */
export function ClipWege({ className = '', caption }: { className?: string; caption?: string }) {
  return (
    <ClipFrame
      className={className}
      caption={caption}
      label="Animation: Eine Anfrage fällt in einen Sortierer mit der Aufschrift „Feste Regeln prüfen die Angaben“. Standardfälle gehen nach links und werden automatisch vorbereitet, Prüffälle gehen nach rechts zu Mario, der persönlich entscheidet."
    >
      <svg viewBox="0 0 400 240" className="block h-auto w-full" aria-hidden focusable="false">
        {/* Sortierer */}
        <g>
          <rect x="140" y="78" width="120" height="56" rx="12" fill="#1E3A2F" />
          <rect x="150" y="70" width="100" height="12" rx="4" fill="#2A4D3F" />
          <text x="200" y="100" textAnchor="middle" fontFamily="Nunito Sans, sans-serif" fontWeight="700" fontSize="10" fill="#F6F3EC">
            Feste Regeln prüfen
          </text>
          <text x="200" y="114" textAnchor="middle" fontFamily="Nunito Sans, sans-serif" fontWeight="700" fontSize="10" fill="#F6F3EC">
            die Angaben
          </text>
          <g className="cw-gear" style={{ transformOrigin: '248px 126px' }}>
            <circle cx="248" cy="126" r="9" fill="#F0A85A" />
            {[0, 45, 90, 135].map((a) => (
              <rect key={a} x="246" y="113" width="4" height="26" rx="1" fill="#F0A85A" transform={`rotate(${a} 248 126)`} />
            ))}
            <circle cx="248" cy="126" r="4" fill="#1E3A2F" />
          </g>
        </g>

        {/* Wege */}
        <path d="M170 134 C170 170, 90 160, 90 190" fill="none" stroke="#2F6B4F" strokeWidth="3" strokeDasharray="6 6" className="cw-path-a" />
        <path d="M230 134 C230 170, 310 160, 310 190" fill="none" stroke="#B9621C" strokeWidth="3" strokeDasharray="6 6" className="cw-path-b" />

        {/* Ablage A */}
        <g className="cw-tray-a">
          <rect x="40" y="188" width="100" height="36" rx="8" fill="#E6F2EA" stroke="#2F6B4F" />
          <text x="90" y="202" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="10" fill="#2F6B4F">
            Weg A · Standardfall
          </text>
          <text x="90" y="215" textAnchor="middle" fontFamily="Nunito Sans, sans-serif" fontSize="9" fill="#2F6B4F">
            automatisch vorbereitet
          </text>
        </g>

        {/* Ablage B mit Mario */}
        <g className="cw-tray-b">
          <rect x="260" y="188" width="100" height="36" rx="8" fill="#FFF4E5" stroke="#B9621C" />
          <text x="318" y="202" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="10" fill="#B9621C">
            Weg B · Prüffall
          </text>
          <text x="318" y="215" textAnchor="middle" fontFamily="Nunito Sans, sans-serif" fontSize="9" fill="#B9621C">
            Mario entscheidet
          </text>
          <circle cx="272" cy="206" r="8" fill="#D97B2A" />
          <circle cx="272" cy="203" r="3" fill="#FFF4E5" />
          <path d="M266 212 a6 4 0 0 1 12 0" fill="#FFF4E5" />
        </g>

        {/* Umschlag 1: fällt ein, geht Weg A */}
        <g className="cw-mail cw-mail-a">
          <rect x="-16" y="-11" width="32" height="22" rx="3" fill="#F0A85A" />
          <path d="M-16 -11 L0 2 L16 -11" fill="none" stroke="#1E3A2F" strokeWidth="2" />
        </g>
        {/* Umschlag 2: mit Ausrufezeichen, geht Weg B */}
        <g className="cw-mail cw-mail-b">
          <rect x="-16" y="-11" width="32" height="22" rx="3" fill="#F0A85A" />
          <path d="M-16 -11 L0 2 L16 -11" fill="none" stroke="#1E3A2F" strokeWidth="2" />
          <circle cx="14" cy="-10" r="7" fill="#B9621C" />
          <text x="14" y="-6" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="10" fill="#FFFFFF">
            !
          </text>
        </g>

        <text x="200" y="36" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="14" fill="#1E3A2F">
          Jede Anfrage geht einen von zwei Wegen
        </text>
      </svg>
    </ClipFrame>
  );
}
