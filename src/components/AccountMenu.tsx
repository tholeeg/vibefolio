import { useEffect, useId, useRef, useState } from "react";

const PORTAL = "https://apps.thomasleguern.com";

const LINKS = [
  { label: "Apps", href: `${PORTAL}/` },
  { label: "Compte", href: `${PORTAL}/account` },
  { label: "Préférences", href: `${PORTAL}/account?section=preferences` },
  { label: "Sécurité", href: `${PORTAL}/account?section=security` },
];

/* ──────────────────────────────────────────────────────────────────────── */
/*  AccountMenu — round trigger opening the personal portal links.         */
/*  Static site: no session is readable here, so no identity is shown.     */
/* ──────────────────────────────────────────────────────────────────────── */

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Menu compte"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-cursor="link"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-[#00FFFF] transition-all duration-300 hover:border-cyan-glow/40 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-glow/60"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Portail apps.thomasleguern.com"
          className="absolute right-0 top-full mt-3 w-52 overflow-hidden rounded-lg border border-white/10 bg-black/80 py-1.5 shadow-[0_0_40px_rgba(0,251,251,0.08)] backdrop-blur-xl"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              role="menuitem"
              href={link.href}
              target="_blank"
              rel="noreferrer"
              data-cursor="link"
              onClick={() => setOpen(false)}
              className="font-label flex items-center justify-between px-4 py-2.5 text-[10px] uppercase tracking-[0.25em] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-[#00FFFF] focus-visible:bg-white/[0.04] focus-visible:text-[#00FFFF] focus-visible:outline-none"
            >
              {link.label}
              <span aria-hidden className="text-white/30">↗</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
