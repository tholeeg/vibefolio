/**
 * Aurora — flowing horizontal light bands.
 * GLSL: domain-warped FBM driving a multi-stop gradient.
 */

import { useRef } from "react";
import { useShaderCanvas } from "./useShaderCanvas";

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv * 2.0 - 1.0);
    p.x *= u_resolution.x / max(u_resolution.y, 1.0);

    float t = u_time * 0.18;
    /* Domain warp for organic flow. */
    vec2 q = p + 0.5 * vec2(fbm(p + t), fbm(p - t * 0.7));
    float band = fbm(vec2(q.x * 1.4 + t, q.y * 2.6 - t * 0.4));

    /* Vertical falloff so light "settles" in the middle. */
    float falloff = exp(-pow(p.y * 1.6, 2.0));
    float intensity = pow(band, 2.2) * falloff;

    vec3 deep   = vec3(0.000, 0.057, 0.205);
    vec3 cyan   = vec3(0.000, 0.831, 1.000);
    vec3 violet = vec3(0.342, 0.106, 0.756);
    vec3 magenta = vec3(1.000, 0.176, 0.584);

    vec3 col = deep * 0.4;
    col = mix(col, cyan, smoothstep(0.15, 0.55, intensity));
    col = mix(col, violet, smoothstep(0.45, 0.85, intensity));
    col += magenta * smoothstep(0.85, 0.98, intensity) * 0.6;

    /* Pointer reveals an extra warm streak. */
    float md = length(p - u_mouse * vec2(1.5, 1.0));
    col += magenta * exp(-md * 4.0) * 0.18;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function AuroraCard() {
  const ref = useRef<HTMLCanvasElement>(null);
  useShaderCanvas(ref, { fragmentShader: FRAG });
  return <canvas ref={ref} className="block h-full w-full" />;
}
