'use client';

import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { useCanRender3D, useMediaQuery } from '@/components/three/support';
import { ClipPlatte } from '@/components/clips/ClipPlatte';
import { SectionHeading } from '@/components/ui/SectionHeading';

export const PHASES = [
  { n: '01', label: 'Verlegen', title: 'Zwei Personen, kein Gerät', text: 'Platten greifen ineinander. Rund 100 m² pro Stunde sind realistisch. [Wert von Mario bestätigen]' },
  { n: '02', label: 'Belasten', title: 'Trägt bis 40 Tonnen', text: 'Die Last verteilt sich über die Fläche. Der Untergrund bleibt geschützt.' },
  { n: '03', label: 'Aufnehmen', title: 'Weg ohne Spuren', text: 'Keine Versiegelung, kein Schaden. Platten reinigen, stapeln, wiederverwenden.' },
] as const;

const SequenzScene = dynamic(() => import('@/components/three/SequenzScene'), { ssr: false });

/**
 * Gepinnte Scroll-Sequenz „Verlegen · Belasten · Aufnehmen“: der Scroll-Fortschritt treibt die 3D-Szene (Scroll-Scrub).
 * Ohne 3D (schwaches Gerät, kein WebGL, reduced motion) kommt der Mini-Clip plus drei Standbild-Karten.
 */
export function Sequenz() {
  const can3D = useCanRender3D();
  const reduce = useReducedMotion();
  const wide = useMediaQuery('(min-width: 1024px)');
  if (can3D && !reduce) return wide ? <Pinned /> : <Flow />;
  return <Fallback />;
}

/** Handy und Tablet: nicht gepinnt. Die Szene scrollt normal mit und spielt die drei Phasen ab, während sie durchs Bild wandert. */
function Flow() {
  const box = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const invalidateRef = useRef<() => void>(() => {});
  const [phase, setPhase] = useState(0);
  const { scrollYProgress } = useScroll({ target: box, offset: ['start 90%', 'end 10%'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current = v;
    invalidateRef.current();
    const next = v < 0.33 ? 0 : v < 0.66 ? 1 : 2;
    setPhase((p) => (p === next ? p : next));
  });
  const registerInvalidate = useCallback((fn: () => void) => {
    invalidateRef.current = fn;
  }, []);
  const current = PHASES[phase] ?? PHASES[0];
  return (
    <section id="highlight" className="bg-salbei py-16 sm:py-24" aria-labelledby="sequenz-title">
      <div className="container-site flex flex-col gap-8">
        <SectionHeading eyebrow="Das Highlight" title={<span id="sequenz-title">Verlegen. Belasten. Aufnehmen.</span>} text="Scroll weiter: Die Platten werden verlegt, der LKW fährt drüber, die Platten kommen wieder weg." />
        <div ref={box} className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px]">
          <SequenzScene progressRef={progressRef} registerInvalidate={registerInvalidate} />
          <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl bg-sand/90 px-4 py-3 backdrop-blur" aria-live="polite">
            <p className="text-xs font-bold tracking-[0.2em] text-terracotta-text uppercase">
              {current.n} {current.label}
            </p>
            <p className="font-heading text-lg font-extrabold text-gruen">{current.title}</p>
          </div>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3" aria-label="Drei Phasen">
          {PHASES.map((p, i) => (
            <li key={p.n} className={`rounded-2xl border-l-4 bg-white p-4 ${phase === i ? 'border-terracotta' : 'border-salbei-dunkel'}`} aria-current={phase === i ? 'step' : undefined}>
              <p className="text-xs font-bold tracking-[0.2em] text-terracotta-text uppercase">
                {p.n} {p.label}
              </p>
              <h3 className="mt-1 text-lg">{p.title}</h3>
              <p className="mt-1 text-sm text-text">{p.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Pinned() {
  const outer = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const invalidateRef = useRef<() => void>(() => {});
  const [phase, setPhase] = useState(0);
  const { scrollYProgress } = useScroll({ target: outer, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current = v;
    invalidateRef.current();
    const next = v < 0.33 ? 0 : v < 0.66 ? 1 : 2;
    setPhase((p) => (p === next ? p : next));
  });

  const registerInvalidate = useCallback((fn: () => void) => {
    invalidateRef.current = fn;
  }, []);

  return (
    <section id="highlight" className="bg-salbei" aria-labelledby="sequenz-title">
      <div ref={outer} className="relative h-[320vh]">
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          <div className="container-site grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeading eyebrow="Das Highlight" title={<span id="sequenz-title">Verlegen. Belasten. Aufnehmen.</span>} />
              <ol className="mt-8 space-y-5" aria-label="Drei Phasen">
                {PHASES.map((p, i) => (
                  <li
                    key={p.n}
                    className={`border-l-4 pl-5 transition-[border-color,transform] duration-500 ${phase === i ? 'translate-x-1 border-terracotta' : 'border-salbei-dunkel'}`}
                    aria-current={phase === i ? 'step' : undefined}
                  >
                    <p className={`text-sm font-bold tracking-[0.2em] uppercase ${phase === i ? 'text-terracotta-text' : 'text-text'}`}>
                      <span className={`mr-3 font-heading text-3xl font-extrabold tabular-nums sm:text-4xl ${phase === i ? 'text-gruen' : 'text-text'}`}>{p.n}</span>
                      {p.label}
                    </p>
                    <h3 className={`mt-1 text-xl sm:text-2xl ${phase === i ? '' : 'text-text'}`}>{p.title}</h3>
                    <p className={`mt-1 max-w-md text-text ${phase === i ? '' : 'hidden sm:block'}`}>{p.text}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-sm text-text/70">Beim Scrollen bewegt sich die Platte durch die drei Phasen.</p>
            </div>
            <div className="relative aspect-[4/3] w-full lg:col-span-7 lg:aspect-[16/11]">
              <SequenzScene progressRef={progressRef} registerInvalidate={registerInvalidate} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Fallback() {
  return (
    <section id="highlight" className="bg-salbei py-20 sm:py-28" aria-labelledby="sequenz-title">
      <div className="container-site flex flex-col gap-12">
        <SectionHeading
          eyebrow="Das Highlight"
          title={<span id="sequenz-title">Verlegen. Belasten. Aufnehmen.</span>}
          text="Die Platte durchläuft drei Phasen. Hier als Clip und als drei Standbilder."
        />
        <ClipPlatte className="mx-auto w-full max-w-3xl" caption="Verlegen, belasten, aufnehmen. Der Rasen darunter bleibt grün." />
        <ol className="grid gap-6 md:grid-cols-3">
          {PHASES.map((p) => (
            <li key={p.n} className="karte tilt p-7">
              <p className="text-sm font-bold tracking-[0.2em] text-terracotta-text uppercase">
                {p.n} {p.label}
              </p>
              <h3 className="mt-2 text-2xl">{p.title}</h3>
              <p className="mt-2 text-text">{p.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
