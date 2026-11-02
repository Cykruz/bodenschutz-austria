'use client';

import { useState, type ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';

interface ClipFrameProps {
  /** Beschreibung für Screenreader (der Clip ist ein Bild, der Text steht daneben im HTML). */
  label: string;
  caption?: string;
  children: ReactNode;
  className?: string;
  /** Hintergrund des Clips */
  tone?: 'sand' | 'gruen' | 'white';
}

/**
 * Rahmen für die animierten Mini-Clips (reines CSS/SVG). Bietet Pause/Play; bei prefers-reduced-motion
 * steht die Animation von selbst und zeigt den Endzustand (die statischen SVG-Werte sind der letzte Frame).
 */
export function ClipFrame({ label, caption, children, className = '', tone = 'sand' }: ClipFrameProps) {
  const [paused, setPaused] = useState(false);
  const bg = tone === 'gruen' ? 'bg-gruen-hell' : tone === 'white' ? 'bg-white' : 'bg-sand';
  return (
    <figure className={`relative overflow-hidden rounded-karte border border-linie ${bg} ${className}`}>
      <div className={`clip ${paused ? 'clip-paused' : ''}`} role="img" aria-label={label}>
        {children}
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? 'Animation abspielen' : 'Animation anhalten'}
        className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-white/90 text-gruen shadow hover:bg-white motion-reduce:hidden"
      >
        {paused ? <Play className="size-5" aria-hidden /> : <Pause className="size-5" aria-hidden />}
      </button>
      {caption && <figcaption className="border-t border-linie/70 px-4 py-2 text-sm text-text">{caption}</figcaption>}
    </figure>
  );
}
