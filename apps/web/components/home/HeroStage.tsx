'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useMotionValueEvent, useScroll } from 'motion/react';
import { useCanRender3D, useMediaQuery, useVisible } from '@/components/three/support';
import { HeroPoster } from './HeroPoster';

const HeroScene = dynamic(() => import('@/components/three/HeroScene'), { ssr: false });

/**
 * 3D-Bühne hinter dem Hero-Text: Platten ordnen sich beim Scrollen vom losen Stapel zur verlegten Fläche,
 * die Maus bewegt die Kamera leicht. Ohne WebGL, bei reduced motion oder auf schwachen Geräten bleibt das Poster.
 */
export function HeroStage({ sectionRef }: { sectionRef: React.RefObject<HTMLElement | null> }) {
  const can3D = useCanRender3D();
  const wide = useMediaQuery('(min-width: 1024px)');
  const stageRef = useRef<HTMLDivElement>(null);
  const visible = useVisible(stageRef, '0px');
  const progressRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [sceneReady, setSceneReady] = useState(false);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current = v;
  });

  useEffect(() => {
    if (!can3D) return;
    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [can3D]);

  useEffect(() => {
    if (!can3D) return;
    // Szene erst nach dem ersten Bild einblenden, damit der Hero-Text sofort steht (LCP).
    const id = window.setTimeout(() => setSceneReady(true), 150);
    return () => window.clearTimeout(id);
  }, [can3D]);

  return (
    <div ref={stageRef} className="absolute inset-0 overflow-hidden" aria-hidden>
      <HeroPoster className={`absolute inset-0 size-full transition-opacity duration-1000 ${can3D && sceneReady ? 'opacity-0' : 'opacity-100'}`} />
      {can3D && sceneReady && (
        <div className="fade-in absolute inset-0">
          <HeroScene progressRef={progressRef} pointerRef={pointerRef} active={visible} offsetX={wide ? 3.0 : 0} />
        </div>
      )}
      {/* Abdunkelung links, damit der Text auf jeder Bildschirmbreite lesbar bleibt */}
      <div className="absolute inset-0 bg-gradient-to-r from-gruen-dunkel/80 via-gruen-dunkel/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-gruen to-transparent" />
    </div>
  );
}
