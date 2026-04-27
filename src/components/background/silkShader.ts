/**
 * Silk shader — full-screen atmospheric background.
 *
 * Inspired by aurora and silk-fabric flow. Designed to sit BEHIND
 * every section: the output is mostly near-black with subtle cyan
 * and violet highlights that breathe with time, scroll progress,
 * and pointer position. Foreground text stays legible.
 *
 * Performance: single fullscreen plane in NDC space, no depth.
 * Pixel cost is dominated by 4 fbm calls (2 octaves each).
 */

export const SILK_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const SILK_FRAG = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform vec2  u_resolution;
  uniform float u_time;
  uniform float u_scroll;
  uniform vec2  u_mouse;
  uniform float u_intensity;
  uniform float u_quality;
  uniform float u_audio;   /* 0..1 — RMS volume from useAudio analyser */

  /* ── Noise helpers ──────────────────────────────────────────── */

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  /* Two octaves on quality<1, three on quality>=1. */
  float fbm(vec2 p, float qual) {
    float v = 0.0;
    float a = 0.5;
    v += a * noise(p);        a *= 0.5; p *= 2.02;
    v += a * noise(p);        a *= 0.5; p *= 2.03;
    if (qual >= 1.0) {
      v += a * noise(p);
    }
    return v;
  }

  /* ── Main ──────────────────────────────────────────────────── */

  void main() {
    vec2 uv = vUv;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = (uv * 2.0 - 1.0);
    p.x *= aspect;

    float t = u_time * 0.04;
    float scroll = u_scroll;

    /* Two flow fields, slightly rotated and shifted by scroll. */
    vec2 q1 = p * 1.10;
    q1.y -= scroll * 0.55;
    q1 += vec2(t, t * 0.62);

    vec2 q2 = p * 1.85;
    q2.y -= scroll * 0.30;
    q2 += vec2(-t * 0.72, t * 0.43);

    float n1 = fbm(q1, u_quality);
    float n2 = fbm(q2, u_quality);

    /* ── Palette (matches src/index.css brand spectrum) ─────── */
    vec3 base   = vec3(0.000, 0.000, 0.000);
    vec3 deep   = vec3(0.000, 0.057, 0.205);   /* cyan-deep   #003a9b */
    vec3 glow   = vec3(0.000, 0.831, 1.000);   /* cyan-glow   #00d4ff */
    vec3 violet = vec3(0.342, 0.106, 0.756);   /* violet-edge #571bc1 */
    vec3 hot    = vec3(1.000, 0.176, 0.584);   /* magenta-hot #ff2d95 */

    /* Build veils, each thresholded so most of the screen stays near-black. */
    float veil1 = smoothstep(0.45, 0.78, n1);
    float veil2 = smoothstep(0.55, 0.88, n2);
    float spark = smoothstep(0.78, 0.98, n1 * n2);

    vec3 col = base;
    col += deep   * veil1 * 0.55;
    col += glow   * veil2 * 0.18;
    col += violet * spark * 0.32;

    /* Rare hot highlights tied to scroll, peaking near each section transition. */
    float scrollPulse = 0.5 + 0.5 * sin(scroll * 6.2831);
    col += hot * spark * scrollPulse * 0.06;

    /* Audio reactivity — drone breathes through the entire field,
       pumps the spark amplitude, and adds a soft cyan wash on peaks. */
    float audio = clamp(u_audio, 0.0, 1.0);
    col += glow * spark * audio * 0.35;
    col += deep * audio * 0.25;

    /* Pointer aura — soft cyan halo around the cursor. */
    float md = length(p - u_mouse);
    col += glow * exp(-md * 3.5) * 0.10;

    /* Edge vignette to push foreground text into focus. */
    float r = length(p * vec2(0.85, 1.0));
    float vignette = smoothstep(1.55, 0.55, r);
    col *= vignette;

    /* Master intensity (kept low — this is BACKGROUND, never foreground).
       Audio adds a small extra punch on top so the boost is felt. */
    col *= u_intensity * (1.0 + audio * 0.25);

    gl_FragColor = vec4(col, 1.0);
  }
`;
