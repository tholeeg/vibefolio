/**
 * ARCHIVE — Formes abstraites d’origine (4 états + scroll).
 * Équivalent : getAbstractFormPosition(p, t, u_progress, u_time)
 * Ne pas supprimer : rollback / comparaison.
 */
export const ABSTRACT_FORM_GLSL_ARCHIVE = /* glsl */ `
  vec3 safeNorm(vec3 p) {
    float l = length(p);
    if (l < 1e-5) return vec3(0.0, 1.0, 0.0);
    return p / l;
  }
  vec3 state0_raw(vec3 p) {
    float breathe = sin(u_time * 0.2) * 0.018;
    return p + safeNorm(p) * breathe;
  }
  vec3 state1_fracture(vec3 p) {
    vec3 n = safeNorm(p);
    float shell = 0.8 * abs(sin(p.y * 5.0 + u_time));
    float ribs = 0.35 * abs(sin(p.x * 6.0 + u_time * 0.65) * cos(p.z * 5.5));
    return p + n * (shell + ribs);
  }
  vec3 twistY(vec3 p, float k) {
    float c = cos(p.y * k);
    float s = sin(p.y * k);
    return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
  }
  vec3 state2_twist(vec3 p) {
    return twistY(p, 5.0 + sin(u_time * 0.18) * 0.22);
  }
  vec3 state3_octa(vec3 p) {
    return safeNorm(p) * 0.86;
  }
  vec3 getAbstractFormPosition(vec3 p, float t, float u_progress, float u_time) {
    vec3 s0 = state0_raw(p);
    vec3 s1 = state1_fracture(p);
    vec3 s2 = state2_twist(p);
    vec3 s3 = state3_octa(p);
    vec3 o = mix(s0, s1, smoothstep(0.0, 1.0, t));
    o = mix(o, s2, smoothstep(1.0, 2.0, t));
    o = mix(o, s3, smoothstep(2.0, 3.0, t));
    float scroll = sin(u_progress * 6.28318530718) * 0.012;
    o += safeNorm(o) * scroll;
    return o;
  }
`;
