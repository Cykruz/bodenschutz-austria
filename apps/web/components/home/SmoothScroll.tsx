'use client';

import { useEffect } from 'react';
import { useReducedMotion } from 'motion/react';

/** Weiches Scrollen mit Lenis; bei prefers-reduced-motion komplett aus. Lenis läuft nur im Browser und wird lazy geladen. */
export function SmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    if (window.matchMedia('(pointer: coarse)').matches) return; // auf Touch-Geräten natives Scrollen behalten
    let cancelled = false;
    let raf = 0;
    let instance: { raf: (t: number) => void; destroy: () => void } | null = null;
    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return;
      const lenis = new Lenis({ lerp: 0.12, smoothWheel: true, anchors: true });
      instance = lenis;
      const loop = (time: number) => {
        lenis.raf(time);
        raf = window.requestAnimationFrame(loop);
      };
      raf = window.requestAnimationFrame(loop);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      instance?.destroy();
    };
  }, [reduce]);
  return null;
}
