'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { ChatOpenButton } from './ChatOpenButton';
import { HeroStage } from './HeroStage';

const LINES = ['Fester Boden.', 'Genau dort, wo du', 'ihn brauchst.'];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  return (
    <section ref={ref} id="top" className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-gruen text-sand" aria-labelledby="hero-title">
      <HeroStage sectionRef={ref} />
      <div className="container-site relative flex min-h-[100svh] flex-col justify-center gap-7 pt-28 pb-24 sm:gap-8">
        <p className="rise d1 text-xs font-bold tracking-[0.3em] text-akzent uppercase sm:text-sm">Bodenschutzplatten · classicXtreme · Österreich</p>
        <h1 id="hero-title" className="max-w-5xl text-[clamp(2.6rem,8.2vw,6.5rem)] leading-[0.98] font-extrabold tracking-[-0.02em] text-white">
          {LINES.map((line, i) => (
            <span key={line} className={`rise-solid block ${['d2', 'd3', 'd4'][i]}`}>
              {line}
            </span>
          ))}
        </h1>
        <p className="rise d5 max-w-xl text-lg leading-relaxed text-[#C9D6CC] sm:text-2xl">
          Befahrbare Flächen für Baustelle, Paddock und Event. In Stunden verlegt, ohne Spuren wieder weg.
        </p>
        <div className="rise d5 flex flex-wrap gap-4">
          <Link href="/anfrage" className={buttonClasses('primary', 'lg')}>
            Angebot anfragen
            <ArrowRight className="size-5" aria-hidden />
          </Link>
          <ChatOpenButton variant="ghost" className="border-sand/40 text-sand! hover:border-sand hover:bg-white/10!">
            Fragen stellen
          </ChatOpenButton>
        </div>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6 sm:mt-16">
          <ul className="flex flex-wrap gap-x-7 gap-y-2 text-xs font-bold tracking-[0.12em] text-[#C9D6CC] uppercase sm:text-sm" aria-label="Vertrauenszeile">
            <li>40 t Traglast</li>
            <li aria-hidden>·</li>
            <li>100 % Recycling</li>
            <li aria-hidden>·</li>
            <li>Hergestellt in der EU</li>
          </ul>
          <a href="#manifest" className="flex items-center gap-3 text-xs font-bold tracking-[0.3em] text-akzent uppercase hover:text-white">
            Scrollen zum Entdecken
            <svg className="bob" width="18" height="28" viewBox="0 0 18 28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="1" y="1" width="16" height="26" rx="8" />
              <path d="M9 7v6" strokeLinecap="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
