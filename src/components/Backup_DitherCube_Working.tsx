/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKUP — DitherCube (état fonctionnel avant refonte Deep Blue + u_step)
 * Date de sauvegarde : snapshot du shader / géométrie / material utilisés dans
 * Methodology.tsx (cube BoxGeometry + dither Bayer cyan #00FFFF / noir).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * --- GÉOMÉTRIE ---
 * const geo = new THREE.BoxGeometry(1.4, 1.4, 1.4, 24, 24, 24);
 *
 * --- UNIFORMS ---
 * u_progress: { value: 0 }
 *
 * --- VERTEX SHADER (cubeVert) — copie intégrale ---
 * ```glsl
 * uniform float u_progress;
 * varying vec3 vNormal;
 *
 * void main() {
 *   vec3 transformed = position;
 *   float t = u_progress * 6.28318530718;
 *   float bulge =
 *     sin(t * 2.0) * 0.22 +
 *     sin(t * 2.6 + 1.2) * 0.12 +
 *     sin(t * 4.0) * 0.06;
 *   transformed += normal * bulge;
 *
 *   vec3 n = normalize(normalMatrix * normal);
 *   vNormal = n;
 *
 *   vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
 *   gl_Position = projectionMatrix * mvPosition;
 * }
 * ```
 *
 * --- FRAGMENT SHADER (cubeFrag) — copie intégrale (Bayer 4x4 + cyan / noir) ---
 * ```glsl
 * precision highp float;
 * varying vec3 vNormal;
 *
 * float bayer4(vec2 fc) {
 *   vec2 p = mod(fc, 4.0);
 *   float x = p.x;
 *   float y = p.y;
 *   if (x < 1.0) {
 *     if (y < 1.0) return 0.0 / 16.0;
 *     if (y < 2.0) return 8.0 / 16.0;
 *     if (y < 3.0) return 2.0 / 16.0;
 *     return 10.0 / 16.0;
 *   }
 *   if (x < 2.0) {
 *     if (y < 1.0) return 12.0 / 16.0;
 *     if (y < 2.0) return 4.0 / 16.0;
 *     if (y < 3.0) return 14.0 / 16.0;
 *     return 6.0 / 16.0;
 *   }
 *   if (x < 3.0) {
 *     if (y < 1.0) return 3.0 / 16.0;
 *     if (y < 2.0) return 11.0 / 16.0;
 *     if (y < 3.0) return 1.0 / 16.0;
 *     return 9.0 / 16.0;
 *   }
 *   if (y < 1.0) return 15.0 / 16.0;
 *   if (y < 2.0) return 7.0 / 16.0;
 *   if (y < 3.0) return 13.0 / 16.0;
 *   return 5.0 / 16.0;
 * }
 *
 * void main() {
 *   vec3 N = normalize(vNormal);
 *   float shade = 0.28 + 0.72 * (abs(N.z) * 0.55 + abs(N.y) * 0.25 + abs(N.x) * 0.2);
 *   float b = bayer4(gl_FragCoord.xy);
 *   float d = shade + (b - 0.5) * 0.28;
 *   vec3 cyan = vec3(0.0, 1.0, 1.0);
 *   vec3 black = vec3(0.0, 0.0, 0.0);
 *   vec3 col = d > 0.5 ? cyan : black;
 *   gl_FragColor = vec4(col, 1.0);
 * }
 * ```
 *
 * --- useFrame (rotation mesh) ---
 * const p = lerp(m.uniforms.u_progress.value, progressRef.current, 0.12);
 * m.uniforms.u_progress.value = p;
 * mesh.rotation.x = p * Math.PI * 2;
 * mesh.rotation.y = p * Math.PI * 1.35;
 *
 * --- MATERIAL ---
 * new THREE.ShaderMaterial({
 *   uniforms: { u_progress: { value: 0 } },
 *   vertexShader: cubeVert,
 *   fragmentShader: cubeFrag,
 *   side: THREE.DoubleSide,
 * });
 */

export {};
