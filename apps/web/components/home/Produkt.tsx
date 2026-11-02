'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { Box, Layers, Scale, Weight } from 'lucide-react';
import { useCanRender3D, useVisible } from '@/components/three/support';
import { buttonClasses } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { formatNumber } from '@/lib/format';
import type { ProductSpec } from '@/lib/types';

const ProductScene = dynamic(() => import('@/components/three/ProductScene'), { ssr: false });

const ph = (v: string, placeholder: boolean) => (placeholder ? `[${v}]` : v);

export function Produkt({ product }: { product: ProductSpec }) {
  const can3D = useCanRender3D();
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useVisible(wrap);
  const rotationRef = useRef({ y: 0.6, x: 0.35, auto: true });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    rotationRef.current.auto = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const r = rotationRef.current;
    r.y += (e.clientX - drag.current.x) * 0.01;
    r.x = Math.max(-0.6, Math.min(1.1, r.x + (e.clientY - drag.current.y) * 0.01));
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const r = rotationRef.current;
    const step = 0.25;
    if (e.key === 'ArrowLeft') r.y -= step;
    else if (e.key === 'ArrowRight') r.y += step;
    else if (e.key === 'ArrowUp') r.x = Math.max(-0.6, r.x - step);
    else if (e.key === 'ArrowDown') r.x = Math.min(1.1, r.x + step);
    else if (e.key === ' ') r.auto = !r.auto;
    else return;
    e.preventDefault();
    if (e.key !== ' ') r.auto = false;
  };

  const kpis = [
    { icon: Box, label: 'Maße', value: ph(`${formatNumber(product.lengthCm)} × ${formatNumber(product.widthCm)} cm`, product.isPlaceholder) },
    { icon: Weight, label: 'Gewicht', value: ph(`${formatNumber(product.weightKg)} kg`, product.isPlaceholder) },
    { icon: Scale, label: 'Traglast', value: `${formatNumber(product.loadCapacityTons)} t` },
    { icon: Layers, label: 'Je Palette', value: ph(`${product.platesPerPallet} Platten`, product.isPlaceholder) },
  ];

  return (
    <section id="produkt" className="bg-sand py-20 sm:py-28" aria-labelledby="produkt-title">
      <div className="container-site grid items-center gap-12 lg:grid-cols-2">
        <div
          ref={wrap}
          className="relative aspect-square w-full touch-none select-none rounded-[28px] bg-salbei"
          role="img"
          aria-label={`Drehbare Ansicht der Bodenschutzplatte ${product.name}. Mit Maus ziehen oder Pfeiltasten drehen, Leertaste startet die automatische Drehung.`}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKey}
        >
          {can3D ? (
            <ProductScene rotationRef={rotationRef} active={visible} />
          ) : (
            <svg viewBox="0 0 420 300" className="absolute inset-0 size-full p-8" aria-hidden>
              <g transform="translate(30,60)">
                <polygon points="0,90 180,0 360,90 180,180" fill="#D97B2A" />
                <polygon points="0,90 180,180 180,210 0,120" fill="#8F4A12" />
                <polygon points="180,180 360,90 360,120 180,210" fill="#B9621C" />
                <g stroke="#C26E24" strokeWidth="3">
                  <path d="M40,90 L220,0" />
                  <path d="M80,110 L260,20" />
                  <path d="M120,130 L300,40" />
                  <path d="M160,150 L340,60" />
                  <path d="M60,30 L240,120" />
                  <path d="M100,10 L280,100" />
                </g>
              </g>
            </svg>
          )}
          <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-gruen">Ziehen zum Drehen</span>
        </div>

        <div>
          <SectionHeading
            eyebrow="Das Produkt"
            title={<span id="produkt-title">{product.name}</span>}
            text={product.description || 'Bodenschutzplatte aus 100 % Recycling-Kunststoff. Hergestellt in der EU. Exklusiv in Österreich.'}
          />
          <dl className="mt-8 grid grid-cols-2 gap-4">
            {kpis.map(({ icon: Icon, label, value }) => (
              <div key={label} className="tilt karte p-5">
                <Icon className="size-6 text-terracotta-text" aria-hidden />
                <dt className="mt-2 text-sm font-semibold text-text">{label}</dt>
                <dd className="font-heading text-2xl font-extrabold text-gruen tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/anfrage" className={buttonClasses('secondary', 'lg')}>
              Preis anfragen
            </Link>
            <Link href="/anfrage" className={buttonClasses('ghost', 'lg')}>
              Mengen berechnen
            </Link>
          </div>
          {product.isPlaceholder && <p className="mt-5 text-sm text-text/80">Werte in eckigen Klammern sind Platzhalter bis zur Bestätigung durch Bodenschutz Austria.</p>}
        </div>
      </div>
    </section>
  );
}
