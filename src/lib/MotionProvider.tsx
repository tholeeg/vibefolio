/**
 * MotionProvider — tiny passthrough that ensures the `useMotion`
 * external store is initialised on first render. Put it at the
 * top of the React tree so the snapshot is computed before any
 * downstream component reads it.
 *
 * It also exposes the resolved values as CSS custom properties on
 * <html>, which lets pure-CSS sections branch on quality without
 * touching React (e.g. hide bloom on `:root[data-quality="low"]`).
 */

import { useEffect, type ReactNode } from "react";
import { useMotion } from "./useMotion";

export function MotionProvider({ children }: { children: ReactNode }) {
  const { qualityTier, prefersReducedMotion } = useMotion();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.quality = qualityTier;
    root.dataset.reducedMotion = prefersReducedMotion ? "true" : "false";
  }, [qualityTier, prefersReducedMotion]);

  return <>{children}</>;
}
