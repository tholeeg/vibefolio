/**
 * BackgroundShader — global silk/aurora fullscreen pass.
 *
 * Mounts a fixed R3F canvas at z=0 behind every section. Cheap
 * single-plane shader (see `silkShader.ts`). Updates uniforms
 * from window scroll progress and pointer NDC.
 *
 * Quality-aware:
 *   - low: returns a static CSS gradient (no GPU work).
 *   - medium: 2 fbm octaves, no grain, dpr 1.
 *   - high: 3 fbm octaves, grain, dpr capped at 1.5.
 *
 * Honors prefers-reduced-motion (freezes time).
 */

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMotion } from "../lib/useMotion";
import { SILK_FRAG, SILK_VERT } from "./background/silkShader";

const MOUSE_LERP = 0.06;
const SCROLL_LERP = 0.08;

interface UniformsRefs {
  time: { value: number };
  resolution: { value: THREE.Vector2 };
  scroll: { value: number };
  mouse: { value: THREE.Vector2 };
  intensity: { value: number };
  quality: { value: number };
}

function SilkPlane({
  intensity,
  quality,
  freezeTime,
}: {
  intensity: number;
  quality: number;
  freezeTime: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, gl } = useThree();
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const targetScroll = useRef(0);

  const uniforms = useMemo<UniformsRefs>(
    () => ({
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(size.width, size.height) },
      scroll: { value: 0 },
      mouse: { value: new THREE.Vector2(0, 0) },
      intensity: { value: intensity },
      quality: { value: quality },
    }),
    [], // create once; we mutate .value each frame
  );

  // Push static settings when they change.
  useEffect(() => {
    uniforms.intensity.value = intensity;
    uniforms.quality.value = quality;
  }, [intensity, quality, uniforms]);

  useEffect(() => {
    uniforms.resolution.value.set(size.width, size.height);
  }, [size, uniforms]);

  // Pointer + scroll listeners (window-level so we follow the user
  // even outside the canvas — the canvas itself is pointer-events:none).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      targetMouse.current.set(x, y);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      targetScroll.current = max > 0 ? window.scrollY / max : 0;
    };
    onScroll();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useFrame((_, dt) => {
    if (!freezeTime) uniforms.time.value += dt;
    uniforms.mouse.value.lerp(targetMouse.current, MOUSE_LERP);
    uniforms.scroll.value += (targetScroll.current - uniforms.scroll.value) * SCROLL_LERP;
  });

  // Avoid visible color banding on the gradient veils.
  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={SILK_VERT}
        fragmentShader={SILK_FRAG}
        uniforms={uniforms as unknown as { [k: string]: THREE.IUniform }}
        depthTest={false}
        depthWrite={false}
        transparent={false}
      />
    </mesh>
  );
}

export default function BackgroundShader() {
  const { qualityTier, prefersReducedMotion, isPageVisible } = useMotion();

  if (qualityTier === "low") {
    return (
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: "var(--z-bg-shader)" as unknown as number,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.08), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(87,27,193,0.10), transparent 55%), #000",
        }}
      />
    );
  }

  const intensity = qualityTier === "high" ? 1.0 : 0.85;
  const quality = qualityTier === "high" ? 1.0 : 0.0;
  const dpr: [number, number] = qualityTier === "high" ? [1, 1.5] : [1, 1];

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-bg-shader)" as unknown as number,
        pointerEvents: "none",
      }}
    >
      <Canvas
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "low-power",
          depth: false,
          stencil: false,
        }}
        dpr={dpr}
        frameloop={isPageVisible ? "always" : "never"}
        camera={{ position: [0, 0, 1] }}
      >
        <SilkPlane
          intensity={intensity}
          quality={quality}
          freezeTime={prefersReducedMotion}
        />
      </Canvas>
    </div>
  );
}
