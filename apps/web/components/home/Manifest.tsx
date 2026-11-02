'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

const PARTS: { text: string; muted?: boolean }[] = [
  { text: 'Wir machen Boden befahrbar.' },
  { text: 'In Stunden, nicht Wochen.', muted: true },
  { text: 'Ohne Versiegelung.' },
  { text: 'Ohne Spuren.', muted: true },
  { text: 'Und jedes Angebot prüft ein Mensch.' },
];

/** Manifest: ein großer Absatz, zeilenweise beim Scrollen aufgedeckt (nur opacity/transform). */
export function Manifest() {
  const reduce = useReducedMotion();
  return (
    <section id="manifest" className="bg-gruen px-5 py-28 text-sand sm:py-40" aria-labelledby="manifest-title">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <p className="text-sm font-bold tracking-[0.3em] text-akzent uppercase">Unser Versprechen</p>
        <h2 id="manifest-title" className="font-heading text-[clamp(1.9rem,5vw,3.6rem)] leading-[1.15] font-extrabold tracking-[-0.01em] text-white">
          {PARTS.map((part, i) => (
            <motion.span
              key={part.text}
              className={`inline ${part.muted ? 'text-[#C9D6CC]' : ''}`}
              initial={reduce ? false : { opacity: 0.15, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: 'easeOut' }}
            >
              {part.text}{' '}
            </motion.span>
          ))}
        </h2>
        <Link href="#sogehts" className="inline-flex items-center gap-3 self-start text-sm font-extrabold tracking-[0.2em] text-akzent uppercase hover:text-white">
          So arbeiten wir <ArrowRight className="size-5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
