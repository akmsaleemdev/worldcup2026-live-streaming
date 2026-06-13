"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars, Environment } from "@react-three/drei";
import * as THREE from "three";

/** Animated gold-emissive trophy placeholder (Req 12.3) */
function Trophy() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.5}>
      <mesh ref={ref} position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.5, 1.5, 32]} />
        <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} emissive="#C9A227" emissiveIntensity={0.3} />
      </mesh>
      {/* Trophy base */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.2, 32]} />
        <meshStandardMaterial color="#14264F" metalness={0.7} roughness={0.3} />
      </mesh>
    </Float>
  );
}

/** Animated globe/stadium sphere with navy-blue material */
function Globe() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });
  return (
    <mesh ref={ref} position={[-2.5, 0, -1]} scale={1.5}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#1E40AF" metalness={0.6} roughness={0.4} wireframe opacity={0.6} transparent />
    </mesh>
  );
}

/** Dynamic particle effects */
function Particles() {
  const ref = useRef<THREE.Points>(null);
  const count = 200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 10;
  }
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#D4AF37" transparent opacity={0.6} />
    </points>
  );
}

/**
 * 3D homepage hero scene (Req 12.3).
 * R3F/Drei scene with a trophy, globe, particles, and stars.
 * Dynamically imported and capability-gated in the homepage.
 */
export function HeroScene() {
  return (
    <div className="absolute inset-0 z-0 opacity-60 pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} color="#D4AF37" />
          <pointLight position={[-3, 2, 2]} intensity={0.5} color="#1E40AF" />
          <Trophy />
          <Globe />
          <Particles />
          <Stars radius={100} depth={50} count={1000} factor={2} fade speed={0.5} />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  );
}
