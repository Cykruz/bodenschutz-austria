'use client';

import { forwardRef, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// Bodenschutzplatte: 240 × 120 cm, verhältnisgetreu (2,4 × 1,2 Einheiten), 12 cm hoch für sichtbare Kante.
export const PLATE = { length: 2.4, width: 1.2, height: 0.12 } as const;

const COLORS = { base: '#D97B2A', grid: '#B9621C', light: '#F0A85A' } as const;

/** Prozedurale Rastertextur (Canvas) – kein externes Modell, keine Bilddatei. */
function makePlateTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = COLORS.base;
  ctx.fillRect(0, 0, w, h);
  // Raster aus abgerundeten Vertiefungen (12 × 6)
  const cols = 12;
  const rows = 6;
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw * 0.14;
      const y = r * ch + ch * 0.14;
      const rw = cw * 0.72;
      const rh = ch * 0.72;
      ctx.fillStyle = COLORS.grid;
      roundRect(ctx, x, y, rw, rh, 6);
      ctx.fill();
      ctx.fillStyle = COLORS.light;
      ctx.globalAlpha = 0.35;
      roundRect(ctx, x + 2, y + 2, rw - 4, rh * 0.22, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // Randstreifen
  ctx.strokeStyle = COLORS.light;
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

let shared: { map: THREE.CanvasTexture | null; side: THREE.MeshStandardMaterial; top: THREE.MeshStandardMaterial } | null = null;

export function usePlateMaterials() {
  return useMemo(() => {
    if (!shared) {
      const map = makePlateTexture();
      shared = {
        map,
        top: new THREE.MeshStandardMaterial({ map: map ?? undefined, color: map ? '#ffffff' : COLORS.base, roughness: 0.78, metalness: 0.05 }),
        side: new THREE.MeshStandardMaterial({ color: COLORS.grid, roughness: 0.85, metalness: 0.05 }),
      };
    }
    return shared;
  }, []);
}

export interface PlateProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

/** Eine Platte: abgerundeter Quader mit Rastertextur oben, dunklerer Kante seitlich. */
export const Plate = forwardRef<THREE.Group, PlateProps>(function Plate({ position, rotation, scale = 1 }, ref) {
  const m = usePlateMaterials();
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      {/* Kern (Kanten) */}
      <RoundedBox args={[PLATE.length, PLATE.height, PLATE.width]} radius={0.035} smoothness={3} material={m.side} castShadow receiveShadow />
      {/* Oberseite mit Raster, minimal erhöht */}
      <mesh position={[0, PLATE.height / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.top}>
        <planeGeometry args={[PLATE.length - 0.08, PLATE.width - 0.08]} />
      </mesh>
    </group>
  );
});

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Gemeinsame Beleuchtung für alle Szenen (warm, ruhig). */
export function SceneLights({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      <ambientLight intensity={0.55 * intensity} color="#F6F3EC" />
      <directionalLight position={[4, 7, 5]} intensity={1.6 * intensity} color="#FFF4E5" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 3, -4]} intensity={0.5 * intensity} color="#E6EDE3" />
    </>
  );
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (t: number) => t * t * (3 - 2 * t);
