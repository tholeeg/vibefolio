/**
 * Footer — closing terminal panel.
 *
 *  Layout: a tall section split into a kinetic wordmark, three
 *  monospaced columns (contact / tools / system), and a thin
 *  meta strip with copyright + Cmd+K hint.
 *
 *  No 3D — the silk shader is doing the visual heavy lifting
 *  here; we just frame it with type.
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotion } from "../lib/useMotion";
import { useWebGPU } from "../lib/useWebGPU";
import { useAudio } from "../lib/useAudio";
import { GSAP_EASES } from "../lib/easings";

gsap.registerPlugin(ScrollTrigger);

const CONTACT = [
  { label: "EMAIL", value: "thomas@indeed.com", href: "mailto:thomas@indeed.com" },
  { label: "LINKEDIN", value: "/in/thomas-le-guern", href: "https://linkedin.com" },
  { label: "GITHUB", value: "/tleguern", href: "https://github.com" },
];

const TOOLS = [
  "REACT 19",
  "THREE.JS",
  "GSAP",
  "GLSL",
  "TAILWIND v4",
  "TYPESCRIPT 5.7",
  "VITE 6",
];

export default function Footer() {
  const rootRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const { qualityTier, prefersReducedMotion } = useMotion();
  const runtime = useWebGPU();
  const audio = useAudio();

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".footer-row > *", {
        opacity: 0,
        y: 24,
        stagger: 0.06,
        ease: GSAP_EASES.glide,
        duration: 0.7,
        scrollTrigger: { trigger: rootRef.current, start: "top 85%" },
      });

      if (!prefersReducedMotion && wordmarkRef.current) {
        /* The wordmark slowly slims its weight as you scroll past it. */
        gsap.fromTo(
          ".footer-wordmark",
          { fontWeight: 900 },
          {
            fontWeight: 200,
            ease: "none",
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top 90%",
              end: "bottom bottom",
              scrub: 0.6,
            },
          },
        );
      }
    }, rootRef);
    return () => ctx.revert();
  }, [prefersReducedMotion]);

  const buildId = useRef(
    Math.random().toString(16).slice(2, 10).toUpperCase(),
  ).current;

  return (
    <footer
      ref={rootRef}
      className="relative w-full px-6 md:px-12 pt-32 pb-6"
    >
      {/* ── Wordmark ───────────────────────────────────────────── */}
      <div ref={wordmarkRef} className="mb-16 md:mb-24">
        <div
          data-lens="true"
          className="footer-wordmark font-headline leading-[0.85] tracking-tight"
          style={{
            fontSize: "var(--text-display-xl)",
            fontWeight: 900,
            fontVariationSettings: "'wght' 900",
            color: "var(--color-cyan-glow)",
            textShadow:
              "0 0 24px rgba(0, 251, 251, 0.20), 0 0 80px rgba(0, 251, 251, 0.10)",
          }}
        >
          VIBE/
          <br />
          FOLIO.
        </div>
      </div>

      {/* ── Columns ────────────────────────────────────────────── */}
      <div className="footer-row grid grid-cols-1 gap-10 border-t border-white/8 pt-8 md:grid-cols-3 md:gap-6 md:pt-10">
        {/* Contact ----------------------------------------------- */}
        <div>
          <h3 className="font-label mb-5 text-[10px] uppercase tracking-[0.3em] text-white/35">
            // CONTACT
          </h3>
          <ul className="space-y-3">
            {CONTACT.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  data-cursor="link"
                  className="group flex flex-col gap-0.5"
                >
                  <span className="font-label text-[9px] uppercase tracking-[0.25em] text-white/40">
                    {c.label}
                  </span>
                  <span className="font-headline text-lg tracking-tight text-white transition-colors duration-200 group-hover:text-cyan-glow">
                    {c.value}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Tools ------------------------------------------------- */}
        <div>
          <h3 className="font-label mb-5 text-[10px] uppercase tracking-[0.3em] text-white/35">
            // STACK
          </h3>
          <ul className="flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <li
                key={t}
                className="font-label rounded-full border border-white/10 bg-white/[0.025] px-3 py-1 text-[9px] uppercase tracking-[0.25em] text-white/65"
              >
                {t}
              </li>
            ))}
          </ul>
          <p className="font-body mt-5 text-sm leading-relaxed text-on-surface-variant">
            Built in 2026 with vibe coding — half spec, half feel,
            shipped on a Vercel deploy.
          </p>
        </div>

        {/* System ----------------------------------------------- */}
        <div>
          <h3 className="font-label mb-5 text-[10px] uppercase tracking-[0.3em] text-white/35">
            // SYSTEM
          </h3>
          <dl className="font-label grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.22em]">
            <dt className="text-white/35">build</dt>
            <dd className="text-white/70">{buildId}</dd>
            <dt className="text-white/35">gpu_tier</dt>
            <dd className="text-cyan-glow">{qualityTier.toUpperCase()}</dd>
            <dt className="text-white/35">motion</dt>
            <dd className="text-white/70">
              {prefersReducedMotion ? "REDUCED" : "FULL"}
            </dd>
            <dt className="text-white/35">runtime</dt>
            <dd
              className={
                runtime === "webgpu"
                  ? "text-magenta-hot"
                  : runtime === "webgl2"
                  ? "text-white/70"
                  : "text-white/35"
              }
            >
              {runtime === "checking" ? "DETECT…" : runtime.toUpperCase()}
            </dd>
            <dt className="text-white/35">audio</dt>
            <dd className={audio.isEnabled ? "text-cyan-glow" : "text-white/70"}>
              {audio.isEnabled ? "DRONE" : "MUTED"}
            </dd>
            <dt className="text-white/35">commit</dt>
            <dd className="text-white/70">main</dd>
          </dl>
          <button
            type="button"
            data-cursor="link"
            onClick={() => window.dispatchEvent(new CustomEvent("vibefolio:cmdk"))}
            className="font-label mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-white/75 transition-all duration-200 hover:border-cyan-glow/50 hover:text-cyan-glow"
          >
            OPEN COMMAND PALETTE
            <kbd className="rounded border border-white/15 px-1.5 py-0.5 text-[9px] tracking-[0.2em]">
              ⌘ K
            </kbd>
          </button>
        </div>
      </div>

      {/* ── Meta strip ─────────────────────────────────────────── */}
      <div className="font-label mt-16 flex flex-col items-start justify-between gap-2 border-t border-white/5 pt-5 text-[9px] uppercase tracking-[0.25em] text-white/30 md:flex-row md:items-center">
        <span>© 2026 THOMAS LE GUERN — VIBEFOLIO</span>
        <span className="text-white/40">
          PRESS{" "}
          <kbd className="rounded border border-white/15 px-1 py-0.5 text-white/60">
            ⌘ K
          </kbd>{" "}
          TO EXPLORE
        </span>
      </div>
    </footer>
  );
}
