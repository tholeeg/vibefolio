import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { lenisStore } from "../lenisStore";

const NAV_LINKS = [
  { label: "PROJETS", target: "#projets" },
  { label: "METHODOLOGY", target: "#methodology" },
];

const SCROLL_EASING = (t: number) =>
  Math.min(1, 1.001 - Math.pow(2, -10 * t));

const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#________";

/* ──────────────────────────────────────────────────────────────────────── */
/*  MagneticLink — magnetic pull + text scramble on hover                  */
/* ──────────────────────────────────────────────────────────────────────── */

function MagneticLink({
  label,
  target,
  onNav,
}: {
  label: string;
  target: string;
  onNav: (e: React.MouseEvent<HTMLAnchorElement>, t: string) => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const scrambleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopScramble = () => {
    if (scrambleTimer.current) {
      clearInterval(scrambleTimer.current);
      scrambleTimer.current = null;
    }
    if (ref.current) ref.current.textContent = label;
  };

  const handleEnter = () => {
    stopScramble();
    const el = ref.current;
    if (!el) return;

    let iter = 0;
    scrambleTimer.current = setInterval(() => {
      el.textContent = label
        .split("")
        .map((_, i) =>
          i < iter
            ? label[i]
            : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        )
        .join("");

      iter += 1 / 3;
      if (iter >= label.length) {
        stopScramble();
      }
    }, 30);
  };

  const handleLeave = () => {
    stopScramble();
    gsap.to(ref.current, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: "elastic.out(1, 0.5)",
    });
  };

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    gsap.to(el, {
      x: dx * 0.35,
      y: dy * 0.35,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  useEffect(() => {
    return () => stopScramble();
  }, []);

  return (
    <a
      ref={ref}
      href={target}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
      onClick={(e) => onNav(e, target)}
      className="font-['Inter'] uppercase tracking-widest font-extrabold text-[10px] text-white/60 hover:text-white transition-colors inline-block"
    >
      {label}
    </a>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  NavBar                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

export default function NavBar() {
  const handleNav = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
      e.preventDefault();
      lenisStore.instance?.scrollTo(target, {
        duration: 1.5,
        easing: SCROLL_EASING,
      });
    },
    []
  );

  return (
    <nav
      className="fixed inset-x-0 top-0 z-[9999] flex h-16 max-h-16 w-full max-w-full items-center justify-between bg-black/50 px-6 py-3 backdrop-blur-xl md:px-10"
    >
      <div className="text-xl font-black tracking-tighter text-white hover:text-[#00FFFF] transition-colors">
        Thomas Le Guern
      </div>
      <div className="hidden md:flex gap-12 items-center">
        {NAV_LINKS.map((link) => (
          <MagneticLink
            key={link.target}
            label={link.label}
            target={link.target}
            onNav={handleNav}
          />
        ))}
        <button
          type="button"
          aria-label="Open command palette"
          data-cursor="link"
          onClick={() => window.dispatchEvent(new CustomEvent("vibefolio:cmdk"))}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[#00FFFF] transition-all duration-300 hover:border-cyan-glow/40 hover:bg-white/[0.05]"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <kbd className="font-label hidden text-[9px] uppercase tracking-[0.25em] text-white/55 md:inline">
            ⌘K
          </kbd>
        </button>
      </div>
    </nav>
  );
}
