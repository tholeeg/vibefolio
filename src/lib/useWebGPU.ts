/**
 * useWebGPU — detect WebGPU availability once and cache the result.
 *
 *   navigator.gpu                → API present
 *   .requestAdapter()             → hardware adapter actually granted
 *
 * Some browsers (Safari TP, Firefox Nightly) ship the API but reject
 * adapter requests under default flags, so the real signal is the
 * adapter, not just the namespace.
 *
 * The check is async (one-shot) and the hook returns a string:
 *     "webgpu"  → adapter available
 *     "webgl2"  → fallback (also our default once detection settles)
 *     "checking" → first paint, before the async probe resolved
 */

import { useEffect, useState } from "react";

export type Runtime = "webgpu" | "webgl2" | "checking";

interface NavigatorGPUSlim {
  gpu?: { requestAdapter: () => Promise<unknown> };
}

let cached: Runtime | null = null;
const subscribers = new Set<(r: Runtime) => void>();

async function probe(): Promise<Runtime> {
  if (cached) return cached;
  if (typeof navigator === "undefined") return (cached = "webgl2");
  const gpu = (navigator as unknown as NavigatorGPUSlim).gpu;
  if (!gpu) return (cached = "webgl2");
  try {
    const adapter = await gpu.requestAdapter();
    cached = adapter ? "webgpu" : "webgl2";
  } catch {
    cached = "webgl2";
  }
  subscribers.forEach((s) => s(cached!));
  return cached;
}

/* Kick the probe as soon as the module loads — by the time React
   commits, we very often already have a result. */
if (typeof window !== "undefined") {
  void probe();
}

export function useWebGPU(): Runtime {
  const [r, setR] = useState<Runtime>(cached ?? "checking");
  useEffect(() => {
    if (cached) {
      setR(cached);
      return;
    }
    const onUpdate = (next: Runtime) => setR(next);
    subscribers.add(onUpdate);
    void probe();
    return () => {
      subscribers.delete(onUpdate);
    };
  }, []);
  return r;
}
