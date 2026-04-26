/**
 * Voronoi — animated cellular pattern.
 * Each cell pulses on a different phase; the closest cell
 * gets a bright outline that follows the pointer.
 */

import { useRef } from "react";
import { useShaderCanvas } from "./useShaderCanvas";

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  /* Returns vec3(distA, distB, cellId) */
  vec3 voronoi(vec2 p) {
    vec2 g = floor(p);
    vec2 f = fract(p);
    float dA = 8.0, dB = 8.0;
    float idA = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 o = vec2(float(i), float(j));
        vec2 r = hash2(g + o);
        r = 0.5 + 0.5 * sin(u_time * 0.6 + 6.2831 * r);
        vec2 diff = o + r - f;
        float d = dot(diff, diff);
        if (d < dA) { dB = dA; dA = d; idA = dot(g + o, vec2(7.0, 113.0)); }
        else if (d < dB) { dB = d; }
      }
    }
    return vec3(sqrt(dA), sqrt(dB), idA);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv * 2.0 - 1.0);
    p.x *= u_resolution.x / max(u_resolution.y, 1.0);
    p *= 5.5;

    vec3 v = voronoi(p);
    float edge = smoothstep(0.0, 0.05, v.y - v.x);

    float h = fract(v.z * 0.013 + u_time * 0.04);
    vec3 col = mix(vec3(0.0, 0.057, 0.205), vec3(0.0, 0.831, 1.0), h);
    col = mix(col, vec3(0.342, 0.106, 0.756), step(0.66, h));

    /* Cell fill: dark, edges: bright. */
    col *= mix(0.18, 1.0, 1.0 - edge);

    /* Pointer halo on the hovered cell. */
    vec2 mp = u_mouse * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0) * 5.5;
    float d = length(p - mp);
    col += vec3(0.0, 0.831, 1.0) * smoothstep(0.9, 0.0, d) * 0.4;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function VoronoiCard() {
  const ref = useRef<HTMLCanvasElement>(null);
  useShaderCanvas(ref, { fragmentShader: FRAG });
  return <canvas ref={ref} className="block h-full w-full" />;
}
