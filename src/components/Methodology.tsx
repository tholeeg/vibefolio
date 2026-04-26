/**
 * Voxel pixel 3D — sauvegardes : `Backup_DitherCube_Working.tsx`, `Backup_LiquidBlob_Dark.tsx`
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type CSSProperties,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { lenisStore } from "../lenisStore";
import {
  ILLUSTRATIVE_FRAG,
  ILLUSTRATIVE_VERT,
} from "./methodology/voxelIllustrativeShader";

gsap.registerPlugin(ScrollTrigger);

/* ══════════════════════════════════════════════════════════════════════════
   Steps data (contenu exact demandé)
   ══════════════════════════════════════════════════════════════════════════ */

const STEPS = [
  {
    label: "01 | Gemini",
    sub: "Prompt Engineering",
    desc: "Discussing the project and outlining the vision to define the creative intent.",
  },
  {
    label: "02 | Cursor + Claude",
    sub: "AI-Assisted Coding",
    desc: "Injecting prompts into Cursor to build the architecture and generate the code.",
  },
  {
    label: "03 | Vercel + Firebase",
    sub: "Deployment",
    desc: "Provisioning databases and hosting the production-ready application live.",
  },
  {
    label: "04 | Contact",
    sub: "Get in Touch",
    desc: "Interested in working together? Let's connect.",
    href: "mailto:tleguern@indeed.com",
  },
] as const;

/* ══════════════════════════════════════════════════════════════════════════
   Nuage de points (THREE.Points) — BoxGeometry subdivisée, pas de mesh continu
   ══════════════════════════════════════════════════════════════════════════ */

/** 500k points aléatoires dans un cube 2×2×2 — bien plus dense que BoxGeometry (surface only). */
function buildPointCloudFromBox(): THREE.BufferGeometry {
  const COUNT = 1_000_000;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    pos[i3] = Math.random() * 2 - 1;
    pos[i3 + 1] = Math.random() * 2 - 1;
    pos[i3 + 2] = Math.random() * 2 - 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return geo;
}

const RAY_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const RAY_HIT = new THREE.Vector3();

function VoxelPixelCloud({
  progressRef,
  stepTargetRef,
  pointerInCanvasRef,
  shockRef,
}: {
  progressRef: MutableRefObject<number>;
  stepTargetRef: MutableRefObject<number>;
  pointerInCanvasRef: MutableRefObject<boolean>;
  shockRef: MutableRefObject<boolean>;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const mouseTargetLocal = useRef(new THREE.Vector3(0, 0, 500));
  const ndc = useRef(new THREE.Vector2());
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const { clock } = useThree();

  const { geometry, material } = useMemo(() => {
    const geo = buildPointCloudFromBox();
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        u_progress: { value: 0 },
        u_step: { value: 0 },
        u_time: { value: 0 },
        u_gridResolution: { value: 24 },
        u_gridScale: { value: 14 },
        u_mouse3D: { value: new THREE.Vector3(0, 0, 500) },
        u_vortexRadius: { value: 0.58 },
        u_vortexStrength: { value: 0.52 },
        u_shockTime: { value: -10 },
        u_shockOrigin: { value: new THREE.Vector3(0, 0, 500) },
      },
      vertexShader: ILLUSTRATIVE_VERT,
      fragmentShader: ILLUSTRATIVE_FRAG,
      transparent: true,
      depthWrite: true,
    });
    return { geometry: geo, material: mat };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state) => {
    const pts = pointsRef.current;
    const m = pts?.material as THREE.ShaderMaterial | undefined;
    if (!pts || !m) return;

    const cam = state.camera;
    ndc.current.copy(state.pointer);
    raycaster.setFromCamera(ndc.current, cam);
    const hit = raycaster.ray.intersectPlane(RAY_PLANE, RAY_HIT);
    if (hit && pointerInCanvasRef.current) {
      mouseTargetLocal.current.copy(RAY_HIT);
      pts.worldToLocal(mouseTargetLocal.current);
    } else {
      mouseTargetLocal.current.set(0, 0, 500);
    }

    const uMouse = m.uniforms.u_mouse3D.value as THREE.Vector3;
    uMouse.lerp(mouseTargetLocal.current, 0.045);

    m.uniforms.u_progress.value = THREE.MathUtils.lerp(
      m.uniforms.u_progress.value,
      progressRef.current,
      0.07,
    );

    m.uniforms.u_step.value = THREE.MathUtils.lerp(
      m.uniforms.u_step.value,
      stepTargetRef.current,
      0.05,
    );
    m.uniforms.u_time.value = clock.elapsedTime;

    if (shockRef.current) {
      shockRef.current = false;
      m.uniforms.u_shockTime.value = clock.elapsedTime;
      (m.uniforms.u_shockOrigin.value as THREE.Vector3).copy(
        m.uniforms.u_mouse3D.value as THREE.Vector3,
      );
    }

    const st = m.uniforms.u_step.value;
    const slow = 0.0011 + (st / 3) * 0.0042;
    const wobble = 0.028 * Math.sin(clock.elapsedTime * 0.22);
    pts.rotation.x += slow * (0.85 + wobble);
    pts.rotation.y += slow * (1.12 + st * 0.06);
  });

  return (
    <points
      ref={pointsRef}
      position={[2, 0, 0]}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      scale={1.8}
    />
  );
}

