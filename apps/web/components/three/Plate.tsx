'use client';

import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Bodenschutzplatte nach dem echten Produkt: dunkle Recycling-Kunststoffplatte 240 × 120 cm (2,4 × 1,2 Einheiten)
// mit kleinen länglichen Anti-Rutsch-Noppen in dichten, versetzten Reihen. Wenige Segmente, leichter HDPE-Glanz.
export const PLATE = { length: 2.4, width: 1.2, height: 0.12 } as const;

const COLORS = {
  body: '#24282B', // Anthrazit (Plattenkörper, Recycling-HDPE)
  top: '#2C3134', // Oberseite
  stud: '#34393D', // Noppen, fast gleicher Ton, Kontrast entsteht durch Licht
} as const;

const STUD = { radius: 0.021, length: 0.105, cols: 13, rows: 10, pitchX: 0.172, pitchZ: 0.108 } as const;

/** Oberflächenmuster zur Veranschaulichung: Noppenplatte (Standard), Riffelprofil (Schwerlast), Paddock-Gitter (offen, mit Sand verfüllt). */
export type PlateVariant = 'noppen' | 'riffel' | 'gitter';
export const PLATE_VARIANTS: { id: PlateVariant; label: string; text: string }[] = [
  { id: 'noppen', label: 'Noppenplatte', text: 'Geschlossene Platte mit länglichen Anti-Rutsch-Noppen in versetzten Reihen. Standard für Baustellenzufahrt, Kran- und Eventflächen.' },
  { id: 'riffel', label: 'Riffelprofil', text: 'Geschlossene Platte mit diagonalem Riffelprofil wie Riffelblech. Besonders griffig für Rampen und häufiges Befahren bei Nässe.' },
  { id: 'gitter', label: 'Paddock-Gitter', text: 'Offenes Gitter, das mit Sand oder Splitt verfüllt wird. Matschfrei und wasserdurchlässig für Paddock, Auslauf und Führanlage.' },
];

type Shared = { body: THREE.BufferGeometry; studs: THREE.BufferGeometry; bodyMat: THREE.MeshStandardMaterial; studMat: THREE.MeshStandardMaterial; topMat: THREE.MeshStandardMaterial; open: boolean };
const sharedByVariant = new Map<PlateVariant, Shared>();

/** Geometrie der Noppen: Kapseln liegend entlang der Plattenlänge, Reihen um eine halbe Teilung versetzt, zu einem Mesh verschmolzen. */
function buildStuds(): THREE.BufferGeometry {
  const base = new THREE.CapsuleGeometry(STUD.radius, STUD.length, 3, 10);
  base.rotateZ(Math.PI / 2); // Länge entlang x
  const parts: THREE.BufferGeometry[] = [];
  const maxX = PLATE.length / 2 - STUD.length / 2 - 0.08;
  for (let row = 0; row < STUD.rows; row++) {
    const z = (row - (STUD.rows - 1) / 2) * STUD.pitchZ;
    const offset = row % 2 ? STUD.pitchX / 2 : 0;
    for (let c = 0; c < STUD.cols; c++) {
      const x = (c - (STUD.cols - 1) / 2) * STUD.pitchX + offset - STUD.pitchX / 4;
      if (Math.abs(x) > maxX) continue;
      const g = base.clone();
      g.translate(x, PLATE.height / 2 + STUD.radius * 0.25, z);
      parts.push(g);
    }
  }
  base.dispose();
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

/** Riffelprofil: kurze diagonale Stege, in jeder Zelle um 90° gedreht (Riffelblech-Optik), zu einem Mesh verschmolzen. */
function buildRiffel(): THREE.BufferGeometry {
  const bar = new THREE.BoxGeometry(0.095, 0.018, 0.026);
  const parts: THREE.BufferGeometry[] = [];
  const cols = 20;
  const rows = 10;
  const pitchX = (PLATE.length - 0.16) / cols;
  const pitchZ = (PLATE.width - 0.12) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const g = bar.clone();
      g.rotateY(((r + c) % 2 ? 1 : -1) * Math.PI / 4);
      g.translate((c - (cols - 1) / 2) * pitchX, PLATE.height / 2 + 0.008, (r - (rows - 1) / 2) * pitchZ);
      parts.push(g);
    }
  }
  bar.dispose();
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

