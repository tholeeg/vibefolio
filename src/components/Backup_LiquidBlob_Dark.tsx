/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKUP — DitherCube / « liquid blob » sombre (#08415C, dither doux)
 * Instantané sauvegardé avant refonte : dither binaire prononcé #0055FF + animations lentes.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * JS — couleur :
 * const DEEP_BLUE = new THREE.Vector3(8 / 255, 65 / 255, 92 / 255);
 *
 * GÉOMÉTRIE :
 * new THREE.BoxGeometry(1.4, 1.4, 1.4, 28, 28, 28)
 *
 * UNIFORMS : u_progress, u_step, u_time, u_deepBlue
 *
 * Fragment (logique) : bayer4(gl_FragCoord.xy), shade lissant les normales,
 * d = shade + (b-0.5)*0.17, binaire d > 0.5 → bleu #08415C sinon noir.
 *
 * Vertex : 4 états (breathe, extrude+temps, twist, octa), mix smoothstep,
 * scroll sur normal * 0.018.
 *
 * useFrame : lerp progress/step, rotation += slow * (0.85+wobble).
 */

export {};
