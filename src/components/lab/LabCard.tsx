/**
 * LabCard — shared shell for every Lab experiment.
 *
 * Renders the title, kind tag, live canvas slot, and a footer
 * bar showing FPS / runtime measured by a small probe.
 *
 * The actual visual is the `children` (a canvas-rendering
 * component); the card just frames and instruments it.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LazyMount } from "../../lib/lazyR3F";

export interface LabCardProps {
  index: string;
  title: string;
  kind: "shader" | "canvas2d";
  blurb: string;
  children: ReactNode;
}

function FpsProbe() {
  const [fps, setFps] = useState<number>(0);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span className="tabular-nums">{fps || "—"} FPS</span>;
}

export default function LabCard({ index, title, kind, blurb, children }: LabCardProps) {
  return (
    <article
      data-cursor="link"
      data-lens="true"
      className="group relative flex h-[260px] flex-col overflow-hidden rounded-md border border-white/8 bg-white/[0.015] backdrop-blur-[2px] transition-all duration-300 ease-[var(--ease-glide)] hover:border-cyan-glow/35 hover:bg-white/[0.025]"
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="z-10 flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-label text-[8px] uppercase tracking-[0.32em] text-white/30">
            {index}
          </span>
          <span className="font-label text-[9px] uppercase tracking-[0.28em] text-white/65">
            {title}
          </span>
        </div>
        <span
          className={`font-label text-[8px] uppercase tracking-[0.25em] ${
            kind === "shader" ? "text-cyan-glow/80" : "text-violet-soft/70"
          }`}
        >
          {kind === "shader" ? "GLSL" : "CANVAS_2D"}
        </span>
      </header>

      {/* ── Live canvas (lazy-mounted) ───────────────────────────── */}
      <LazyMount
        rootMargin="120px"
        className="relative flex-1 overflow-hidden"
        fallback={
          <div className="flex h-full items-center justify-center">
            <span className="font-label text-[8px] uppercase tracking-[0.3em] text-white/15">
              loading shader
            </span>
          </div>
        }
      >
        {children}
      </LazyMount>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="z-10 flex items-center justify-between gap-3 border-t border-white/5 px-3 py-1.5">
        <p className="font-label truncate text-[9px] tracking-wide text-white/40">
          {blurb}
        </p>
        <span className="font-label flex shrink-0 items-center gap-1 text-[8px] uppercase tracking-[0.2em] text-white/30">
          <span className="size-1 rounded-full bg-cyan-glow/70" />
          <FpsProbe />
        </span>
      </footer>
    </article>
  );
}