/** Paddock-Gitter: Rahmen plus Stege, dazwischen offen; Zellen werden in der Szene mit einer Sandfläche dargestellt. */
function buildGitter(): THREE.BufferGeometry {
  const h = PLATE.height * 0.8;
  const web = 0.016;
  const cols = 24;
  const rows = 12;
  const parts: THREE.BufferGeometry[] = [];
  const add = (sx: number, sz: number, x: number, z: number) => {
    const g = new THREE.BoxGeometry(sx, h, sz);
    g.translate(x, 0, z);
    parts.push(g);
  };
  add(PLATE.length, web, 0, -PLATE.width / 2 + web / 2);
  add(PLATE.length, web, 0, PLATE.width / 2 - web / 2);
  add(web, PLATE.width, -PLATE.length / 2 + web / 2, 0);
  add(web, PLATE.width, PLATE.length / 2 - web / 2, 0);
  for (let c = 1; c < cols; c++) add(web, PLATE.width, -PLATE.length / 2 + (c * PLATE.length) / cols, 0);
  for (let r = 1; r < rows; r++) add(PLATE.length, web, 0, -PLATE.width / 2 + (r * PLATE.width) / rows);
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

/** Geometrien und Materialien je Variante einmal erzeugen und zwischen allen Szenen teilen (Modul-Cache, kein Hook-Zustand). */
function getShared(variant: PlateVariant): Shared {
  let s = sharedByVariant.get(variant);
  if (!s) {
    if (variant === 'gitter') {
      s = {
        body: buildGitter(),
        studs: new THREE.BufferGeometry(),
        bodyMat: new THREE.MeshStandardMaterial({ color: '#1F2326', roughness: 0.7, metalness: 0.08 }),
        studMat: new THREE.MeshStandardMaterial({ color: COLORS.stud }),
        // Sandfüllung der Zellen
        topMat: new THREE.MeshStandardMaterial({ color: '#BFA77C', roughness: 1 }),
        open: true,
      };
    } else {
      s = {
        body: new RoundedBoxGeometry(PLATE.length, PLATE.height, PLATE.width, 3, 0.045),
        studs: variant === 'riffel' ? buildRiffel() : buildStuds(),
        bodyMat: new THREE.MeshStandardMaterial({ color: COLORS.body, roughness: 0.62, metalness: 0.1 }),
        studMat: new THREE.MeshStandardMaterial({ color: variant === 'riffel' ? '#383E42' : COLORS.stud, roughness: 0.42, metalness: 0.15 }),
        topMat: new THREE.MeshStandardMaterial({ color: COLORS.top, roughness: 0.55, metalness: 0.1 }),
        open: false,
      };
    }
    sharedByVariant.set(variant, s);
  }
  return s;
}

export function usePlateParts(variant: PlateVariant = 'noppen') {
  return useMemo(() => getShared(variant), [variant]);
}

export interface PlateProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  variant?: PlateVariant;
}

/** Eine Platte: dunkler Körper plus Oberflächenmuster als verschmolzenes Low-Poly-Mesh; beim Gitter liegt die Sandfüllung tiefer in den Zellen. */
export const Plate = forwardRef<THREE.Group, PlateProps>(function Plate({ position, rotation, scale = 1, variant = 'noppen' }, ref) {
  const p = usePlateParts(variant);
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={p.body} material={p.bodyMat} castShadow receiveShadow />
      {!p.open && <mesh geometry={p.studs} material={p.studMat} castShadow />}
      <mesh position={[0, p.open ? PLATE.height * 0.12 : PLATE.height / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={p.topMat} receiveShadow>
        <planeGeometry args={[PLATE.length - 0.06, PLATE.width - 0.06]} />
      </mesh>
    </group>
  );
});

/** Gemeinsame Beleuchtung für alle Szenen: warmes Hauptlicht schräg von vorn, damit die Noppen Kanten zeigen. */
export function SceneLights({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      <ambientLight intensity={0.5 * intensity} color="#F6F3EC" />
      <hemisphereLight intensity={0.45 * intensity} color="#E6EDE3" groundColor="#1E3A2F" />
      <directionalLight position={[5, 8, 6]} intensity={2.2 * intensity} color="#FFF4E5" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 4, -3]} intensity={0.7 * intensity} color="#C9D6CC" />
    </>
  );
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (t: number) => t * t * (3 - 2 * t);
