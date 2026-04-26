/**
 * Metaballs — N orbiting energy spheres summed in a scalar field
 * and threshold-shaded. The pointer becomes the largest metaball.
 */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useShaderCanvas } from "./useShaderCanvas";

const N = 5;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform vec3 u_balls[5]; /* xy = pos, z = radius */

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv * 2.0 - 1.0);
    p.x *= u_resolution.x / max(u_resolution.y, 1.0);

    float field = 0.0;
    for (int i = 0; i < 5; i++) {
      vec2 c = u_balls[i].xy;
      float r = u_balls[i].z;
      float d = length(p - c);
      field += r * r / (d * d + 0.001);
    }

    /* Pointer ball — bigger, "warm". */
    float dM = length(p - u_mouse * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0));
    float pointerField = 0.16 / (dM * dM + 0.001);

    float total = field + pointerField;

    /* Threshold isoline → outline + filled body. */
    float body = smoothstep(2.6, 2.9, total);
    float edge = smoothstep(2.85, 3.05, total) - smoothstep(3.05, 3.20, total);

    vec3 deep = vec3(0.000, 0.057, 0.205);
    vec3 cyan = vec3(0.000, 0.831, 1.000);
    vec3 hot  = vec3(1.000, 0.176, 0.584);

    vec3 col = mix(vec3(0.0), deep, body * 0.5);
    col = mix(col, cyan, body);
    col += hot * smoothstep(2.0, 3.0, pointerField) * 0.6;
    col += cyan * edge * 1.4;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function MetaballsCard() {
  const ref = useRef<HTMLCanvasElement>(null);

  /* Pre-allocate the orbit parameters once. */
  const orbits = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => ({
        ax: 0.4 + Math.random() * 0.5,
        ay: 0.3 + Math.random() * 0.4,
        sx: 0.6 + Math.random() * 0.4,
        sy: 0.7 + Math.random() * 0.5,
        ph: Math.random() * Math.PI * 2,
        r: 0.18 + Math.random() * 0.12,
      })),
    [],
  );

  const ballsUniform = useMemo(
    () => ({
      u_balls: { value: Array.from({ length: N }, () => new THREE.Vector3()) },
    }),
    [],
  );

  useShaderCanvas(ref, {
    fragmentShader: FRAG,
    uniforms: ballsUniform,
    onFrame: (u) => {
      const t = u.u_time.value;
      const arr = ballsUniform.u_balls.value;
      for (let i = 0; i < N; i++) {
        const o = orbits[i];
        arr[i].x = Math.sin(t * o.sx + o.ph) * o.ax;
        arr[i].y = Math.cos(t * o.sy + o.ph * 1.3) * o.ay;
        arr[i].z = o.r;
      }
    },
  });

  return <canvas ref={ref} className="block h-full w-full bg-black" />;
}
