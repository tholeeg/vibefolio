/**
 * Cursor — global custom pointer.
 *
 * Two layers:
 *   - inner dot (follows exactly, mix-blend-mode: difference)
 *   - outer ring (follows with eased lerp, scales on interactive
 *     elements, exposes a `data-cursor` API for per-element variants)
 *
 * Hidden on coarse pointers (touch) and when prefers-reduced-motion
 * is set (we keep the native arrow in that case — fewer surprises).
 *
 * To customise behavior on a specific element, set:
 *   data-cursor="link"   → ring grows, dot stays
 *   data-cursor="grab"   → ring becomes a dashed circle
 *   data-cursor="hide"   → both layers fade out
 *
 * Otherwise we sniff `closest("a, button, [role='button'], [data-cursor]")`
 * to detect interactive zones automatically.
 */

import { useEffect, useRef } from "react";
import { useMotion } from "../lib/useMotion";

type CursorVariant = "default" | "link" | "grab" | "hide";

const RING_LERP = 0.16;
const DOT_LERP = 0.55;

export default function Cursor() {
  const { prefersReducedMotion } = useMotion();
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (typeof window === "undefined") return;
    if (matchMedia("(pointer: coarse)").matches) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    /* ── State ─────────────────────────────────────────────── */

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let dotX = targetX;
    let dotY = targetY;
    let visible = false;
    let variant: CursorVariant = "default";
    let raf = 0;
    let running = false;

    const setVariant = (next: CursorVariant) => {
      if (next === variant) return;
      variant = next;
      ring.dataset.variant = next;
      dot.dataset.variant = next;
    };

    /* ── Animation loop ────────────────────────────────────── */

    const tick = () => {
      ringX += (targetX - ringX) * RING_LERP;
      ringY += (targetY - ringY) * RING_LERP;
      dotX += (targetX - dotX) * DOT_LERP;
      dotY += (targetY - dotY) * DOT_LERP;

      ring.style.transform = `translate3d(${ringX.toFixed(1)}px, ${ringY.toFixed(1)}px, 0) translate(-50%, -50%)`;
      dot.style.transform = `translate3d(${dotX.toFixed(1)}px, ${dotY.toFixed(1)}px, 0) translate(-50%, -50%)`;

      /* Auto-suspend the rAF once the lerp has fully settled.
         A new pointermove will resume immediately. */
      const settled =
        Math.abs(targetX - ringX) < 0.1 &&
        Math.abs(targetY - ringY) < 0.1 &&
        Math.abs(targetX - dotX) < 0.1 &&
        Math.abs(targetY - dotY) < 0.1;
      if (settled) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    /* ── Listeners ─────────────────────────────────────────── */

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        visible = true;
        ring.style.opacity = "1";
        dot.style.opacity = "1";
        ringX = dotX = targetX;
        ringY = dotY = targetY;
      }

      const target = e.target as Element | null;
      const explicit = target?.closest<HTMLElement>("[data-cursor]");
      if (explicit?.dataset.cursor) {
        setVariant(explicit.dataset.cursor as CursorVariant);
      } else if (target?.closest("a, button, [role='button'], summary, label")) {
        setVariant("link");
      } else {
        setVariant("default");
      }
      wake();
    };

    const onLeave = () => {
      visible = false;
      ring.style.opacity = "0";
      dot.style.opacity = "0";
    };

    /* ── Init ──────────────────────────────────────────────── */

    document.documentElement.style.cursor = "none";
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("mouseleave", onLeave);
    wake();

    return () => {
      cancelAnimationFrame(raf);
      running = false;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("mouseleave", onLeave);
      document.documentElement.style.cursor = "";
    };
  }, [prefersReducedMotion]);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        data-variant="default"
        className="pointer-events-none fixed left-0 top-0 opacity-0 transition-[width,height,border-color,opacity] duration-200 ease-[var(--ease-glide)] data-[variant=link]:h-12 data-[variant=link]:w-12 data-[variant=link]:border-cyan-glow data-[variant=grab]:h-14 data-[variant=grab]:w-14 data-[variant=grab]:border-dashed data-[variant=hide]:opacity-0"
        style={{
          width: 30,
          height: 30,
          borderRadius: "9999px",
          border: "1px solid rgba(0, 251, 251, 0.45)",
          mixBlendMode: "difference",
          zIndex: "var(--z-cursor)" as unknown as number,
          willChange: "transform",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        data-variant="default"
        className="pointer-events-none fixed left-0 top-0 opacity-0 transition-opacity duration-200"
        style={{
          width: 5,
          height: 5,
          borderRadius: "9999px",
          background: "#00FBFB",
          mixBlendMode: "difference",
          zIndex: "var(--z-cursor)" as unknown as number,
          willChange: "transform",
        }}
      />
    </>
  );
}
