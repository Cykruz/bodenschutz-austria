'use client';

import { useMemo } from 'react';

/** Kurzes Konfetti aus Platten-Rauten (nur transform/opacity, einmalig, bei reduced motion ausgeblendet). */
export function Confetti({ count = 18 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const rnd = (n: number) => ((seed * (n + 1)) % 1000) / 1000;
        return {
          left: `${4 + rnd(1) * 92}%`,
          dx: `${(rnd(2) - 0.5) * 120}px`,
          rot: `${180 + rnd(3) * 540}deg`,
          delay: `${rnd(4) * 0.5}s`,
          dur: `${1.5 + rnd(5) * 0.9}s`,
          color: ['#D97B2A', '#F0A85A', '#1E3A2F', '#B9621C', '#6FA072'][i % 5],
          w: 14 + Math.round(rnd(6) * 10),
        };
      }),
    [count],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 block"
          style={{
            left: p.left,
            width: p.w,
            height: p.w / 2,
            background: p.color,
            borderRadius: 3,
            ['--dx' as string]: p.dx,
            ['--rot' as string]: p.rot,
            ['--delay' as string]: p.delay,
            ['--dur' as string]: p.dur,
          }}
        />
      ))}
    </div>
  );
}
