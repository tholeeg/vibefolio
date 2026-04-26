/**
 * PostFXOverlay — global "post-processing" layer applied on top
 * of all DOM and canvases.
 *
 * Three composited passes, all CSS-based (no extra GL context):
 *   1. Vignette       — radial gradient burning the corners.
 *   2. Scanlines      — 1px stripes at low opacity, overlay blend.
 *   3. Film grain     — pre-rendered noise tile, scrolled at slow
 *                       fps via CSS animation (gated by the
 *                       useMotion store).
 *
 * Sits at z = var(--z-overlay), pointer-events: none. Scaled down
 * automatically on quality = "low" (vignette only) and disabled
 * under prefers-reduced-motion (we keep the vignette & lines as
 * static decorations but stop the grain animation).
 */

import { useMemo } from "react";
import { useMotion } from "../lib/useMotion";

/** Generate a tiny noise data-URL once per session. */
function makeNoiseDataURL(): string {
  if (typeof document === "undefined") return "";
  const SIZE = 128;
  const cvs = document.createElement("canvas");
  cvs.width = SIZE;
  cvs.height = SIZE;
  const ctx = cvs.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cvs.toDataURL("image/png");
}

export default function PostFXOverlay() {
  const { qualityTier, prefersReducedMotion } = useMotion();
  const noiseURL = useMemo(makeNoiseDataURL, []);

  /* On low quality we drop everything but the vignette. */
  const showScanlines = qualityTier !== "low";
  const showGrain = qualityTier === "high";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: "var(--z-overlay)" as unknown as number,
      }}
    >
      {/* Vignette ─ radial dark mask. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Scanlines ─ horizontal 1px stripes at low alpha. */}
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

      {/* Film grain ─ animated noise tile. */}
      {showGrain && noiseURL && (
        <div
          style={{
            position: "absolute",
            inset: "-50%",
            width: "200%",
            height: "200%",
            backgroundImage: `url(${noiseURL})`,
            backgroundRepeat: "repeat",
            opacity: 0.045,
            mixBlendMode: "overlay",
            animation: prefersReducedMotion ? "none" : "vfx-grain 0.75s steps(8) infinite",
          }}
        />
      )}

      <style>{`
        @keyframes vfx-grain {
          0%   { transform: translate3d(0, 0, 0); }
          25%  { transform: translate3d(-3%, 2%, 0); }
          50%  { transform: translate3d(2%, -3%, 0); }
          75%  { transform: translate3d(-2%, 3%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </div>
  );
}
