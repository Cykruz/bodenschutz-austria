'use client';

import { useEffect, useState } from 'react';

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/**
 * Entscheidet im Browser, ob eine 3D-Szene sinnvoll ist: kein prefers-reduced-motion, WebGL vorhanden,
 * kein Datensparmodus, nicht offensichtlich schwaches Gerät. Server und erster Render liefern `null` (unentschieden → Poster).
 */
export function useCanRender3D(): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const decide = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      const nav = navigator as Nav;
      if (nav.connection?.saveData) return false;
      if ((nav.deviceMemory ?? 8) <= 2) return false;
      if ((nav.hardwareConcurrency ?? 8) <= 2) return false;
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') ?? c.getContext('webgl');
        if (!gl) return false;
      } catch {
        return false;
      }
      return true;
    };
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setOk(decide());
    const raf = window.requestAnimationFrame(update);
    mq.addEventListener('change', update);
    return () => {
      window.cancelAnimationFrame(raf);
      mq.removeEventListener('change', update);
    };
  }, []);
  return ok;
}

/** Sichtbarkeit eines Elements (IntersectionObserver) für frameloop="demand" außerhalb des Viewports. */
export function useVisible<T extends Element>(ref: React.RefObject<T | null>, rootMargin = '200px') {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return visible;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    const raf = window.requestAnimationFrame(update);
    mq.addEventListener('change', update);
    return () => {
      window.cancelAnimationFrame(raf);
      mq.removeEventListener('change', update);
    };
  }, [query]);
  return matches;
}
