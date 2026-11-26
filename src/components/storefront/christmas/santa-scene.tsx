"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SantaModel } from "@/components/storefront/christmas/santa-model";
import { ChristmasTree3D } from "@/components/storefront/christmas/xmas-tree-3d";
import { GiftBox3D } from "@/components/storefront/christmas/gift-box-3d";

const POOL = 12;
const THROW_SECONDS = 1.9;
const SKY_DROP_SECONDS = 2.4;
/** Default centred content column of the storefront (max-w-xl); the marketing homepage passes its own wider one. */
const DEFAULT_CONTENT_COLUMN_PX = 576;
/** Trees only appear when the content column leaves at least this much empty margin either side. */
const TREE_MIN_MARGIN_PX = 150;

const GIFT_STYLES: [string, string][] = [
  ["#dc2626", "#facc15"],
  ["#16a34a", "#f8fafc"],
  ["#2563eb", "#facc15"],
  ["#f8fafc", "#dc2626"],
  ["#a855f7", "#facc15"],
  ["#f97316", "#16a34a"],
];

type Slot = {
  group: THREE.Group | null;
  active: boolean;
  mode: "toss" | "sky";
  vx: number;
  vy: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  phase: number;
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function Scene({ contentWidthPx }: { contentWidthPx: number }) {
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);

  const santaRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftTreeRef = useRef<THREE.Group>(null);
  const rightTreeRef = useRef<THREE.Group>(null);

  const slots = useRef<Slot[]>(
    Array.from({ length: POOL }, () => ({
      group: null,
      active: false,
      mode: "toss",
      vx: 0,
      vy: 0,
      spinX: 0,
      spinY: 0,
      spinZ: 0,
      phase: 0,
    })),
  );
  // Stable ref callbacks, so a resize re-render never resets an in-flight gift's visibility.
  const slotRefs = useMemo(
    () =>
      Array.from({ length: POOL }, (_, i) => (el: THREE.Group | null) => {
        const slot = slots.current[i];
        slot.group = el;
        if (el) el.visible = slot.active;
      }),
    [],
  );

  const clock = useRef({ t: 0, lastCycle: -1, nextSky: 1.2 });

  const marginPx = (size.width - contentWidthPx) / 2;
  const showTrees = marginPx >= TREE_MIN_MARGIN_PX;
  const u = size.height > 0 ? viewport.height / size.height : 0; // world units per CSS pixel
  // A tree is ~0.6x as wide as it is tall — cap its height so it fits the margin instead of covering content.
  const treePx = Math.min(430, size.height * 0.52, marginPx * 1.45);
  const treeScale = (treePx * u) / 6.7;
  const treeCenterPx = Math.min(240, Math.max(75, marginPx * 0.5));
  const treeX = viewport.width / 2 - treeCenterPx * u;
  const treeY = -viewport.height / 2 + 14 * u;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const c = clock.current;
    c.t += dt;
    const t = c.t;

    const vw = state.viewport.width;
    const vh = state.viewport.height;
    const uu = vh / state.size.height;
    if (!Number.isFinite(uu) || uu <= 0) return;

    // ---- Santa: sways across the top, alternately tossing gifts left and right ----
    const santaPx = Math.min(165, Math.max(105, state.size.height * 0.19));
    const S = (santaPx * uu) / 4;
    const root = santaRef.current;
    if (root) {
      root.scale.setScalar(S);
      root.position.set(Math.sin(t * 0.24) * vw * 0.36, vh / 2 - 6 * uu - 3.9 * S + Math.sin(t * 2.2) * 0.06 * S, 0);
    }

    const cycle = Math.floor(t / THROW_SECONDS);
    const side = cycle % 2 === 0 ? 1 : -1;
    const p = (t % THROW_SECONDS) / THROW_SECONDS;
    const lift =
      p < 0.4 ? lerp(0.3, 2.3, smooth(p / 0.4)) : p < 0.55 ? lerp(2.3, 1.3, (p - 0.4) / 0.15) : lerp(1.3, 0.3, smooth((p - 0.55) / 0.45));

    const follow = Math.min(1, dt * 14);
    if (rightArmRef.current) {
      const target = side > 0 ? lift : 0.25 + Math.sin(t * 2) * 0.05;
      rightArmRef.current.rotation.z += (target - rightArmRef.current.rotation.z) * follow;
    }
    if (leftArmRef.current) {
      const target = side < 0 ? -lift : -0.25 - Math.sin(t * 2) * 0.05;
      leftArmRef.current.rotation.z += (target - leftArmRef.current.rotation.z) * follow;
    }
    if (root) root.rotation.y += (side * 0.45 - root.rotation.y) * Math.min(1, dt * 3);
    if (headRef.current) headRef.current.rotation.z = Math.sin(t * 2) * 0.05;

    const spawn = (mode: "toss" | "sky", x: number, y: number, vx: number, vy: number, gs: number) => {
      const slot = slots.current.find((s) => !s.active && s.group);
      if (!slot || !slot.group) return;
      slot.active = true;
      slot.mode = mode;
      slot.vx = vx;
      slot.vy = vy;
      slot.spinX = (Math.random() - 0.5) * 5;
      slot.spinY = (Math.random() - 0.5) * 5;
      slot.spinZ = (Math.random() - 0.5) * 4;
      slot.phase = Math.random() * Math.PI * 2;
      slot.group.visible = true;
      slot.group.position.set(x, y, 1);
      slot.group.scale.setScalar(gs);
    };

    const gs = 34 * uu;
    if (p >= 0.5 && c.lastCycle !== cycle) {
      c.lastCycle = cycle;
      const handX = (root?.position.x ?? 0) + side * 1.5 * S;
      const handY = (root?.position.y ?? 0) + 1.9 * S;
      spawn("toss", handX, handY, side * (300 + Math.random() * 180) * uu, (220 + Math.random() * 160) * uu, gs);
    }
    if (t >= c.nextSky) {
      c.nextSky = t + SKY_DROP_SECONDS * (0.7 + Math.random() * 0.6);
      const sky = (Math.random() < 0.5 ? -1 : 1) * vw * (0.28 + Math.random() * 0.2);
      spawn("sky", sky, vh / 2 + gs, 0, -(120 + Math.random() * 60) * uu, gs);
    }

    // ---- Falling gifts ----
    for (const slot of slots.current) {
      const g = slot.group;
      if (!slot.active || !g) continue;
      if (slot.mode === "toss") {
        slot.vy -= 760 * uu * dt;
        g.position.x += slot.vx * dt;
        g.position.y += slot.vy * dt;
        g.rotation.x += slot.spinX * dt;
        g.rotation.y += slot.spinY * dt;
        g.rotation.z += slot.spinZ * dt;
      } else {
        g.position.y += slot.vy * dt;
        g.position.x += Math.cos(t * 1.6 + slot.phase) * 18 * uu * dt;
        g.rotation.y += slot.spinY * 0.4 * dt;
        g.rotation.z = Math.sin(t * 1.5 + slot.phase) * 0.4;
      }
      if (g.position.y < -vh / 2 - 2 * gs) {
        slot.active = false;
        g.visible = false;
      }
    }

    // ---- Trees: a gentle yaw so the 3D shape reads ----
    if (leftTreeRef.current) leftTreeRef.current.rotation.y = 0.3 + Math.sin(t * 0.5) * 0.15;
    if (rightTreeRef.current) rightTreeRef.current.rotation.y = -0.3 + Math.sin(t * 0.5 + 1) * 0.15;
  });

  return (
    <>
      <ambientLight intensity={0.85} color="#fff4e0" />
      <hemisphereLight args={["#ffffff", "#334155", 0.45]} />
      <directionalLight position={[4, 8, 10]} intensity={1.25} />

      <SantaModel rootRef={santaRef} leftArmRef={leftArmRef} rightArmRef={rightArmRef} headRef={headRef} />

      {GIFT_STYLES.concat(GIFT_STYLES).map(([color, ribbon], i) => (
        <group key={i} ref={slotRefs[i]}>
          <GiftBox3D color={color} ribbon={ribbon} />
        </group>
      ))}

      {showTrees && u > 0 && (
        <>
          <group position={[-treeX, treeY, 0]} scale={treeScale}>
            <ChristmasTree3D groupRef={leftTreeRef} />
          </group>
          <group position={[treeX, treeY, 0]} scale={treeScale}>
            <ChristmasTree3D groupRef={rightTreeRef} />
          </group>
        </>
      )}
    </>
  );
}

/**
 * The actual R3F canvas — dynamically imported by santa-loader.tsx with
 * `ssr: false`, so this (and the `three`/`@react-three/fiber` chunk it
 * pulls in) is never part of the server bundle or fetched for any tenant
 * with the campaign flag off.
 *
 * A full-viewport transparent overlay: R3F's canvas wrapper defaults to
 * `pointer-events: auto`, so it's forced to none here — otherwise this layer
 * would swallow every tap on the menu underneath it. z-index 5 sits above
 * the page content but below the cart bar (z-10), the floating buttons
 * (z-40) and the snow layer (z-30).
 */
export default function SantaScene({ contentWidthPx = DEFAULT_CONTENT_COLUMN_PX }: { contentWidthPx?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 5 }} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "low-power" }}
        style={{ pointerEvents: "none" }}
      >
        <Scene contentWidthPx={contentWidthPx} />
      </Canvas>
    </div>
  );
}
