'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { PRINCIPLES } from '@/lib/site';

const LINES = ['Eine Anfrage', 'ist noch keine', 'Bestellung.'];

/** Kinetische Typografie: drei riesige Zeilen schieben sich beim Scrollen gegenläufig (nur transform). */
export function Kinetic() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x1 = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const x2 = useTransform(scrollYProgress, [0, 1], ['6%', '-6%']);
  const x3 = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']);
  const xs = [x1, x2, x3];

  return (
    <section ref={ref} className="overflow-hidden bg-terracotta py-24 text-gruen-dunkel sm:py-32" aria-labelledby="kinetic-title">
      <h2 id="kinetic-title" className="font-heading text-[clamp(2.8rem,11vw,9rem)] leading-[0.95] font-extrabold tracking-[-0.03em] text-gruen-dunkel uppercase">
        {LINES.map((line, i) => (
          <motion.span key={line} className="block px-5 whitespace-nowrap sm:px-10" style={reduce ? undefined : { x: xs[i] }}>
            {line}
          </motion.span>
        ))}
      </h2>
      <div className="container-site mt-14 grid gap-5 md:grid-cols-2">
        <div className="flex gap-4 rounded-[24px] bg-sand p-6 text-gruen">
          <AlertTriangle className="size-8 shrink-0 text-terracotta-text" aria-hidden />
          <p className="text-lg leading-snug font-semibold">{PRINCIPLES.noSurvey}</p>
        </div>
        <div className="flex gap-4 rounded-[24px] bg-sand p-6 text-gruen">
          <ShieldCheck className="size-8 shrink-0 text-terracotta-text" aria-hidden />
          <p className="text-lg leading-snug font-semibold">{PRINCIPLES.pricesLater}</p>
        </div>
      </div>
    </section>
  );
}
