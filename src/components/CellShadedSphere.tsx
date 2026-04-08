import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════════════════════════
   Shared constants
   ══════════════════════════════════════════════════════════════════════════ */

const ROT_DAMP = 0.05;
const EXPLODE_DAMP = 0.06;
const SCALE_DAMP = 0.035;
const SCALE_PRESSED = 1.8;
const GOLDEN = (1 + Math.sqrt(5)) / 2;

/* ── Object A — Solid ─────────────────────────────────────────────────── */

const A_COUNT = 2000;
const A_RADIUS = 2.8;
const A_CUBE_SZ = 0.14;
const A_COL_LO = new THREE.Color(0x0055ff);
const A_COL_HI = new THREE.Color(0x78909c);

/* ── Object B — Spiral ────────────────────────────────────────────────── */

const B_COUNT = 7000;
const B_PT_SIZE = 0.025;
const B_SPREAD_PRESSED = 1.3;
const B_SPREAD_DAMP = 0.04;

/* ── Object C — Kinetic Wireframe ─────────────────────────────────────── */

const C_LAYERS = 4;
const C_DETAIL = 2;
const C_SCALES = [1.0, 1.06, 1.12, 1.18];
const C_OPACITIES = [0.35, 0.25, 0.18, 0.12];
const C_SPEED_PRESSED = 5.0;
const C_SPEED_DAMP = 0.04;

interface KineticLayer {
  mesh: THREE.Mesh;
  rx: number;
  ry: number;
  rz: number;
}

const C_ROT_SPEEDS: [number, number, number][] = [
  [0.15, 0.20, 0.0],
  [0.0, 0.25, 0.12],
  [-0.12, -0.18, 0.22],
  [0.22, 0.0, -0.16],
];

/* ══════════════════════════════════════════════════════════════════════════
   Utility
   ══════════════════════════════════════════════════════════════════════════ */

