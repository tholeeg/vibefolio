/**
 * SectionDivider — terminal-style separator between sections.
 *
 *  Visual contract:
 *   - 64px tall, full bleed.
 *   - Hairline cyan rail with a comet (`shimmer`) sweeping left→right
 *     once per section entry (driven by IntersectionObserver).
 *   - Centered label in monospace: `// 02 — PROJECTS`.
 *   - Right side: a "data stream" canvas (mono glyphs scrolling).
 *
 *  Performance: the data stream is a tiny 200×16 canvas redrawn at
 *  ~30 FPS, paused when out of viewport.
 */

import { useEffect, useRef } from "react";
import { useMotion } from "../lib/useMotion";

interface Props {
  index: string;
  label: string;
  next?: string;
}

const STREAM_GLYPHS = "01░▒▓▌▐<>/\\|*+-=#";
const STREAM_COLS = 28;
const STREAM_FPS = 22;

export default function SectionDivider({ index, label, next }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLCanvasElement>(null);
  const cometRef = useRef<HTMLSpanElement>(null);
  const { prefersReducedMotion, isPageVisible } = useMotion();

  /* ── Comet sweep on viewport entry ───────────────────────────────── */

  useEffect(() => {
    const el = rootRef.current;
    const comet = cometRef.current;
    if (!el || !comet) return;
    if (prefersReducedMotion) {
      comet.style.opacity = "0.4";
      comet.style.transform = "translate3d(0%, 0, 0)";
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          comet.animate(
            [
              { transform: "translate3d(-30%, 0, 0)", opacity: 0 },
              { transform: "translate3d(15%, 0, 0)", opacity: 1, offset: 0.4 },
              { transform: "translate3d(120%, 0, 0)", opacity: 0 },
            ],
            { duration: 1400, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
          );
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "-10% 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [prefersReducedMotion]);

  /* ── Data stream canvas (right-aligned glyph rain) ───────────────── */

  useEffect(() => {
    const cvs = streamRef.current;
    if (!cvs) return;
    if (prefersReducedMotion || !isPageVisible) return;

    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = STREAM_COLS * 8;
    const H = 16;
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    cvs.style.width = W + "px";
    cvs.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cells = new Array(STREAM_COLS).fill(0).map(() => ({
      g: STREAM_GLYPHS[Math.floor(Math.random() * STREAM_GLYPHS.length)],
      a: Math.random() * 0.5 + 0.1,
    }));

    let last = performance.now();
    const interval = 1000 / STREAM_FPS;
    let raf = 0;
    let onscreen = false;
    const io = new IntersectionObserver(
      ([e]) => {
        onscreen = !!e?.isIntersecting;
      },
      { rootMargin: "100px" },
    );
    io.observe(cvs);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!onscreen) return;
      if (now - last < interval) return;
      last = now;

      ctx.clearRect(0, 0, W, H);
      ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textBaseline = "middle";

      for (let i = 0; i < STREAM_COLS; i++) {
        if (Math.random() < 0.18) {
          cells[i].g = STREAM_GLYPHS[Math.floor(Math.random() * STREAM_GLYPHS.length)];
          cells[i].a = Math.random() * 0.6 + 0.15;
        }
        const fadeRight = i / STREAM_COLS;
        ctx.fillStyle = `rgba(0, 251, 251, ${(cells[i].a * (0.3 + fadeRight * 0.7)).toFixed(3)})`;
        ctx.fillText(cells[i].g, i * 8, H / 2);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [prefersReducedMotion, isPageVisible]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="relative flex h-16 w-full items-center justify-between px-6 md:px-12"
    >
      {/* ── Left: index label + glyph ──────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="font-label text-[9px] uppercase tracking-[0.3em] text-white/35">
          // {index}
        </span>
        <span className="font-label text-[10px] uppercase tracking-[0.32em] text-cyan-glow">
          {label}
        </span>
      </div>

      {/* ── Centered hairline + comet ──────────────────────────────── */}
      <div className="absolute left-1/2 top-1/2 h-px w-[40%] max-w-[28rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 right-0 bg-white/10"
          style={{ opacity: 0.6 }}
        />
        <span
          ref={cometRef}
          aria-hidden
          className="absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0,251,251,0.9), transparent)",
            filter: "blur(0.4px)",
            opacity: 0,
            willChange: "transform, opacity",
          }}
        />
      </div>

      {/* ── Right: next section + data stream ──────────────────────── */}
      <div className="flex items-center gap-3">
        {next && (
          <span className="font-label hidden text-[9px] uppercase tracking-[0.3em] text-white/30 md:inline">
            NEXT → {next}
          </span>
        )}
        <canvas
          ref={streamRef}
          aria-hidden
          className="h-4"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}
