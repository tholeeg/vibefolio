/**
 * useMotion — global accessibility + capability hook.
 *
 *  Exposes:
 *   - `prefersReducedMotion`: tracks the OS-level setting in real time.
 *   - `qualityTier`: "low" | "medium" | "high" — derived once per session
 *     from GPU heuristics + a 1-frame benchmark. Cached in sessionStorage.
 *   - `isPageVisible`: pauses heavy animations when the tab is hidden.
 *
 *  Components must consult this BEFORE registering any GSAP timeline,
 *  ScrollTrigger, RAF loop, or expensive WebGL pipeline.
 */

import { useSyncExternalStore } from "react";

export type QualityTier = "low" | "medium" | "high";

export interface MotionState {
  prefersReducedMotion: boolean;
  qualityTier: QualityTier;
  isPageVisible: boolean;
}

/* ── Quality tier detection ─────────────────────────────────────────────── */

const SESSION_KEY = "vibefolio:quality-tier";

function detectQualityTier(): QualityTier {
  if (typeof window === "undefined") return "medium";

  const cached = sessionStorage.getItem(SESSION_KEY) as QualityTier | null;
  if (cached === "low" || cached === "medium" || cached === "high") return cached;

  let tier: QualityTier = "medium";

  // 1. Hard signals — no GPU info dance, just trust them when present.
  const cpuCores = navigator.hardwareConcurrency ?? 4;
  // @ts-expect-error — non-standard but widely supported.
  const deviceMemory: number | undefined = navigator.deviceMemory;
  const isCoarsePointer = matchMedia("(pointer: coarse)").matches;
  const isSaveData =
    // @ts-expect-error — Network Information API.
    navigator.connection?.saveData === true;

  if (isSaveData) tier = "low";
  else if (cpuCores <= 2 || (deviceMemory !== undefined && deviceMemory <= 2)) tier = "low";
  else if (isCoarsePointer && cpuCores <= 4) tier = "medium";
  else if (cpuCores >= 8 && (deviceMemory === undefined || deviceMemory >= 8)) tier = "high";

  // 2. GPU string heuristic (best-effort, may be blocked).
  try {
    const cvs = document.createElement("canvas");
    const gl = (cvs.getContext("webgl2") ?? cvs.getContext("webgl")) as
      | WebGLRenderingContext
      | null;
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "").toLowerCase();
        if (/(swiftshader|llvmpipe|software)/.test(renderer)) tier = "low";
        else if (/(intel|uhd|iris)/.test(renderer) && tier === "high") tier = "medium";
        else if (/(rtx|m1 max|m1 ultra|m2 max|m2 ultra|m3 max|m3 ultra|m4|radeon pro)/.test(renderer))
          tier = "high";
      }
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    }
  } catch {
    /* ignore — keep heuristic tier */
  }

  sessionStorage.setItem(SESSION_KEY, tier);
  return tier;
}

/* ── External store ─────────────────────────────────────────────────────── */

const subscribers = new Set<() => void>();
let snapshot: MotionState = {
  prefersReducedMotion:
    typeof matchMedia !== "undefined"
      ? matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  qualityTier: typeof window !== "undefined" ? detectQualityTier() : "medium",
  isPageVisible: typeof document !== "undefined" ? !document.hidden : true,
};

function emit() {
  for (const cb of subscribers) cb();
}

function update(partial: Partial<MotionState>) {
  snapshot = { ...snapshot, ...partial };
  emit();
}

if (typeof window !== "undefined") {
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const onMq = (e: MediaQueryListEvent) => update({ prefersReducedMotion: e.matches });
  mq.addEventListener?.("change", onMq);

  const onVis = () => update({ isPageVisible: !document.hidden });
  document.addEventListener("visibilitychange", onVis);
}

function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

const getServerSnapshot = (): MotionState => ({
  prefersReducedMotion: false,
  qualityTier: "medium",
  isPageVisible: true,
});

export function useMotion(): MotionState {
  return useSyncExternalStore(subscribe, () => snapshot, getServerSnapshot);
}

/** Read the current motion state outside React (e.g. inside a GSAP context callback). */
export function readMotion(): MotionState {
  return snapshot;
}

/** Force a tier (debugging / quality toggle in the nav). */
export function setQualityTier(tier: QualityTier) {
  if (typeof window !== "undefined") sessionStorage.setItem(SESSION_KEY, tier);
  update({ qualityTier: tier });
}
