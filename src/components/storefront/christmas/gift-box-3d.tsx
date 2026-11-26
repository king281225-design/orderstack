"use client";

/**
 * A wrapped present built from primitives: box, cross ribbon and a bow.
 * Model size is 1 unit; callers scale the wrapping <group> to taste.
 */
export function GiftBox3D({ color, ribbon, size = 1 }: { color: string; ribbon: string; size?: number }) {
  const s = size;
  return (
    <group>
      <mesh>
        <boxGeometry args={[s, s, s]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh>
        <boxGeometry args={[s * 1.03, s * 1.03, s * 0.2]} />
        <meshStandardMaterial color={ribbon} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh>
        <boxGeometry args={[s * 0.2, s * 1.03, s * 1.03]} />
        <meshStandardMaterial color={ribbon} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[s * 0.17, s * 0.58, 0]} rotation={[0, 0, 0.55]} scale={[1.6, 0.8, 0.8]}>
        <sphereGeometry args={[s * 0.14, 12, 10]} />
        <meshStandardMaterial color={ribbon} roughness={0.35} />
      </mesh>
      <mesh position={[-s * 0.17, s * 0.58, 0]} rotation={[0, 0, -0.55]} scale={[1.6, 0.8, 0.8]}>
        <sphereGeometry args={[s * 0.14, 12, 10]} />
        <meshStandardMaterial color={ribbon} roughness={0.35} />
      </mesh>
      <mesh position={[0, s * 0.54, 0]}>
        <sphereGeometry args={[s * 0.09, 10, 8]} />
        <meshStandardMaterial color={ribbon} roughness={0.35} />
      </mesh>
    </group>
  );
}
