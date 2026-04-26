/**
 * useShaderCanvas — boots a vanilla Three.js fullscreen-plane shader
 * inside an HTMLCanvasElement, without R3F's per-canvas overhead.
 *
 * One WebGL context per Lab card is acceptable (we cap to ~5 cards),
 * but we keep the runtime minimal: no scene graph, no perspective
 * camera, no depth buffer.
 *
 * Honors `useMotion`: pauses when the tab is hidden, freezes time
 * (still renders one frame) when prefers-reduced-motion is set.
 */

import { useEffect, type RefObject } from "react";
import * as THREE from "three";
import { readMotion } from "../../lib/useMotion";

const SHARED_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export interface ShaderUniforms {
  u_time: { value: number };
  u_resolution: { value: THREE.Vector2 };
  u_mouse: { value: THREE.Vector2 };
}

export interface ShaderCanvasOptions {
  fragmentShader: string;
  /** Optional extra uniforms merged with the defaults. */
  uniforms?: Record<string, THREE.IUniform>;
  /** Called once per frame, after default updates, before render. */
  onFrame?: (u: ShaderUniforms, dt: number) => void;
  /** Pixel ratio cap. Defaults to 1.5. */
  dprMax?: number;
}

export function useShaderCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: ShaderCanvasOptions,
) {
  const { fragmentShader, uniforms: extraUniforms, onFrame, dprMax = 1.5 } = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
      depth: false,
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprMax));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const baseUniforms: ShaderUniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: SHARED_VERT,
      fragmentShader,
      uniforms: { ...baseUniforms, ...(extraUniforms ?? {}) } as unknown as Record<
        string,
        THREE.IUniform
      >,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    /* ── Sizing ───────────────────────────────────────────────── */

    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      renderer.setSize(w, h, false);
      baseUniforms.u_resolution.value.set(w, h);
    });
    ro.observe(canvas);

    /* ── Pointer (relative to the canvas, NDC) ────────────────── */

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      baseUniforms.u_mouse.value.set(x, y);
    };
    canvas.addEventListener("pointermove", onMove);

    /* ── Loop ─────────────────────────────────────────────────── */

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const motion = readMotion();
      if (!motion.isPageVisible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!motion.prefersReducedMotion) baseUniforms.u_time.value += dt;
      onFrame?.(baseUniforms, dt);
      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [canvasRef, fragmentShader, extraUniforms, onFrame, dprMax]);
}
