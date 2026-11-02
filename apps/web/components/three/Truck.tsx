'use client';

import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Low-Poly-LKW (Kipper) aus Grundkörpern, flach schattiert. Fährt in +x-Richtung.
 * Maße grob in Metern: ca. 7 m lang, 2,4 m breit, Räder stehen bei y = 0 auf.
 */
const C = {
  cab: '#1E3A2F',
  cabDark: '#162B23',
  body: '#D97B2A',
  bodyDark: '#B9621C',
  glass: '#BFD7E6',
  chrome: '#D9D4C7',
  tire: '#1F2A24',
  rim: '#E6EDE3',
  light: '#F0A85A',
  tail: '#B3261E',
  gravel: '#8C7A5B',
  gravelDark: '#6F5F46',
} as const;

function useMats() {
  return useMemo(() => {
    const m = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.7, metalness: 0.05, ...extra });
    return {
      cab: m(C.cab),
      cabDark: m(C.cabDark),
      body: m(C.body),
      bodyDark: m(C.bodyDark),
      glass: m(C.glass, { roughness: 0.2, metalness: 0.3 }),
      chrome: m(C.chrome, { roughness: 0.35, metalness: 0.6 }),
      tire: m(C.tire, { roughness: 0.95 }),
      rim: m(C.rim, { roughness: 0.4, metalness: 0.4 }),
      light: m(C.light, { emissive: new THREE.Color(C.light), emissiveIntensity: 0.6 }),
      tail: m(C.tail, { emissive: new THREE.Color(C.tail), emissiveIntensity: 0.4 }),
      gravel: m(C.gravel, { roughness: 1 }),
      gravelDark: m(C.gravelDark, { roughness: 1 }),
    };
  }, []);
}

const WHEEL_X = [2.45, -0.55, -1.85];
const WHEEL_Z = [-1.0, 1.0];

