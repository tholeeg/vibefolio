/**
 * CommandPalette — Cmd+K / Ctrl+K overlay.
 *
 * Vanilla implementation (no `cmdk` dependency) to keep the
 * bundle lean. Filters a static action list by keywords with
 * a tiny fuzzy-ish substring match, supports arrow-key
 * navigation, Enter to run, Esc to close.
 *
 * Other surfaces can open the palette by dispatching:
 *     window.dispatchEvent(new CustomEvent("vibefolio:cmdk"));
 */

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { GSAP_EASES } from "../lib/easings";
import { setQualityTier, type QualityTier } from "../lib/useMotion";
import { disableAudio, enableAudio, playSfx } from "../lib/useAudio";

interface Action {
  id: string;
  label: string;
  hint: string;
  group: "navigate" | "system" | "external" | "demo";
  keywords: string[];
  glyph: string;
  run: () => void;
}

function scrollTo(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildActions(): Action[] {
  return [
    {
      id: "nav-top",
      label: "Jump to top",
      hint: "Hero",
      group: "navigate",
      keywords: ["top", "hero", "home", "start"],
      glyph: "↑",
      run: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    },
    {
      id: "nav-projects",
      label: "Projects",
      hint: "Outputs grid",
      group: "navigate",
      keywords: ["projects", "outputs", "work", "case"],
      glyph: "▦",
      run: () => scrollTo("[data-section='projects']"),
    },
    {
      id: "nav-method",
      label: "Methodology",
      hint: "Process pillars",
      group: "navigate",
      keywords: ["method", "process", "pillars"],
      glyph: "◇",
      run: () => scrollTo("[data-section='methodology']"),
    },
    {
      id: "nav-contact",
      label: "Contact",
      hint: "Footer",
      group: "navigate",
      keywords: ["contact", "footer", "email", "social"],
      glyph: "✉",
      run: () => scrollTo("[data-section='footer']"),
    },
    {
      id: "system-quality-low",
      label: "Force quality: LOW",
      hint: "CSS gradient background",
      group: "system",
      keywords: ["quality", "low", "perf", "performance"],
      glyph: "▁",
      run: () => setQualityTier("low"),
    },
    {
      id: "system-quality-medium",
      label: "Force quality: MEDIUM",
      hint: "Reduced shader octaves",
      group: "system",
      keywords: ["quality", "medium", "perf"],
      glyph: "▃",
      run: () => setQualityTier("medium"),
    },
    {
      id: "system-quality-high",
      label: "Force quality: HIGH",
      hint: "All effects on",
      group: "system",
      keywords: ["quality", "high", "perf", "max"],
      glyph: "▇",
      run: () => setQualityTier("high"),
    },
    {
      id: "demo-mode-1",
      label: "Hero · Solid sphere",
      hint: "Mode 1",
      group: "demo",
      keywords: ["sphere", "mode", "solid", "instanced", "1"],
      glyph: "1",
      run: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" })),
    },
    {
      id: "demo-mode-2",
      label: "Hero · Spiral dots",
      hint: "Mode 2",
      group: "demo",
      keywords: ["sphere", "mode", "spiral", "fibonacci", "2"],
      glyph: "2",
      run: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" })),
    },
    {
      id: "demo-mode-3",
      label: "Hero · Kinetic gyroscope",
      hint: "Mode 3",
      group: "demo",
      keywords: ["sphere", "mode", "kinetic", "gyro", "3"],
      glyph: "3",
      run: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "3" })),
    },
    {
      id: "audio-on",
      label: "Enable ambient soundscape",
      hint: "Web Audio drone",
      group: "system",
      keywords: ["audio", "sound", "music", "drone", "ambient", "on", "enable"],
      glyph: "♪",
      run: () => void enableAudio(),
    },
    {
      id: "audio-off",
      label: "Disable ambient soundscape",
      hint: "Mute everything",
      group: "system",
      keywords: ["audio", "sound", "mute", "off", "disable"],
      glyph: "□",
      run: () => disableAudio(),
    },
    {
      id: "external-email",
      label: "Email Thomas",
      hint: "thomas@indeed.com",
      group: "external",
      keywords: ["email", "mail", "contact"],
      glyph: "@",
      run: () => (window.location.href = "mailto:thomas@indeed.com"),
    },
    {
      id: "external-github",
      label: "Source on GitHub",
      hint: "tleguern/vibefolio",
      group: "external",
      keywords: ["github", "source", "code", "repo"],
      glyph: "↗",
      run: () => window.open("https://github.com", "_blank"),
    },
  ];
}

