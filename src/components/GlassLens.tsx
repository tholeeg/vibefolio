/**
 * GlassLens — circular pointer-following lens that "refracts" the
 * content underneath via backdrop-filter.
 *
 * Visible only when the pointer is inside (or very close to) an
 * element flagged with `data-lens="true"`. Most of the time it is
 * collapsed to opacity 0, so it costs nothing.
 *
 * Hidden on coarse pointers and under prefers-reduced-motion (the
 * filter chain is non-trivial and not strictly informational).
 *
 * Inspired by Apple-style glass + a thin chromatic-aberration fringe
 * implemented as two stacked filter rings (cyan offset + magenta
 * offset) at low opacity.
 */

import { useEffect, useRef } from "react";
import { useMotion } from "../lib/useMotion";

const LERP = 0.18;
const SIZE = 140;

export default function GlassLens() {
  const { prefersReducedMotion, qualityTier } = useMotion();
  const lensRef = useRef<HTMLDivElement>(null);
  const fringeARef = useRef<HTMLDivElement>(null);
  const fringeBRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (qualityTier === "low") return;
    if (typeof window === "undefined") return;
    if (matchMedia("(pointer: coarse)").matches) return;

    const lens = lensRef.current;
    const a = fringeARef.current;
    const b = fringeBRef.current;
    if (!lens || !a || !b) return;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let lx = tx;
    let ly = ty;
    let active = false;
    let raf = 0;

    const setActive = (next: boolean) => {
      if (next === active) return;
      active = next;
      const op = next ? "1" : "0";
      lens.style.opacity = op;
      a.style.opacity = op;
      b.style.opacity = op;
    };

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const t = e.target as Element | null;
      setActive(!!t?.closest("[data-lens='true']"));
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      lx += (tx - lx) * LERP;
      ly += (ty - ly) * LERP;
      const transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0) translate(-50%, -50%)`;
      lens.style.transform = transform;
      /* Chromatic fringes: same lerped position, slight offsets so
         the magenta/cyan rings appear to "refract" different
         wavelengths around the lens. */
      a.style.transform = transform;
      b.style.transform = transform;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [prefersReducedMotion, qualityTier]);

  if (prefersReducedMotion || qualityTier === "low") return null;

  /* The whole stack is pointer-events: none; the lens does NOT block
     clicks on the underlying content. */
  const baseStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: "9999px",
    pointerEvents: "none",
    opacity: 0,
    transition: "opacity 220ms var(--ease-glide)",
    willChange: "transform, opacity",
    zIndex: "var(--z-overlay)" as unknown as number,
  };

  return (
    <>
      {/* Magenta fringe — slight upward/leftward bias. */}
      <div
        ref={fringeARef}
        aria-hidden
        data-fringe="magenta"
        style={{
          ...baseStyle,
          marginLeft: -3,
          marginTop: -3,
          background:
            "radial-gradient(circle, rgba(255, 45, 149, 0.08), transparent 65%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Cyan fringe — slight downward/rightward bias. */}
      <div
        ref={fringeBRef}
        aria-hidden
        data-fringe="cyan"
        style={{
          ...baseStyle,
          marginLeft: 3,
          marginTop: 3,
          background:
            "radial-gradient(circle, rgba(0, 251, 251, 0.10), transparent 65%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Main glass lens. */}
      <div
        ref={lensRef}
        aria-hidden
        style={{
          ...baseStyle,
          backdropFilter:
            "blur(6px) saturate(1.6) hue-rotate(8deg) contrast(1.05)",
          WebkitBackdropFilter:
            "blur(6px) saturate(1.6) hue-rotate(8deg) contrast(1.05)",
          border: "1px solid rgba(0, 251, 251, 0.35)",
          boxShadow:
            "inset 0 0 24px rgba(0, 251, 251, 0.10), 0 8px 40px rgba(0, 251, 251, 0.06)",
        }}
      />
    </>
  );
}