export const LowPolyTruck = forwardRef<THREE.Group, { position?: [number, number, number]; visible?: boolean }>(function LowPolyTruck({ position, visible = true }, ref) {
  const m = useMats();
  return (
    <group ref={ref} position={position} visible={visible}>
      {/* Rahmen */}
      <mesh position={[0.2, 0.75, 0]} material={m.cabDark} castShadow>
        <boxGeometry args={[6.6, 0.28, 1.9]} />
      </mesh>
      {/* Fahrerhaus */}
      <mesh position={[2.55, 1.95, 0]} material={m.cab} castShadow>
        <boxGeometry args={[1.9, 1.9, 2.2]} />
      </mesh>
      <mesh position={[2.55, 2.95, 0]} material={m.cabDark} castShadow>
        <boxGeometry args={[2.0, 0.14, 2.3]} />
      </mesh>
      {/* Windschutzscheibe (leicht geneigt), Seitenscheiben */}
      <mesh position={[3.47, 2.3, 0]} rotation={[0, 0, -0.12]} material={m.glass}>
        <boxGeometry args={[0.06, 0.95, 1.95]} />
      </mesh>
      {WHEEL_Z.map((z) => (
        <mesh key={`win-${z}`} position={[2.75, 2.3, z * 1.11]} material={m.glass}>
          <boxGeometry args={[1.0, 0.7, 0.04]} />
        </mesh>
      ))}
      {/* Kühlergrill, Scheinwerfer, Stoßstange */}
      <mesh position={[3.52, 1.35, 0]} material={m.cabDark}>
        <boxGeometry args={[0.08, 0.55, 1.5]} />
      </mesh>
      {WHEEL_Z.map((z) => (
        <mesh key={`hl-${z}`} position={[3.54, 1.35, z * 0.85]} material={m.light}>
          <boxGeometry args={[0.08, 0.26, 0.34]} />
        </mesh>
      ))}
      <mesh position={[3.6, 0.92, 0]} material={m.chrome}>
        <boxGeometry args={[0.24, 0.3, 2.35]} />
      </mesh>
      {/* Spiegel */}
      {WHEEL_Z.map((z) => (
        <group key={`mir-${z}`} position={[3.2, 2.45, z * 1.3]}>
          <mesh material={m.cabDark}>
            <boxGeometry args={[0.06, 0.5, 0.26]} />
          </mesh>
          <mesh position={[-0.15, 0.15, -z * 0.12]} material={m.cabDark}>
            <boxGeometry args={[0.3, 0.05, 0.05]} />
          </mesh>
        </group>
      ))}
      {/* Auspuff hinter dem Fahrerhaus, Tank */}
      <mesh position={[1.45, 2.0, 1.05]} material={m.chrome}>
        <cylinderGeometry args={[0.08, 0.08, 2.4, 8]} />
      </mesh>
      <mesh position={[1.3, 0.75, 1.05]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}>
        <cylinderGeometry args={[0.3, 0.3, 1.2, 10]} />
      </mesh>
      {/* Kippmulde mit Rippen und Heckklappe */}
      <mesh position={[-0.95, 1.7, 0]} material={m.body} castShadow>
        <boxGeometry args={[4.0, 1.3, 2.3]} />
      </mesh>
      {[-2.7, -1.8, -0.9, 0.0, 0.9].map((x) => (
        <mesh key={`rib-${x}`} position={[x, 1.7, 0]} material={m.bodyDark}>
          <boxGeometry args={[0.1, 1.36, 2.38]} />
        </mesh>
      ))}
      <mesh position={[-2.97, 1.75, 0]} material={m.bodyDark}>
        <boxGeometry args={[0.1, 1.4, 2.36]} />
      </mesh>
      {/* Ladung: Schotterhaufen */}
      <mesh position={[-0.9, 2.45, 0]} material={m.gravel} castShadow>
        <dodecahedronGeometry args={[0.95, 0]} />
      </mesh>
      <mesh position={[-1.9, 2.3, 0.4]} material={m.gravelDark}>
        <dodecahedronGeometry args={[0.65, 0]} />
      </mesh>
      <mesh position={[0.1, 2.3, -0.4]} material={m.gravelDark}>
        <dodecahedronGeometry args={[0.6, 0]} />
      </mesh>
      {/* Rücklichter */}
      {WHEEL_Z.map((z) => (
        <mesh key={`tl-${z}`} position={[-3.02, 1.05, z * 0.9]} material={m.tail}>
          <boxGeometry args={[0.06, 0.18, 0.3]} />
        </mesh>
      ))}
      {/* Kotflügel */}
      {WHEEL_X.map((x) =>
        WHEEL_Z.map((z) => (
          <mesh key={`fender-${x}-${z}`} position={[x, 1.12, z * 1.0]} material={x > 0 ? m.cab : m.bodyDark}>
            <boxGeometry args={[1.3, 0.12, 0.5]} />
          </mesh>
        )),
      )}
      {/* Räder mit Felgen */}
      {WHEEL_X.map((x) =>
        WHEEL_Z.map((z) => (
          <group key={`wheel-${x}-${z}`} position={[x, 0.55, z]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh material={m.tire} castShadow>
              <cylinderGeometry args={[0.55, 0.55, 0.42, 12]} />
            </mesh>
            <mesh position={[0, 0, 0]} material={m.rim}>
              <cylinderGeometry args={[0.3, 0.3, 0.46, 8]} />
            </mesh>
          </group>
        )),
      )}
      {/* Achsen */}
      {WHEEL_X.map((x) => (
        <mesh key={`axle-${x}`} position={[x, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.cabDark}>
          <cylinderGeometry args={[0.1, 0.1, 2.0, 6]} />
        </mesh>
      ))}
    </group>
  );
});

/** Low-Poly-Baum: Stamm plus zwei gestapelte Ikosaeder. */
export function LowPolyTree({ position, scale = 1, dark = false }: { position: [number, number, number]; scale?: number; dark?: boolean }) {
  const mats = useMemo(
    () => ({
      trunk: new THREE.MeshStandardMaterial({ color: '#6B4F3A', flatShading: true, roughness: 1 }),
      leaf: new THREE.MeshStandardMaterial({ color: dark ? '#2F5A47' : '#3A6B55', flatShading: true, roughness: 0.9 }),
      leaf2: new THREE.MeshStandardMaterial({ color: dark ? '#27493B' : '#4E8A58', flatShading: true, roughness: 0.9 }),
    }),
    [dark],
  );
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]} material={mats.trunk} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 1.2, 6]} />
      </mesh>
      <mesh position={[0, 1.7, 0]} material={mats.leaf} castShadow>
        <icosahedronGeometry args={[1.0, 0]} />
      </mesh>
      <mesh position={[0, 2.6, 0]} material={mats.leaf2} castShadow>
        <icosahedronGeometry args={[0.7, 0]} />
      </mesh>
    </group>
  );
}
