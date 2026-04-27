/**
 * PostFXOverlay — minimal global "post-processing" layer.
 *
 *  Two CSS-only passes:
 *   1. Vignette  — radial gradient burning the corners.
 *   2. Scanlines — 1px stripes at low opacity, overlay blend.
 *
 *  No animated grain (it read as visual noise / "dirty halo" on the
 *  silk background). Disabled on quality = "low".
 *
 *  Sits at z = var(--z-overlay), pointer-events: none.
 */

import { useMotion } from "../lib/useMotion";

export default function PostFXOverlay() {
  const { qualityTier } = useMotion();
  const showScanlines = qualityTier !== "low";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: "var(--z-overlay)" as unknown as number,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {showScanlines && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0, 251, 251, 0.025) 0px, rgba(0, 251, 251, 0.025) 1px, transparent 1px, transparent 3px)",
            mixBlendMode: "overlay",
          }}
        />
      )}
    </div>
  );
}
