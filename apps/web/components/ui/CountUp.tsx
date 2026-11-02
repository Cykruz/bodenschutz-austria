'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/** Zählt eine Zahl beim Erscheinen hoch (ca. 0,9 s). Bei prefers-reduced-motion steht sofort der Endwert. */
export function CountUp({ value, format, duration = 900 }: { value: number; format: (n: number) => string; duration?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<number>(0);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  const display = reduce ? value : shown;
  return <span aria-label={format(value)}>{format(display)}</span>;
}