const GROUP_LABELS: Record<Action["group"], string> = {
  navigate: "// NAVIGATE",
  system: "// SYSTEM",
  demo: "// DEMOS",
  external: "// EXTERNAL",
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const actions = useMemo(buildActions, []);

  /* ── Filter ──────────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.hint.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.includes(q)),
    );
  }, [query, actions]);

  /* Reset selection when filter changes. */
  useEffect(() => {
    setActive(0);
  }, [query]);

  /* ── Open / close handlers ──────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onCustom = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("vibefolio:cmdk", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("vibefolio:cmdk", onCustom);
    };
  }, []);

  /* ── Open animation + focus ─────────────────────────────────── */

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
    playSfx("blip");
    if (overlayRef.current && panelRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.18, ease: GSAP_EASES.glide },
      );
      gsap.fromTo(
        panelRef.current,
        { y: -8, scale: 0.97, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.32, ease: GSAP_EASES.outExpo },
      );
    }
  }, [open]);

  /* ── In-palette key handling ────────────────────────────────── */

  const onPaletteKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[active];
      if (target) {
        setOpen(false);
        playSfx("click");
        target.run();
      }
    }
  };

  if (!open) return null;

  /* Group filtered actions for rendering. */
  const grouped: Record<Action["group"], Action[]> = {
    navigate: [],
    system: [],
    demo: [],
    external: [],
  };
  filtered.forEach((a) => grouped[a.group].push(a));

  let runningIndex = 0;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === overlayRef.current) setOpen(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)" as unknown as number,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <div
        ref={panelRef}
        onKeyDown={onPaletteKey}
        className="w-[min(92vw,640px)] overflow-hidden rounded-xl border border-cyan-glow/30 bg-black/70 shadow-2xl"
        style={{ boxShadow: "0 30px 80px rgba(0, 251, 251, 0.10)" }}
      >
        {/* Header / input ------------------------------------- */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span
            className="font-label text-[10px] uppercase tracking-[0.3em] text-cyan-glow"
            aria-hidden
          >
            ⌘ K
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, sections, settings…"
            className="font-body flex-1 bg-transparent text-base text-white placeholder:text-white/35 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-label text-[9px] uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-white"
          >
            ESC
          </button>
        </div>

        {/* List ----------------------------------------------- */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center font-label text-[10px] uppercase tracking-[0.3em] text-white/30">
              No matching command
            </div>
          )}

          {(Object.keys(grouped) as Action["group"][]).map((g) => {
            const items = grouped[g];
            if (items.length === 0) return null;
            return (
              <div key={g} className="mb-1">
                <div className="px-4 py-1.5 font-label text-[8px] uppercase tracking-[0.32em] text-white/30">
                  {GROUP_LABELS[g]}
                </div>
                {items.map((a) => {
                  const i = runningIndex++;
                  const isActive = i === active;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => {
                        setOpen(false);
                        playSfx("click");
                        a.run();
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive
                          ? "bg-cyan-glow/8 text-white"
                          : "text-white/70 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs ${
                          isActive
                            ? "border-cyan-glow/50 bg-black text-cyan-glow"
                            : "border-white/10 bg-white/[0.02] text-white/55"
                        }`}
                      >
                        {a.glyph}
                      </span>
                      <span className="font-body flex-1 text-sm">{a.label}</span>
                      <span className="font-label text-[9px] uppercase tracking-[0.25em] text-white/30">
                        {a.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer ---------------------------------------------- */}
        <div className="flex items-center justify-between border-t border-white/8 px-4 py-2 font-label text-[9px] uppercase tracking-[0.25em] text-white/35">
          <span>{filtered.length} commands</span>
          <span className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ run</span>
            <span>esc close</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export type { QualityTier };
