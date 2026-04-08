/**
 * Vertex / fragment — 4 archétypes géométriques + palette Indeed (3 couleurs).
 * Archive abstract : abstractFormArchive.ts
 */

export const ILLUSTRATIVE_VERT = /* glsl */ `
  uniform float u_progress;
  uniform float u_step;
  uniform float u_time;
  uniform float u_gridResolution;
  uniform float u_gridScale;
  uniform vec3 u_mouse3D;
  uniform float u_vortexRadius;
  uniform float u_vortexStrength;
  uniform float u_shockTime;
  uniform vec3  u_shockOrigin;

  varying float v_palette;
  varying float v_shock;
  varying float v_dissolve;

  vec3 safeNorm(vec3 p) {
    float l = length(p);
    if (l < 1e-5) return vec3(0.0, 1.0, 0.0);
    return p / l;
  }

  float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  /* 1 — Google G en 3D : arc 330° + barre horizontale */
  vec3 form_gemini(vec3 p) {
    float t = p.y * 0.5 + 0.5;
    float thick = p.x * 0.11;
    float depth = p.z * 0.11;

    float R = 0.82;
    float arcEnd = 0.86;

    float arcT = clamp(t / arcEnd, 0.0, 1.0);
    float angle = arcT * 5.76;
    vec3 arcPos = vec3(cos(angle) * (R + thick), sin(angle) * (R + thick), depth);

    float barT = clamp((t - arcEnd) / (1.0 - arcEnd), 0.0, 1.0);
    vec3 barPos = vec3(mix(R, 0.0, barT), thick, depth);

    float isBar = step(arcEnd, t);
    vec3 pos = mix(arcPos, barPos, isBar);

    float pulse = 1.0 + sin(u_time * 0.5) * 0.03;
    return pos * pulse;
  }

  /* 2 — Grille stricte / matrice (cube quantifié) */
  vec3 form_matrix(vec3 p) {
    float g = u_gridScale;
    return floor(p * g) / g;
  }

  /* 3 — Octaèdre / diamant (monolithe) — projection |x|+|y|+|z| + variante cube→diamant */
  vec3 form_octa(vec3 p) {
    vec3 a = abs(p);
    float s = a.x + a.y + a.z;
    if (s < 1e-5) return vec3(0.0, 0.88, 0.0);
    vec3 oct = p / s * 0.88;
    vec3 diamond = sign(p) * (vec3(1.0) - a.yxz);
    float ld = length(diamond);
    vec3 d = ld > 1e-5 ? normalize(diamond) * 0.86 : oct;
    return mix(oct, d, 0.35);
  }

  /* 4 — Supernova / spirale (contact — effet wow) */
  vec3 form_supernova(vec3 p) {
    vec3 n = safeNorm(p);
    float theta = atan(n.x, n.z);
    float phi = acos(clamp(n.y, -1.0, 1.0));
    float r = length(p);

    float spiral = sin(theta * 3.0 + phi * 5.0 + u_time * 0.6) * 0.25;
    float burst = 0.6 + spiral + sin(u_time * 0.35 + r * 4.0) * 0.15;

    float ring = smoothstep(0.3, 0.35, abs(n.y)) * 0.3;
    burst += ring;

    return n * burst;
  }

  vec3 getGeometricForm(vec3 p, float t) {
    vec3 a = form_gemini(p);
    vec3 b = form_matrix(p);
    vec3 c = form_octa(p);
    vec3 d = form_supernova(p);
    vec3 o = mix(a, b, smoothstep(0.0, 1.0, t));
    o = mix(o, c, smoothstep(1.0, 2.0, t));
    o = mix(o, d, smoothstep(2.0, 3.0, t));
    float scroll = sin(u_progress * 6.28318530718) * 0.01;
    o += safeNorm(o) * scroll;
    return o;
  }

  void main() {
    vec3 p = position;
    float t = u_step;
    vec3 o = getGeometricForm(p, t);

    float dist = distance(o, u_mouse3D);
    float influence = 1.0 - smoothstep(0.0, u_vortexRadius, dist);
    float angle = influence * u_vortexStrength;
    float sv = sin(angle);
    float cv = cos(angle);
    vec2 diff = o.xy - u_mouse3D.xy;
    vec2 rotated = vec2(diff.x * cv - diff.y * sv, diff.x * sv + diff.y * cv);
    o.xy = u_mouse3D.xy + rotated;
    o.z += influence * 0.28;

    float shockAge = u_time - u_shockTime;
    float shockDist = distance(o, u_shockOrigin);
    float waveFront = shockAge * 2.8;
    float waveWidth = 0.35;
    float shockHit = 1.0 - smoothstep(0.0, waveWidth, abs(shockDist - waveFront));
    float shockDecay = exp(-shockAge * 3.0);
    float shockIntensity = shockHit * shockDecay * step(0.0, shockAge) * step(shockAge, 2.0);
    o += safeNorm(o - u_shockOrigin) * shockIntensity * 0.18;

    vec3 snapped = floor(o * u_gridResolution) / u_gridResolution;

    v_palette = hash31(snapped) + snapped.z * 0.35;
    v_shock = shockIntensity;
    v_dissolve = 0.0;

    vec4 mvPosition = modelViewMatrix * vec4(snapped, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = 2.0 + shockIntensity * 3.0;
  }
`;

export const ILLUSTRATIVE_FRAG = /* glsl */ `
  precision highp float;
  varying float v_palette;
  varying float v_shock;
  varying float v_dissolve;
  uniform float u_time;

  void main() {
    vec3 c0 = vec3(0.0, 0.227, 0.603);
    vec3 c1 = vec3(0.0, 0.824, 1.0);
    vec3 c2 = vec3(0.588, 0.961, 1.0);
    float idx = mod(floor(v_palette * 17.0 + u_time * 0.15), 3.0);
    vec3 col = idx < 0.5 ? c0 : (idx < 1.5 ? c1 : c2);
    vec3 flash = vec3(1.0);
    col = mix(col, flash, clamp(v_shock, 0.0, 1.0) * 0.85);
    float alpha = 1.0 - v_dissolve;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;
