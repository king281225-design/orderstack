"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GiftBox3D } from "@/components/storefront/christmas/gift-box-3d";

const TIER_COUNT = 5;
const TIER_HEIGHT = 1.85;
const RADIAL = 14;
const TIER_GREENS = ["#14532d", "#1b6b34", "#166534", "#1f7a3a", "#15803d"];

const tierBottom = (i: number) => 0.7 + i * 0.92;
const tierRadius = (i: number) => 2.0 - i * 0.36;

/** Outer foliage radius at a given height — the widest tier surface covering it. */
function surfaceRadius(y: number): number {
  let r = 0;
  for (let i = 0; i < TIER_COUNT; i++) {
    const b = tierBottom(i);
    if (y >= b && y <= b + TIER_HEIGHT) {
      r = Math.max(r, tierRadius(i) * (1 - (y - b) / TIER_HEIGHT));
    }
  }
  return r;
}

/**
 * A cone whose bottom rim alternates long, drooping tips and short notches —
 * reads as layered pine boughs instead of a smooth party-hat cone.
 */
function makeTierGeometry(radius: number, height: number): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(radius, height, RADIAL, 1, true);
  const pos = geo.attributes.position;
  const stride = RADIAL + 1;
  for (let i = 0; i < pos.count; i++) {
    const row = Math.floor(i / stride);
    if (row !== 1) continue;
    const tip = i % stride % 2 === 0;
    const f = tip ? 1 : 0.78;
    pos.setX(i, pos.getX(i) * f);
    pos.setZ(i, pos.getZ(i) * f);
    pos.setY(i, pos.getY(i) - (tip ? 0.16 : 0));
  }
  geo.computeVertexNormals();
  return geo;
}

function makeStarGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const outer = 0.4;
  const inner = 0.18;
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 + Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
  geo.center();
  return geo;
}

const LIGHT_COLORS = ["#ff4d4d", "#ffd54a", "#5bc0ff", "#ffffff", "#ff8ad8"];
const LIGHT_COUNT = 28;
const BAUBLE_COLORS = ["#dc2626", "#facc15", "#e5e7eb", "#2563eb", "#dc2626"];

const lights = Array.from({ length: LIGHT_COUNT }, (_, j) => {
  const t = j / (LIGHT_COUNT - 1);
  const y = 1.0 + t * 4.6;
  const angle = t * Math.PI * 2 * 4.2;
  const r = surfaceRadius(y) * 0.97 + 0.05;
  return { x: Math.sin(angle) * r, y, z: Math.cos(angle) * r, color: LIGHT_COLORS[j % LIGHT_COLORS.length] };
});

const baubles = Array.from({ length: TIER_COUNT - 1 }, (_, i) =>
  [0, 1, 2].map((j) => {
    const tip = (i * 2 + j * 3) % 7;
    const angle = (Math.PI * 2 * tip) / 7;
    const r = tierRadius(i) * 0.97;
    return {
      x: Math.sin(angle) * r,
      y: tierBottom(i) - 0.34,
      z: Math.cos(angle) * r,
      color: BAUBLE_COLORS[(i + j) % BAUBLE_COLORS.length],
    };
  }),
).flat();

/**
 * A pine-style Christmas tree built from primitives, ~6.7 model units tall
 * with its origin at ground level: five jagged tiers in alternating greens,
 * a spiral of twinkling lights, hanging baubles, a glowing star, a trunk,
 * snow underfoot and a few wrapped presents.
 */
export function ChristmasTree3D({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const tierGeometries = useMemo(
    () => Array.from({ length: TIER_COUNT }, (_, i) => makeTierGeometry(tierRadius(i), TIER_HEIGHT)),
    [],
  );
  const starGeometry = useMemo(() => makeStarGeometry(), []);
  const starRef = useRef<THREE.Mesh>(null);
  const lightMaterials = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    lightMaterials.current.forEach((m, j) => {
      if (m) m.emissiveIntensity = 0.9 + 0.9 * Math.sin(t * 3 + j * 1.7);
    });
    // A swing, not a full spin — a flat star turned edge-on reads as a thin sliver.
    if (starRef.current) starRef.current.rotation.y = Math.sin(t * 1.1) * 0.6;
  });

  return (
    <group ref={groupRef}>
      {/* Snow + trunk */}
      <mesh position={[0, 0.04, 0.3]} scale={[2.9, 0.16, 2.1]}>
        <sphereGeometry args={[1, 24, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#eef6ff" emissiveIntensity={0.95} roughness={1} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.28, 0.34, 0.9, 12]} />
        <meshStandardMaterial color="#5b3a1e" roughness={1} />
      </mesh>

      {/* Foliage tiers */}
      {tierGeometries.map((geo, i) => (
        <mesh key={i} geometry={geo} position={[0, tierBottom(i) + TIER_HEIGHT / 2, 0]}>
          <meshStandardMaterial
            color={TIER_GREENS[i % TIER_GREENS.length]}
            roughness={0.95}
            flatShading
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Baubles hanging from the lower tips */}
      {baubles.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]}>
          <sphereGeometry args={[0.15, 16, 12]} />
          <meshStandardMaterial color={b.color} roughness={0.2} metalness={0.65} />
        </mesh>
      ))}

      {/* Twinkling lights */}
      {lights.map((l, j) => (
        <mesh key={j} position={[l.x, l.y, l.z]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial
            ref={(m) => {
              lightMaterials.current[j] = m;
            }}
            color={l.color}
            emissive={l.color}
            emissiveIntensity={1}
          />
        </mesh>
      ))}

      {/* Star */}
      <mesh ref={starRef} geometry={starGeometry} position={[0, 6.42, 0]}>
        <meshStandardMaterial color="#f5b301" emissive="#f59e0b" emissiveIntensity={0.8} roughness={0.3} metalness={0.3} />
      </mesh>

      {/* Presents under the tree */}
      <group position={[-1.15, 0.36, 1.55]} rotation={[0, 0.4, 0]} scale={0.75}>
        <GiftBox3D color="#dc2626" ribbon="#facc15" />
      </group>
      <group position={[1.0, 0.3, 1.7]} rotation={[0, -0.3, 0]} scale={0.6}>
        <GiftBox3D color="#16a34a" ribbon="#f8fafc" />
      </group>
      <group position={[0.1, 0.25, 2.05]} rotation={[0, 0.15, 0]} scale={0.5}>
        <GiftBox3D color="#2563eb" ribbon="#facc15" />
      </group>
    </group>
  );
}
