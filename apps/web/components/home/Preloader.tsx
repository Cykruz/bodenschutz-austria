'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

const KEY = 'bsa_preloaded';
const DURATION = 1100;

/**
 * Preloader mit Zähler 000–100 (Vorbild lusion.co). Läuft einmal je Sitzung, nie bei prefers-reduced-motion.
 * Der Hero-Text ist bereits im HTML und wird davon nicht verzögert; der Zähler deckt ihn nur kurz ab.
 */
export function Preloader() {
  const reduce = useReducedMotion();
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'hidden'>('idle');
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduce) return;
    try {
      if (window.sessionStorage.getItem(KEY)) return;
      window.sessionStorage.setItem(KEY, '1');
    } catch {
      /* ohne Speicher trotzdem einmal zeigen */
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) {
        start = now;
        setState('running');
      }
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * 100));
      if (t < 1) raf = window.requestAnimationFrame(tick);
      else setState('done');
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [reduce]);

  useEffect(() => {
    if (state !== 'done') return;
    const id = window.setTimeout(() => setState('hidden'), 650);
    return () => window.clearTimeout(id);
  }, [state]);

  if (state === 'idle' || state === 'hidden') return null;
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[60] flex items-end justify-between bg-gruen-dunkel px-6 pb-6 text-sand transition-opacity duration-500 ease-out sm:px-10 sm:pb-10 ${
        state === 'done' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <span className="text-xs font-bold tracking-[0.35em] text-akzent uppercase">Bodenschutz Austria</span>
      <span className="font-heading text-[clamp(4rem,14vw,10rem)] leading-none font-extrabold tabular-nums">{String(count).padStart(3, '0')}</span>
    </div>
  );
}