function hash(i: number): number {
  const x = Math.sin(i * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface CubeData {
  pos: THREE.Vector3;
  rot: THREE.Euler;
  spread: number;
  jitter: THREE.Vector3;
  expRot: THREE.Euler;
}

/* ══════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════ */

interface Props {
  mode: "solid" | "spiral" | "kinetic";
}

export default function CellShadedSphere({ mode }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    /* ── Scene / Camera / Renderer ──────────────────────────── */

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      el.clientWidth / el.clientHeight,
      0.1,
      100,
    );
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    /* ── Lights (for Object A) ───────────────────────────────── */

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(5, 3, 7);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    rimLight.position.set(-4, -2, -5);
    scene.add(rimLight);

    /* ── Shared Group ─────────────────────────────────────────── */

    const group = new THREE.Group();
    group.position.x = 2;
    scene.add(group);

    /* ════════════════════════════════════════════════════════════
       OBJECT A — InstancedMesh Cubes (SOLID) — UNTOUCHED
       ════════════════════════════════════════════════════════════ */

    const geoA = new THREE.BoxGeometry(A_CUBE_SZ, A_CUBE_SZ, A_CUBE_SZ);
    const matA = new THREE.MeshToonMaterial({
      color: 0xffffff,
      transparent: false,
      depthWrite: true,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const meshA = new THREE.InstancedMesh(geoA, matA, A_COUNT);
    meshA.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    meshA.frustumCulled = false;

    const cubes: CubeData[] = [];
    const tmpCol = new THREE.Color();

    for (let i = 0; i < A_COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / A_COUNT);
      const theta = 2 * Math.PI * GOLDEN * i;
      cubes.push({
        pos: new THREE.Vector3(
          A_RADIUS * Math.cos(theta) * Math.sin(phi),
          A_RADIUS * Math.sin(theta) * Math.sin(phi),
          A_RADIUS * Math.cos(phi),
        ),
        rot: new THREE.Euler(
          hash(i * 29) * 0.4,
          hash(i * 31) * 0.4,
          hash(i * 37) * 0.4,
        ),
        spread: 1.8 + hash(i) * 1.7,
        jitter: new THREE.Vector3(
          (hash(i * 3) - 0.5) * 2,
          (hash(i * 7) - 0.5) * 2,
          (hash(i * 13) - 0.5) * 2,
        ),
        expRot: new THREE.Euler(
          (hash(i * 17) - 0.5) * Math.PI * 4,
          (hash(i * 19) - 0.5) * Math.PI * 4,
          (hash(i * 23) - 0.5) * Math.PI * 4,
        ),
      });
      tmpCol.lerpColors(A_COL_LO, A_COL_HI, hash(i * 41));
      meshA.setColorAt(i, tmpCol);
    }
    if (meshA.instanceColor) meshA.instanceColor.needsUpdate = true;
    group.add(meshA);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < A_COUNT; i++) {
      dummy.position.copy(cubes[i].pos);
      dummy.rotation.copy(cubes[i].rot);
      dummy.updateMatrix();
      meshA.setMatrixAt(i, dummy.matrix);
    }
    meshA.instanceMatrix.needsUpdate = true;

    const edgesGeo = new THREE.EdgesGeometry(geoA);
    const iEdgesGeo = new THREE.InstancedBufferGeometry();
    iEdgesGeo.setAttribute("position", edgesGeo.getAttribute("position")!);
    if (edgesGeo.index) iEdgesGeo.setIndex(edgesGeo.index);
    iEdgesGeo.instanceCount = A_COUNT;
    iEdgesGeo.setAttribute("instanceMatrix", meshA.instanceMatrix);

    const edgesMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute mat4 instanceMatrix;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); }
      `,
      depthTest: true,
      depthWrite: false,
    });

    const edgeLines = new THREE.LineSegments(iEdgesGeo, edgesMat);
    edgeLines.frustumCulled = false;
    group.add(edgeLines);

    /* ════════════════════════════════════════════════════════════
       OBJECT B — Fibonacci Surface Points (SPIRAL)
       ════════════════════════════════════════════════════════════ */

    const basePosB = new Float32Array(B_COUNT * 3);
    for (let i = 0; i < B_COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / B_COUNT);
      const theta = 2 * Math.PI * GOLDEN * i;
      basePosB[i * 3] = A_RADIUS * Math.cos(theta) * Math.sin(phi);
      basePosB[i * 3 + 1] = A_RADIUS * Math.sin(theta) * Math.sin(phi);
      basePosB[i * 3 + 2] = A_RADIUS * Math.cos(phi);
    }
    const geoB = new THREE.BufferGeometry();
    geoB.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(basePosB), 3),
    );
    (geoB.getAttribute("position") as THREE.BufferAttribute).setUsage(
      THREE.DynamicDrawUsage,
    );
    const matB = new THREE.PointsMaterial({
      color: 0xffffff,
      size: B_PT_SIZE,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    });
    const pointsB = new THREE.Points(geoB, matB);
    pointsB.visible = false;
    group.add(pointsB);

    /* ════════════════════════════════════════════════════════════
       OBJECT C — Kinetic Wireframe (KINETIC)
       4 nested IcosahedronGeometry wireframes rotating
       on different axes — quantum gyroscope effect
       ════════════════════════════════════════════════════════════ */

    const kineticGroup = new THREE.Group();
    kineticGroup.visible = false;
    group.add(kineticGroup);

    const geoC = new THREE.IcosahedronGeometry(A_RADIUS, C_DETAIL);
    const kLayers: KineticLayer[] = [];

    for (let i = 0; i < C_LAYERS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        wireframe: true,
        transparent: true,
        opacity: C_OPACITIES[i],
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geoC, mat);
      const sc = C_SCALES[i];
      mesh.scale.set(sc, sc, sc);
      mesh.rotation.set(
        hash(i * 71) * Math.PI * 2,
        hash(i * 83) * Math.PI * 2,
        hash(i * 97) * Math.PI * 2,
      );
      kineticGroup.add(mesh);
      kLayers.push({
        mesh,
        rx: C_ROT_SPEEDS[i][0],
        ry: C_ROT_SPEEDS[i][1],
        rz: C_ROT_SPEEDS[i][2],
      });
    }

    /* ── Interaction state (shared) ────────────────────────── */

    let tgtRX = 0;
    let tgtRY = 0;
    let curRX = 0;
    let curRY = 0;
    let hovering = false;
    let pressed = false;
    let explodeT = 0;
    let scaleT = 1.0;
    let spiralSpreadT = 1.0;
    let kineticSpeedT = 1.0;
    let raf = 0;

    /* ── Events ───────────────────────────────────────────── */

    const onMove = (e: MouseEvent) => {
      if (!hovering) return;
      const r = el.getBoundingClientRect();
      tgtRY = (((e.clientX - r.left) / r.width) * 2 - 1) * 0.8;
      tgtRX = (((e.clientY - r.top) / r.height) * 2 - 1) * 0.5;
    };
    const onEnter = () => {
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
      pressed = false;
      tgtRX = 0;
      tgtRY = 0;
    };
    const onDown = (e: MouseEvent) => {
      if (e.button === 0) pressed = true;
    };
    const onUp = () => {
      pressed = false;
    };
    const onTS = () => {
      pressed = true;
      hovering = true;
    };
    const onTM = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const r = el.getBoundingClientRect();
      tgtRY = (((t.clientX - r.left) / r.width) * 2 - 1) * 0.8;
      tgtRX = (((t.clientY - r.top) / r.height) * 2 - 1) * 0.5;
    };
    const onTE = () => {
      pressed = false;
      hovering = false;
      tgtRX = 0;
      tgtRY = 0;
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("touchstart", onTS, { passive: true });
    el.addEventListener("touchmove", onTM, { passive: true });
    el.addEventListener("touchend", onTE);
    el.addEventListener("touchcancel", onTE);

    /* ══════════════════════════════════════════════════════════
       Tick
       ══════════════════════════════════════════════════════════ */

    function tick() {
      raf = requestAnimationFrame(tick);
      const m = modeRef.current;

      /* ── Shared rotation ────────────────────────────────── */

      curRX += (tgtRX - curRX) * ROT_DAMP;
      curRY += (tgtRY - curRY) * ROT_DAMP;
      group.rotation.x = curRX;
      group.rotation.y = curRY;

      /* ── Shared scale (Group — all 3 states) ────────────── */

      const scaleGoal = pressed ? SCALE_PRESSED : 1.0;
      scaleT += (scaleGoal - scaleT) * SCALE_DAMP;
      group.scale.setScalar(scaleT);

      /* ── Visibility ─────────────────────────────────────── */

      meshA.visible = m === "solid";
      edgeLines.visible = m === "solid";
      pointsB.visible = m === "spiral";
      kineticGroup.visible = m === "kinetic";

      /* ── Object A: Explosion ────────────────────────────── */

      const explGoal = pressed && m === "solid" ? 1 : 0;
      explodeT += (explGoal - explodeT) * EXPLODE_DAMP;

      if (meshA.visible || explodeT > 0.001) {
        const t = explodeT;
        for (let i = 0; i < A_COUNT; i++) {
          const c = cubes[i];
          const s = 1 + t * (c.spread - 1);
          dummy.position.set(
            c.pos.x * s + t * c.jitter.x,
            c.pos.y * s + t * c.jitter.y,
            c.pos.z * s + t * c.jitter.z,
          );
          dummy.rotation.set(
            c.rot.x + t * c.expRot.x,
            c.rot.y + t * c.expRot.y,
            c.rot.z + t * c.expRot.z,
          );
          dummy.updateMatrix();
          meshA.setMatrixAt(i, dummy.matrix);
        }
        meshA.instanceMatrix.needsUpdate = true;
      }

      /* ── Object B: Spiral spread on click ───────────────── */

      const spreadGoal =
        pressed && m === "spiral" ? B_SPREAD_PRESSED : 1.0;
      spiralSpreadT += (spreadGoal - spiralSpreadT) * B_SPREAD_DAMP;

      if (pointsB.visible && Math.abs(spiralSpreadT - 1.0) > 0.001) {
        const posAttr = geoB.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        for (let i = 0; i < B_COUNT; i++) {
          const sp =
            spiralSpreadT +
            hash(i * 53) * (spiralSpreadT - 1.0) * 0.1;
          posAttr.setXYZ(
            i,
            basePosB[i * 3] * sp,
            basePosB[i * 3 + 1] * sp,
            basePosB[i * 3 + 2] * sp,
          );
        }
        posAttr.needsUpdate = true;
      } else if (
        pointsB.visible &&
        Math.abs(spiralSpreadT - 1.0) <= 0.001 &&
        spiralSpreadT !== 1.0
      ) {
        const posAttr = geoB.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        for (let i = 0; i < B_COUNT; i++) {
          posAttr.setXYZ(
            i,
            basePosB[i * 3],
            basePosB[i * 3 + 1],
            basePosB[i * 3 + 2],
          );
        }
        posAttr.needsUpdate = true;
        spiralSpreadT = 1.0;
      }

      /* ── Object C: Kinetic Wireframe rotation ──────────── */

      if (kineticGroup.visible) {
        const speedGoal = pressed ? C_SPEED_PRESSED : 1.0;
        kineticSpeedT += (speedGoal - kineticSpeedT) * C_SPEED_DAMP;

        const dt = 0.016 * kineticSpeedT;
        for (const layer of kLayers) {
          layer.mesh.rotation.x += layer.rx * dt;
          layer.mesh.rotation.y += layer.ry * dt;
          layer.mesh.rotation.z += layer.rz * dt;
        }
      }

      renderer.render(scene, camera);
    }
    tick();

    /* ── Resize ────────────────────────────────────────────── */

    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ── Cleanup ───────────────────────────────────────────── */

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove", onTM);
      el.removeEventListener("touchend", onTE);
      el.removeEventListener("touchcancel", onTE);
      window.removeEventListener("resize", onResize);
      geoA.dispose();
      matA.dispose();
      edgesGeo.dispose();
      iEdgesGeo.dispose();
      edgesMat.dispose();
      geoB.dispose();
      matB.dispose();
      geoC.dispose();
      for (const layer of kLayers) {
        (layer.mesh.material as THREE.Material).dispose();
      }
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
    />
  );
}
