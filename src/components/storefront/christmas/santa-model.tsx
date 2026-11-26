"use client";

import type { RefObject } from "react";
import type * as THREE from "three";

const RED = "#d42a2a";
const DARK_RED = "#a81818";
const FUR = "#fbfaf5";
const SKIN = "#f2b8a0";
const BLACK = "#1c1917";
const GOLD = "#f5c542";

const CLOUD_PUFFS: [number, number, number, number][] = [
  [0, 0, 0, 0.5],
  [-0.62, -0.04, 0.1, 0.38],
  [0.64, -0.04, 0.05, 0.4],
  [0.28, 0.04, 0.42, 0.34],
  [-0.3, 0.04, 0.42, 0.32],
];

function Arm({ armRef, x, restAngle }: { armRef: RefObject<THREE.Group | null>; x: number; restAngle: number }) {
  return (
    <group ref={armRef} position={[x, 2.12, 0]} rotation={[0, 0, restAngle]}>
      <mesh position={[0, -0.36, 0]}>
        <capsuleGeometry args={[0.17, 0.5, 6, 14]} />
        <meshStandardMaterial color={RED} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.13, 16]} />
        <meshStandardMaterial color={FUR} roughness={1} />
      </mesh>
      <mesh position={[0, -0.84, 0]}>
        <sphereGeometry args={[0.2, 14, 12]} />
        <meshStandardMaterial color={FUR} roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * A cartoon Santa built from primitives (no sourced asset): red coat with
 * fur trim, belt and buckle, arms that swing from the shoulder, a face with
 * beard and moustache, and a drooping hat with a pom-pom — standing on a
 * little cloud. Faces +z (toward the camera); roughly 4 model units tall.
 * The parent drives position/scale/rotation and the arm angles every frame.
 */
export function SantaModel({
  rootRef,
  leftArmRef,
  rightArmRef,
  headRef,
}: {
  rootRef: RefObject<THREE.Group | null>;
  leftArmRef: RefObject<THREE.Group | null>;
  rightArmRef: RefObject<THREE.Group | null>;
  headRef: RefObject<THREE.Group | null>;
}) {
  return (
    <group ref={rootRef}>
      {/* Cloud */}
      <group position={[0, 0.1, 0]}>
        {CLOUD_PUFFS.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[r, 18, 14]} />
            <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.94} />
          </mesh>
        ))}
      </group>

      {/* Boots + legs */}
      {[-0.3, 0.3].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.5, 0.1]}>
            <boxGeometry args={[0.42, 0.26, 0.62]} />
            <meshStandardMaterial color={BLACK} roughness={0.5} />
          </mesh>
          <mesh position={[x, 0.88, 0]}>
            <cylinderGeometry args={[0.19, 0.2, 0.55, 14]} />
            <meshStandardMaterial color={DARK_RED} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Coat */}
      <mesh position={[0, 1.62, 0]}>
        <cylinderGeometry args={[0.6, 0.84, 1.3, 28]} />
        <meshStandardMaterial color={RED} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.98, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.84, 0.1, 12, 36]} />
        <meshStandardMaterial color={FUR} roughness={1} />
      </mesh>
      <mesh position={[0, 1.62, 0.74]}>
        <boxGeometry args={[0.14, 1.3, 0.06]} />
        <meshStandardMaterial color={FUR} roughness={1} />
      </mesh>
      <mesh position={[0, 2.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.52, 0.11, 12, 32]} />
        <meshStandardMaterial color={FUR} roughness={1} />
      </mesh>

      {/* Belt + buckle */}
      <mesh position={[0, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.76, 0.09, 10, 36]} />
        <meshStandardMaterial color={BLACK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.45, 0.8]}>
        <boxGeometry args={[0.3, 0.27, 0.08]} />
        <meshStandardMaterial color={GOLD} roughness={0.25} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.45, 0.85]}>
        <boxGeometry args={[0.15, 0.14, 0.05]} />
        <meshStandardMaterial color={BLACK} roughness={0.5} />
      </mesh>

      {/* Shoulders + arms */}
      <mesh position={[-0.66, 2.12, 0]}>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshStandardMaterial color={RED} roughness={0.8} />
      </mesh>
      <mesh position={[0.66, 2.12, 0]}>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshStandardMaterial color={RED} roughness={0.8} />
      </mesh>
      <Arm armRef={leftArmRef} x={-0.7} restAngle={-0.25} />
      <Arm armRef={rightArmRef} x={0.7} restAngle={0.25} />

      {/* Head */}
      <group ref={headRef} position={[0, 2.7, 0]}>
        <mesh>
          <sphereGeometry args={[0.46, 24, 18]} />
          <meshStandardMaterial color={SKIN} roughness={0.7} />
        </mesh>
        {[-0.16, 0.16].map((x) => (
          <mesh key={x} position={[x, 0.08, 0.4]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color={BLACK} roughness={0.3} />
          </mesh>
        ))}
        {[-0.27, 0.27].map((x) => (
          <mesh key={x} position={[x, -0.05, 0.36]}>
            <sphereGeometry args={[0.09, 12, 10]} />
            <meshStandardMaterial color="#f08a8a" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, -0.02, 0.46]}>
          <sphereGeometry args={[0.09, 12, 10]} />
          <meshStandardMaterial color="#f29a86" roughness={0.7} />
        </mesh>

        {/* Beard, moustache, side hair */}
        <mesh position={[0, -0.3, 0.14]} scale={[1, 0.95, 0.78]}>
          <sphereGeometry args={[0.5, 24, 18]} />
          <meshStandardMaterial color={FUR} roughness={1} />
        </mesh>
        {[
          [-0.32, -0.14, 0.24, 0.26],
          [0.32, -0.14, 0.24, 0.26],
          [0, -0.64, 0.26, 0.23],
        ].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[r, 16, 12]} />
            <meshStandardMaterial color={FUR} roughness={1} />
          </mesh>
        ))}
        <mesh position={[-0.15, -0.1, 0.45]} rotation={[0, 0, 0.35]} scale={[1.5, 0.6, 0.8]}>
          <sphereGeometry args={[0.15, 14, 10]} />
          <meshStandardMaterial color={FUR} roughness={1} />
        </mesh>
        <mesh position={[0.15, -0.1, 0.45]} rotation={[0, 0, -0.35]} scale={[1.5, 0.6, 0.8]}>
          <sphereGeometry args={[0.15, 14, 10]} />
          <meshStandardMaterial color={FUR} roughness={1} />
        </mesh>
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, 0.05, -0.05]}>
            <sphereGeometry args={[0.15, 12, 10]} />
            <meshStandardMaterial color={FUR} roughness={1} />
          </mesh>
        ))}

        {/* Hat: fur band, body, drooping tip, pom-pom */}
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.44, 0.11, 12, 32]} />
          <meshStandardMaterial color={FUR} roughness={1} />
        </mesh>
        <group position={[0, 0.3, 0]} rotation={[0, 0, -0.12]}>
          <mesh position={[0, 0.35, 0]}>
            <coneGeometry args={[0.46, 0.7, 24]} />
            <meshStandardMaterial color={RED} roughness={0.8} />
          </mesh>
          <group position={[0, 0.66, 0]} rotation={[0, 0, -0.85]}>
            <mesh position={[0, 0.2, 0]}>
              <coneGeometry args={[0.2, 0.45, 18]} />
              <meshStandardMaterial color={RED} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.13, 14, 12]} />
              <meshStandardMaterial color={FUR} roughness={1} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
