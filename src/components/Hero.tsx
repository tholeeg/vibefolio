import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CellShadedSphere from "./CellShadedSphere";

gsap.registerPlugin(ScrollTrigger);

const MODES = ["solid", "spiral", "kinetic"] as const;
type SphereMode = (typeof MODES)[number];

const MODE_LABELS: Record<SphereMode, string> = {
  solid: "SOLID",
  spiral: "DOTS",
  kinetic: "KINETIC",
};

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sphereMode, setSphereMode] = useState<SphereMode>("solid");

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.from(".hero-line", {
        yPercent: 100,
        opacity: 0,
        stagger: 0.2,
        duration: 1.2,
      })
        .from(
          ".hero-description",
          { y: 40, opacity: 0, duration: 0.8, ease: "power3.out" },
          "-=0.4",
        )
        .from(
          ".hero-mode-buttons",
          { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" },
          "-=0.3",
        )
        .from(".hero-scroll-hint", { opacity: 0, duration: 1 }, "-=0.2");

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
            scrub: true,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="h-screen overflow-hidden relative"
    >
      <div
        ref={contentRef}
        className="flex flex-col justify-between px-6 md:px-12 pt-20 md:pt-28 pb-4 md:pb-6 h-full w-full"
        style={{ willChange: "transform, opacity" }}
      >
      <CellShadedSphere mode={sphereMode} />

      <div className="relative z-10 max-w-7xl pointer-events-none">
        <h1
          className="font-headline font-black leading-[0.85] kerning-tight select-none"
          style={{ fontSize: "clamp(3.5rem, 12vw, 15rem)" }}
        >
          <span className="hero-line block overflow-hidden">VIBE</span>
          <span className="hero-line block overflow-hidden">CODING</span>
          <span className="hero-line block overflow-hidden text-primary-fixed">CREATIVE.</span>
        </h1>
      </div>

      <div className="relative z-10 pointer-events-none flex-shrink-0">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-8">
          <div>
            <p className="hero-description font-body text-base md:text-xl max-w-xl text-on-surface-variant leading-relaxed">
              Vibe coding experimentations by Thomas Le Guern for Indeed
            </p>

            <div className="hero-mode-buttons flex gap-2 mt-1.5 pointer-events-auto">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setSphereMode(m)}
                  className={`font-label text-[9px] px-3 py-1 uppercase tracking-widest rounded-full border transition-all duration-300 ${
                    sphereMode === m
                      ? "border-primary-fixed text-primary-fixed bg-primary-fixed/10"
                      : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/70"
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-grow" />
          <div className="hero-scroll-hint font-label text-[10px] tracking-[0.3em] uppercase opacity-40 rotate-90 origin-right whitespace-nowrap mb-8">
            SCROLL_TO_EXPLORE_INTENT
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