function Scene({
  progressRef,
  stepTargetRef,
  pointerInCanvasRef,
  shockRef,
}: {
  progressRef: MutableRefObject<number>;
  stepTargetRef: MutableRefObject<number>;
  pointerInCanvasRef: MutableRefObject<boolean>;
  shockRef: MutableRefObject<boolean>;
}) {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0} />
      <VoxelPixelCloud
        progressRef={progressRef}
        stepTargetRef={stepTargetRef}
        pointerInCanvasRef={pointerInCanvasRef}
        shockRef={shockRef}
      />
    </>
  );
}

export default function Methodology() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const stepTargetRef = useRef(0);
  const pointerCanvasRef = useRef(false);
  const shockRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);

  const scrollToStep = useCallback((index: number) => {
    const wrap = wrapperRef.current;
    const lenis = lenisStore.instance;
    if (!wrap || !lenis) return;
    const scrollDist = wrap.scrollHeight - window.innerHeight;
    const frac = Math.min(0.97, (index + 0.15) / 3.2);
    const y = wrap.offsetTop + frac * scrollDist;
    lenis.scrollTo(y, {
      duration: 1.4,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });
  }, []);

  useEffect(() => {
    const trigger = wrapperRef.current;
    if (!trigger) return;

    const refreshAll = () => {
      ScrollTrigger.refresh();
      lenisStore.instance?.resize();
    };

    const st = ScrollTrigger.create({
      trigger,
      start: "top top",
      end: "bottom bottom",
      markers: false,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        const step = Math.min(3, Math.floor(self.progress * 3.2));
        stepTargetRef.current = step;
        setCurrentStep((prev) => (prev !== step ? step : prev));
      },
    });

    requestAnimationFrame(() => {
      refreshAll();
      requestAnimationFrame(refreshAll);
    });
    const t500 = window.setTimeout(refreshAll, 500);
    if (document.fonts?.ready) {
      void document.fonts.ready.then(refreshAll);
    }
    window.addEventListener("resize", refreshAll);

    return () => {
      window.removeEventListener("resize", refreshAll);
      window.clearTimeout(t500);
      st.kill();
    };
  }, []);

  const boxReset: CSSProperties = {
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
  };

  return (
    <div
      ref={wrapperRef}
      id="methodology"
      style={{ ...boxReset, position: "relative", height: "300vh", width: "100%", overflowX: "clip" }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
        }}
        className="bg-black"
      >
        <div
          style={{
            position: "relative",
            zIndex: 10,
            height: "100%",
            pointerEvents: "none",
          }}
          className="flex min-h-0 w-full max-w-full flex-col justify-center px-6 py-12 select-none md:w-1/2 md:max-w-[min(50%,42rem)] md:px-12 md:py-16"
        >
          <span className="font-label text-[10px] uppercase tracking-[0.3em] text-white/25 mb-6">
            METHODOLOGY
          </span>

          <div className="relative min-h-[300px] md:min-h-[340px]">
            {STEPS.map((s, i) => (
              <div
                key={s.label}
                className="absolute inset-0 transition-opacity duration-200 ease-out"
                style={{
                  opacity: currentStep === i ? 1 : 0,
                }}
                aria-hidden={currentStep !== i}
              >
                <span className="font-headline font-extrabold text-[clamp(1.15rem,2.8vw,1.85rem)] tracking-tight text-white/90 block leading-tight">
                  {s.label}
                </span>
                <p className="font-label text-[10px] text-[#003A9B] uppercase tracking-[0.28em] mt-3">
                  {s.sub}
                </p>
                <p className="font-body mb-0 text-sm md:text-base text-on-surface-variant max-w-md mt-4 leading-relaxed">
                  {s.desc}
                </p>
                {"href" in s && s.href && (
                  <a
                    href={s.href}
                    className="inline-block mt-6 font-label text-[11px] uppercase tracking-[0.25em] text-[#00D4FF] border border-[#00D4FF]/30 px-5 py-2.5 rounded-full transition-all duration-300 hover:bg-[#00D4FF]/10 hover:border-[#00D4FF]/60 hover:shadow-[0_0_20px_rgba(0,212,255,0.15)]"
                    style={{ pointerEvents: "auto" }}
                  >
                    Send a message →
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="pointer-events-auto mt-10 flex flex-col gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left transition-opacity duration-200 hover:opacity-90 focus-visible:opacity-100 focus-visible:outline-none"
                style={{ opacity: currentStep === i ? 1 : 0.35 }}
                onClick={() => scrollToStep(i)}
              >
                <div
                  className="h-px shrink-0 transition-all duration-200"
                  style={{
                    width: currentStep === i ? 28 : 12,
                    backgroundColor:
                      currentStep === i ? "#003A9B" : "rgba(255,255,255,0.12)",
                  }}
                />
                <span className="font-label text-[9px] uppercase tracking-widest text-white/35 truncate max-w-[90%]">
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
          }}
          className="box-border"
        >
          <Suspense fallback={null}>
            <Canvas
              className="absolute inset-0 block h-full w-full cursor-crosshair leading-none"
              style={{ display: "block" }}
              gl={{
                antialias: false,
                alpha: false,
                powerPreference: "high-performance",
                stencil: false,
              }}
              dpr={[1, 2]}
              camera={{ position: [0, 0, 6.5], fov: 42, near: 0.1, far: 100 }}
              onPointerEnter={() => {
                pointerCanvasRef.current = true;
              }}
              onPointerLeave={() => {
                pointerCanvasRef.current = false;
              }}
              onPointerDown={() => {
                shockRef.current = true;
              }}
            >
              <Scene
                progressRef={progressRef}
                stepTargetRef={stepTargetRef}
                pointerInCanvasRef={pointerCanvasRef}
                shockRef={shockRef}
              />
            </Canvas>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
