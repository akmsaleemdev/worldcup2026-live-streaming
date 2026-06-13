"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import type { Group, Mesh } from "three";

/**
 * 3D homepage hero scene (Req 12.3).
 *
 * A purely presentational React Three Fiber / Drei scene rendered behind the
 * hero content. It "suggests" a stadium (a tiered bowl ring under a starfield),
 * a stylized championship trophy at the centre, and golden particle effects.
 * The palette is the KOORAKIT navy background with gold/champagne accents.
 *
 * This module is only ever loaded on the client via a dynamic import with
 * `ssr: false` (see `HeroSceneBackground`), so it never participates in
 * server rendering or hydration of the home page. It owns no data and renders
 * inside an `aria-hidden`, pointer-events-none layer.
 */

const NAVY = "#0A1A3F";
const NAVY_DEEP = "#081230";
const GOLD = "#D4AF37";
const GOLD_SOFT = "#C9A227";
const BLUE = "#1E40AF";
const SILVER = "#E8EAED";

/** Stylized championship trophy assembled from primitive geometries. */
function Trophy() {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.35;
    }
  });

  const gold = (
    <meshStandardMaterial
      color={GOLD}
      metalness={0.95}
      roughness={0.2}
      emissive={GOLD_SOFT}
      emissiveIntensity={0.15}
    />
  );

  return (
    <group ref={group} position={[0, -0.2, 0]} scale={1.1}>
      {/* Cup bowl (open hemisphere) */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.62, 48, 32, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58]} />
        {gold}
      </mesh>
      {/* Cup rim */}
      <mesh position={[0, 1.18, 0]}>
        <torusGeometry args={[0.6, 0.05, 16, 48]} />
        {gold}
      </mesh>
      {/* Handles */}
      <mesh position={[0.66, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.28, 0.045, 16, 32, Math.PI]} />
        {gold}
      </mesh>
      <mesh position={[-0.66, 0.95, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[0.28, 0.045, 16, 32, Math.PI]} />
        {gold}
      </mesh>
      {/* Stem */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.5, 32]} />
        {gold}
      </mesh>
      {/* Plinth */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.16, 32]} />
        {gold}
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.46, 0.5, 0.12, 32]} />
        <meshStandardMaterial color={SILVER} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Stadium suggestion: a slowly turning tiered bowl surrounding the trophy. */
function Stadium() {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y -= delta * 0.05;
    }
  });

  const tiers = [
    { radius: 3.0, height: 0.5, y: 0.1, color: BLUE, opacity: 0.35 },
    { radius: 3.6, height: 0.9, y: 0.4, color: NAVY, opacity: 0.5 },
    { radius: 4.2, height: 1.4, y: 0.8, color: NAVY_DEEP, opacity: 0.65 },
  ];

  return (
    <group ref={group} position={[0, -0.9, 0]} rotation={[0.18, 0, 0]}>
      {/* Pitch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[2.6, 64]} />
        <meshStandardMaterial color={BLUE} metalness={0.1} roughness={0.9} transparent opacity={0.25} />
      </mesh>
      {tiers.map((tier, index) => (
        <mesh key={index} position={[0, tier.y, 0]}>
          <cylinderGeometry
            args={[tier.radius, tier.radius - 0.4, tier.height, 96, 1, true]}
          />
          <meshStandardMaterial
            color={tier.color}
            metalness={0.4}
            roughness={0.6}
            transparent
            opacity={tier.opacity}
            side={2}
          />
        </mesh>
      ))}
      {/* Rim of light around the top tier */}
      <mesh position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.2, 0.04, 16, 120]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

/** Subtle orbiting golden orb to add depth/motion behind the trophy. */
function Orb() {
  const mesh = useRef<Mesh>(null);

  useFrame((state) => {
    if (mesh.current) {
      const t = state.clock.elapsedTime * 0.4;
      mesh.current.position.x = Math.sin(t) * 2.4;
      mesh.current.position.z = Math.cos(t) * 2.4;
      mesh.current.position.y = 1.4 + Math.sin(t * 2) * 0.2;
    }
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.08, 24, 24]} />
      <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.2} />
    </mesh>
  );
}

export function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.4, 7.5], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop="always"
    >
      <color attach="background" args={[NAVY_DEEP]} />
      <fog attach="fog" args={[NAVY_DEEP, 8, 16]} />

      <ambientLight intensity={0.4} color={SILVER} />
      <directionalLight position={[4, 6, 4]} intensity={1.1} color={GOLD} />
      <pointLight position={[-4, 2, -2]} intensity={0.8} color={BLUE} />
      <spotLight
        position={[0, 6, 2]}
        angle={0.5}
        penumbra={0.8}
        intensity={1.4}
        color={GOLD}
      />

      <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.6}>
        <Trophy />
      </Float>

      <Stadium />
      <Orb />

      {/* Golden particle field filling the scene */}
      <Sparkles
        count={120}
        scale={[12, 6, 8]}
        size={3}
        speed={0.3}
        opacity={0.7}
        color={GOLD}
      />
      <Sparkles
        count={60}
        scale={[10, 5, 6]}
        size={1.5}
        speed={0.2}
        opacity={0.5}
        color={SILVER}
      />
    </Canvas>
  );
}

export default HeroScene;
