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

function HeroWord({ text, className }: { text: string; className?: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const charsRef = useRef<(HTMLSpanElement | null)[]>([]);

  const handleEnter = () => {};

  const handleLeave = () => {
    gsap.to(wrapRef.current, {
      x: 0,
      y: 0,
      duration: 0.6,
      ease: "elastic.out(1, 0.4)",
    });
  };

  const handleMove = (e: React.MouseEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    gsap.to(el, {
      x: dx * 0.12,
      y: dy * 0.25,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleClick = () => {
    charsRef.current.forEach((el, i) => {
      if (!el) return;
      const rx = (Math.random() - 0.5) * 60;
      const ry = (Math.random() - 0.5) * 40;
      const rot = (Math.random() - 0.5) * 30;
      gsap
        .timeline()
        .to(el, {
          x: rx,
          y: ry,
          rotation: rot,
          opacity: 0.3,
          duration: 0.25,
          ease: "power3.out",
          delay: i * 0.02,
        })
        .to(el, {
          x: 0,
          y: 0,
          rotation: 0,
          opacity: 1,
          duration: 0.5,
          ease: "elastic.out(1, 0.35)",
        });
    });
  };

  return (
    <span
      ref={wrapRef}
      className={`hero-line block cursor-pointer select-none ${className ?? ""}`}
      style={{ display: "inline-block", willChange: "transform" }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
      onClick={handleClick}
    >
      {text.split("").map((ch, i) => (
        <span
          key={i}
          ref={(el) => { charsRef.current[i] = el; }}
          style={{ display: "inline-block", willChange: "transform" }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

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
      className="h-screen overflow-hidden relative bg-black"
    >
      <div
        ref={contentRef}
        className="flex flex-col justify-between px-6 md:px-12 pt-20 md:pt-28 pb-4 md:pb-6 h-full w-full"
        style={{ willChange: "transform, opacity" }}
      >
      <CellShadedSphere mode={sphereMode} />

      <div className="relative z-10 max-w-7xl">
        <h1
          className="font-headline font-black leading-[0.85] kerning-tight"
          style={{ fontSize: "clamp(3.5rem, 12vw, 15rem)" }}
        >
          <span className="block overflow-hidden">
            <HeroWord text="VIBE" />
          </span>
          <span className="block overflow-hidden">
            <HeroWord text="CODING" />
          </span>
          <span className="block overflow-hidden">
            <HeroWord text="CREATIVE." className="text-primary-fixed" />
          </span>
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
