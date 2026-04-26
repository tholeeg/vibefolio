/**
 * Lab — grid of real-time experiments.
 *
 * Each card frames a self-contained shader / canvas demo. Cards
 * are lazy-mounted (LazyMount inside LabCard) so they only spin
 * up their WebGL context or rAF loop when scrolled into view.
 *
 * On hover, the cyan grid lines on the background brighten and
 * the global Cursor enlarges (cards expose data-cursor="link").
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotion } from "../lib/useMotion";
import { GSAP_EASES } from "../lib/easings";
import LabCard from "./lab/LabCard";
import AuroraCard from "./lab/AuroraCard";
import VoronoiCard from "./lab/VoronoiCard";
import CurlNoiseCard from "./lab/CurlNoiseCard";
import TenPrintCard from "./lab/TenPrintCard";
import AsciiDonutCard from "./lab/AsciiDonutCard";
import MetaballsCard from "./lab/MetaballsCard";

gsap.registerPlugin(ScrollTrigger);

const EXPERIMENTS = [
  {
    index: "01",
    title: "AURORA",
    kind: "shader" as const,
    blurb: "Domain-warped FBM driving a multi-stop gradient.",
    Component: AuroraCard,
  },
  {
    index: "02",
    title: "VORONOI",
    kind: "shader" as const,
    blurb: "Cellular noise with phase-pulsing seeds.",
    Component: VoronoiCard,
  },
  {
    index: "03",
    title: "CURL NOISE",
    kind: "canvas2d" as const,
    blurb: "600 particles drifting along a divergence-free field.",
    Component: CurlNoiseCard,
  },
  {
    index: "04",
    title: "10 PRINT",
    kind: "canvas2d" as const,
    blurb: "Commodore 64 maze, hover to flip.",
    Component: TenPrintCard,
  },
  {
    index: "05",
    title: "ASCII DONUT",
    kind: "canvas2d" as const,
    blurb: "Andy Sloane's torus, retraced in monospace.",
    Component: AsciiDonutCard,
  },
  {
    index: "06",
    title: "METABALLS",
    kind: "shader" as const,
    blurb: "Five orbiting energy fields, hover to merge.",
    Component: MetaballsCard,
  },
];

export default function Lab() {
  const sectionRef = useRef<HTMLElement>(null);
  const { prefersReducedMotion } = useMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.from(".lab-card", {
        opacity: 0,
        y: 32,
        stagger: 0.06,
        duration: 0.7,
        ease: GSAP_EASES.glide,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <section ref={sectionRef} className="relative w-full px-6 md:px-12 py-20 md:py-28">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mb-10 flex flex-col gap-2 md:mb-14">
        <span className="font-label text-[10px] uppercase tracking-[0.32em] text-cyan-glow/85">
          // 03 — LAB
        </span>
        <h2
          className="font-headline leading-[0.9]"
          style={{
            fontSize: "var(--text-display-l)",
            fontWeight: 800,
            fontVariationSettings: "'wght' 800",
          }}
        >
          REAL-TIME
          <br />
          <span style={{ color: "var(--color-cyan-glow)" }}>EXPERIMENTS.</span>
        </h2>
        <p className="font-body mt-3 max-w-xl text-sm text-on-surface-variant md:text-base">
          Six self-contained vignettes — shaders, canvas physics, ASCII rendering.
          Each one is a live program; hover to interact.
        </p>
      </header>

      {/* ── Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {EXPERIMENTS.map(({ Component, ...meta }) => (
          <div key={meta.index} className="lab-card">
            <LabCard {...meta}>
              <Component />
            </LabCard>
          </div>
        ))}
      </div>
    </section>
  );
}
