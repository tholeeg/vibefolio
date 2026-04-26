import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CellShadedSphere from "./CellShadedSphere";
import { useMotion } from "../lib/useMotion";
import { GSAP_EASES } from "../lib/easings";

gsap.registerPlugin(ScrollTrigger);

const MODES = ["solid", "spiral", "kinetic"] as const;
type SphereMode = (typeof MODES)[number];

const MODE_LABELS: Record<SphereMode, string> = {
  solid: "SOLID",
  spiral: "DOTS",
  kinetic: "KINETIC",
};

const MODE_HINTS: Record<SphereMode, string> = {
  solid: "INSTANCED · 2K CUBES",
  spiral: "FIBONACCI · 7K POINTS",
  kinetic: "GYROSCOPE · 4 LAYERS",
};

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [sphereMode, setSphereMode] = useState<SphereMode>("solid");
  const { prefersReducedMotion } = useMotion();

  /* ── Mode-switcher pill: animate the highlight to the active button ─── */

  useEffect(() => {
    const wrap = buttonsRef.current;
    const pill = indicatorRef.current;
    if (!wrap || !pill) return;
    const active = wrap.querySelector<HTMLButtonElement>(`[data-mode="${sphereMode}"]`);
    if (!active) return;
    const wrapRect = wrap.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    gsap.to(pill, {
      x: r.left - wrapRect.left,
      width: r.width,
      duration: prefersReducedMotion ? 0 : 0.45,
      ease: GSAP_EASES.outExpo,
    });
  }, [sphereMode, prefersReducedMotion]);

  /* ── Keyboard shortcuts: 1 / 2 / 3 switch the mode ─────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") setSphereMode("solid");
      else if (e.key === "2") setSphereMode("spiral");
      else if (e.key === "3") setSphereMode("kinetic");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── Entrance + scroll-out timeline ─────────────────────────────────── */

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: GSAP_EASES.glide } });

      tl.from(".hero-line", {
        yPercent: 100,
        opacity: 0,
        stagger: 0.12,
        duration: 1.1,
      })
        /* Reveal the variable-font weight as the lines settle. */
        .fromTo(
          ".hero-line",
          { fontWeight: 100 },
          { fontWeight: 900, duration: 1.4, stagger: 0.08, ease: "power3.inOut" },
          "<+0.1",
        )
        .from(
          ".hero-description",
          { y: 30, opacity: 0, duration: 0.7, ease: GSAP_EASES.snap },
          "-=0.6",
        )
        .from(
          ".hero-mode-control",
          { y: 16, opacity: 0, duration: 0.55, ease: GSAP_EASES.snap },
          "-=0.4",
        )
        .from(".hero-status", { opacity: 0, duration: 0.8 }, "-=0.3")
        .from(".hero-scroll-hint", { opacity: 0, duration: 0.8 }, "<");

      /* Perpetual breathing of CREATIVE. (variable font weight + glow). */
      if (!prefersReducedMotion) {
        gsap.to(".hero-creative", {
          fontWeight: 700,
          duration: 2.2,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      }

      if (contentRef.current) {
        gsap.to(contentRef.current, {
          opacity: 0,
          scale: 0.92,
          y: -80,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: prefersReducedMotion ? false : true,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen overflow-hidden"
    >
      {/* ── Subtle CRT scanlines overlay (foreground) ───────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,251,251,0.02) 0px, rgba(0,251,251,0.02) 1px, transparent 1px, transparent 3px)",
          mixBlendMode: "overlay",
          zIndex: 1,
        }}
      />

      <div
        ref={contentRef}
        className="flex flex-col justify-between px-6 md:px-12 pt-20 md:pt-28 pb-4 md:pb-6 h-full w-full"
        style={{ willChange: "transform, opacity" }}
      >
        <CellShadedSphere mode={sphereMode} />

        <div className="relative z-10 max-w-7xl pointer-events-none">
          <h1
            ref={headlineRef}
            className="font-headline leading-[0.85] kerning-tight select-none"
            style={{
              fontSize: "var(--text-display-xl)",
              fontWeight: 900,
              fontVariationSettings: "'wght' 900",
            }}
          >
            <span className="hero-line block overflow-hidden">VIBE</span>
            <span className="hero-line block overflow-hidden">CODING</span>
            <span
              className="hero-line hero-creative block overflow-hidden"
              style={{
                color: "var(--color-cyan-glow)",
                textShadow:
                  "0 0 24px rgba(0, 251, 251, 0.35), 0 0 60px rgba(0, 251, 251, 0.18)",
              }}
            >
              CREATIVE.
            </span>
          </h1>
        </div>

        <div className="relative z-10 pointer-events-none flex-shrink-0">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-8">
            <div>
              <p className="hero-description font-body text-base md:text-xl max-w-xl text-on-surface-variant leading-relaxed">
                Vibe coding experimentations by Thomas Le Guern for Indeed
              </p>

              {/* ── Glass segmented control ──────────────────────── */}
              <div
                ref={buttonsRef}
                className="hero-mode-control relative mt-3 inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 pointer-events-auto backdrop-blur-md"
              >
                <span
                  ref={indicatorRef}
                  aria-hidden
                  className="absolute left-0 top-1 bottom-1 rounded-full"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(0,251,251,0.18), rgba(87,27,193,0.22))",
                    border: "1px solid rgba(0, 251, 251, 0.35)",
                    boxShadow: "0 0 24px rgba(0, 251, 251, 0.18)",
                    width: 0,
                    transform: "translateX(0px)",
                  }}
                />
                {MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-mode={m}
                    data-cursor="link"
                    onClick={() => setSphereMode(m)}
                    className={`relative z-[1] font-label text-[10px] px-4 py-1.5 uppercase tracking-[0.2em] rounded-full transition-colors duration-300 ${
                      sphereMode === m ? "text-cyan-glow" : "text-white/45 hover:text-white/80"
                    }`}
                  >
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>

              {/* ── System status line (terminal voice) ────────────── */}
              <div className="hero-status mt-3 flex items-center gap-2 font-label text-[9px] uppercase tracking-[0.25em] text-white/35">
                <span
                  className="inline-block size-1.5 rounded-full bg-cyan-glow"
                  style={{
                    boxShadow: "0 0 8px var(--color-cyan-glow)",
                    animation: prefersReducedMotion
                      ? "none"
                      : "pulse 1.4s ease-in-out infinite",
                  }}
                />
                <span>{MODE_HINTS[sphereMode]}</span>
                <span className="opacity-40">·</span>
                <span className="opacity-50">[1] [2] [3] to switch</span>
              </div>
            </div>

            <div className="flex-grow" />
            <div className="hero-scroll-hint flex items-center gap-3 font-label text-[10px] tracking-[0.3em] uppercase opacity-50 whitespace-nowrap mb-8">
              <span
                className="inline-block w-6 h-px bg-white/40"
                style={{
                  animation: prefersReducedMotion
                    ? "none"
                    : "scroll-line 2.4s ease-in-out infinite",
                }}
              />
              SCROLL_TO_EXPLORE
            </div>
          </div>
        </div>
      </div>

      {/* Local keyframes — kept inline so they stay scoped to the Hero. */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.7); }
        }
        @keyframes scroll-line {
          0% { transform: scaleX(0.2); transform-origin: left; }
          50% { transform: scaleX(1); transform-origin: left; }
          51% { transform-origin: right; }
          100% { transform: scaleX(0); transform-origin: right; }
        }
      `}</style>
    </section>
  );
}
